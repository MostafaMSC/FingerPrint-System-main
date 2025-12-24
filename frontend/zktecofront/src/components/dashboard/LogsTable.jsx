import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { exportToExcel, tableHeaders } from '../../utils/excelExport';
import { devices } from '../../context/DeviceContext';
import './Dashboard.css';

const LogsTable = ({ deviceIp }) => {
    // --- Shared State ---
    const [activeTab, setActiveTab] = useState('logs');
    const [lateTime, setLateTime] = useState('08:30');

    // --- Logs Tab State ---
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalFilteredRecords, setTotalFilteredRecords] = useState(0);
    const [exportDeviceFilter, setExportDeviceFilter] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [showfilterpopup, setShowFilterPopup] = useState(false);
    // --- Weekly Late Tab State ---
    const [weeklyLate, setWeeklyLate] = useState([]);
    const [weekInfo, setWeekInfo] = useState({ weekStart: '', weekEnd: '' });
    const [loadingWeekly, setLoadingWeekly] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);

    // --- Settings & Initialization ---
    useEffect(() => {
        const loadSettings = () => {
            const savedSettings = localStorage.getItem('workSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setLateTime(parsed.workDayStart || '08:30');
            }
        };

        loadSettings();
        const handleSettingsUpdate = () => loadSettings();
        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    }, []);

    // --- Logs Tab Functions ---
    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const params = new URLSearchParams({
                page: page,
                pageSize: pageSize,
                deviceIp: deviceIp || '',
                search: searchTerm || '',
                dateFrom: dateFrom || '',
                dateTo: dateTo || ''
            });

            const res = await axios.get(`/api/ZKPython/get-attendance-report?${params}`);
            if (res.data.success) {
                setLogs(res.data.data);
                setTotalPages(res.data.totalPages);
                setTotalRecords(res.data.total);
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        // First apply the search filter (case-insensitive)
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            (log.Name && log.Name.toLowerCase().includes(searchLower)) ||
            (log.UserID && log.UserID.toLowerCase().includes(searchLower));

        // If search doesn't match, exclude this log
        if (!matchesSearch) return false;

        // Then apply the filter type
        switch (filterType) {
            case 'fingerprint':
                // لديه بصمة فقط: لا دخول ولا خروج
                return !log.CheckIn && !log.CheckOut;
            case 'checkin':
                return log.CheckIn && !log.CheckOut;
            case 'checkout':
                return !log.CheckIn && log.CheckOut;
            case 'both':
                return log.CheckIn && log.CheckOut;
            default:
                return true; // 'all'
        }
    });

    // Effect 1: When search/filter changes, reset to page 1
    useEffect(() => {
        setPage(1);
    }, [searchTerm, dateFrom, dateTo, deviceIp]);

    // Effect 2: When page or filters change, fetch logs
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 300);

        return () => clearTimeout(timer);
    }, [page, searchTerm, dateFrom, dateTo, deviceIp]);

    const getDeviceName = (ip) => {
        const device = devices.find(d => d.ip === ip);
        return device ? device.name : ip;
    };

    const calculateLateMinutes = (checkInTime) => {
        if (!checkInTime || checkInTime === '-') return 0;
        try {
            const [checkInH, checkInM] = checkInTime.split(':').map(Number);
            const [lateH, lateM] = lateTime.split(':').map(Number);

            const checkInMinutes = checkInH * 60 + checkInM;
            const lateMinutes = lateH * 60 + lateM;

            return Math.max(0, checkInMinutes - lateMinutes);
        } catch (e) {
            return 0;
        }
    };

    const handleExportFiltered = async () => {
        try {
            // Fetch all filtered logs from the backend (without pagination)
            const params = new URLSearchParams({
                deviceIp: deviceIp || '',
                search: searchTerm || '',
                dateFrom: dateFrom || '',
                dateTo: dateTo || ''
            });

            const res = await axios.get(`/api/ZKPython/export-attendance-filtered?${params}`);
            
            if (!res.data.success || !res.data.data || res.data.data.length === 0) {
                alert('لا توجد بيانات للتصدير');
                return;
            }

            // Update total filtered records
            setTotalFilteredRecords(res.data.data.length);

            // Map filtered logs to export format with proper headers
            const exportData = res.data.data.map((log, index) => {
                const lateMins = calculateLateMinutes(log.CheckIn);
                return {
                    '#': index + 1,
                    'UserID': log.UserID || '-',
                    'Name': log.Name || '-',
                    'Date': log.Date || '-',
                    'CheckIn': log.CheckIn || '-',
                    'CheckOut': log.CheckOut || '-',
                    'LateMinutes': lateMins > 0 ? formatMinutes(lateMins) : '-'
                };
            });

            // Create headers array for the export function
            const headers = [
                { key: '#', title: '#' },
                { key: 'UserID', title: 'معرف المستخدم' },
                { key: 'Name', title: 'الاسم' },
                { key: 'Date', title: 'التاريخ' },
                { key: 'CheckIn', title: 'الدخول' },
                { key: 'CheckOut', title: 'الخروج' },
                { key: 'LateMinutes', title: 'التأخير' }
            ];

            // Create filename with filter info
            let filterInfo = '';
            if (searchTerm) filterInfo += `_بحث_${searchTerm}`;
            if (dateFrom) filterInfo += `_من_${dateFrom}`;
            if (dateTo) filterInfo += `_إلى_${dateTo}`;
            if (filterType !== 'all') {
                const filterNames = {
                    'fingerprint': 'لم_يبصم',
                    'checkin': 'دخول_فقط',
                    'checkout': 'خروج_فقط',
                    'both': 'دخول_وخروج'
                };
                filterInfo += `_${filterNames[filterType]}`;
            }

            exportToExcel(
                exportData,
                headers,
                `سجلات_الحضور_المفلترة${filterInfo}`,
                'سجلات الحضور المفلترة'
            );
        } catch (error) {
            console.error("Export failed", error);
            alert('فشل التصدير. حاول مرة أخرى.');
        }
    };

    const handleExportAll = async () => {
        try {
            // Use the export endpoint which returns all raw logs
            const params = new URLSearchParams();

            // If exportDeviceFilter is null, export all devices; otherwise export specific device
            if (exportDeviceFilter) {
                params.append('deviceIp', exportDeviceFilter);
            }

            const res = await axios.get(`/api/ZKPython/export?${params}`);
            if (res.data.success) {
                // Map raw logs to export format with proper headers
                const exportData = res.data.data.map((log, index) => ({
                    '#': index + 1,
                    'UserID': log.UserID || '-',
                    'Name': log.Name || '-',
                    'Time': log.Time ? new Date(log.Time).toLocaleString('ar-EG') : '-',
                    'DeviceIP': getDeviceName(log.DeviceIP) || '-',
                    'Card': log.Card || '-',
                    'Role': log.Role || '-',
                    'CheckStatus': log.CheckStatus || '-'
                }));

                // Create headers array for the export function
                const headers = [
                    { key: '#', title: '#' },
                    { key: 'UserID', title: 'معرف الموظف' },
                    { key: 'Name', title: 'الاسم' },
                    { key: 'Time', title: 'التاريخ والوقت' },
                    { key: 'DeviceIP', title: 'الجهاز' },
                    { key: 'Card', title: 'البطاقة' },
                    { key: 'Role', title: 'الدور' },
                    { key: 'CheckStatus', title: 'حالة الدخول' }
                ];

                exportToExcel(
                    exportData,
                    headers,
                    `سجلات_الحضور_الكاملة_${exportDeviceFilter ? exportDeviceFilter : 'كل_الأجهزة'}`,
                    'سجلات الحضور الكاملة'
                );
            }
        } catch (error) {
            console.error("Export failed", error);
            alert('فشل التصدير. حاول مرة أخرى.');
        }
    };

    // --- Weekly Late Tab Functions ---
    const fetchWeeklyLate = async () => {
        setLoadingWeekly(true);
        try {
            const res = await axios.get(`/api/ZKPython/get-weekly-late?time=${lateTime}&deviceIp=${deviceIp}`);
            const result = res.data.result || [];

            const normalizedResult = result.map(user => ({
                userID: user.userID || user.UserID,
                name: user.name || user.Name,
                lateDaysCount: user.lateDaysCount || user.LateDaysCount || 0,
                totalLateMinutes: user.totalLateMinutes || user.TotalLateMinutes || 0,
                totalLateHours: user.totalLateHours || user.TotalLateHours || 0,
                dailyDetails: (user.dailyDetails || user.DailyDetails || []).map(day => ({
                    date: day.date || day.Date || '',
                    dayName: day.dayName || day.DayName || '',
                    entryTime: day.entryTime || day.EntryTime || '',
                    lateMinutes: day.lateMinutes || day.LateMinutes || 0
                }))
            }));

            setWeeklyLate(normalizedResult);
            setWeekInfo({
                weekStart: res.data.weekStart,
                weekEnd: res.data.weekEnd
            });
        } catch (error) {
            console.error("Failed to fetch weekly late", error);
        } finally {
            setLoadingWeekly(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'weekly') {
            fetchWeeklyLate();
        }
    }, [activeTab, deviceIp, lateTime]);

    const handleExportWeekly = () => {
        if (!weeklyLate || weeklyLate.length === 0) return;
        const exportData = [];
        weeklyLate.forEach(user => {
            const details = user.dailyDetails;
            if (Array.isArray(details) && details.length > 0) {
                details.forEach(day => {
                    exportData.push({
                        UserID: user.userID || '',
                        Name: user.name || '',
                        Date: (day.date || '').split('T')[0],
                        DayName: day.dayName || '',
                        EntryTime: day.entryTime || '',
                        LateMinutes: day.lateMinutes || 0
                    });
                });
            }
        });
        const headers = [
            { key: 'UserID', title: 'معرف المستخدم' },
            { key: 'Name', title: 'الاسم' },
            { key: 'Date', title: 'التاريخ' },
            { key: 'DayName', title: 'اليوم' },
            { key: 'EntryTime', title: 'وقت الحضور' },
            { key: 'LateMinutes', title: 'دقائق التأخير' }
        ];
        exportToExcel(exportData, headers, 'متأخرين_الأسبوع', 'متأخرين الأسبوع');
    };

    const formatMinutes = (minutes) => {
        if (!minutes || isNaN(minutes)) return '0 دقيقة';
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}`;
        return `${mins} دقيقة`;
    };

    const toggleExpand = (userId) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    // --- Render ---
    return (
        <div className="table-container">
            {/* Tabs */}
            <div className="tab-navigation" style={{
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between', // التبويبين على اليسار والفلتر على اليمين
                padding: '10px 2rem', // padding أوسع على الجانبين بدل 70px
                flexWrap: 'wrap', // يدعم الشاشات الصغيرة
                gap: '1rem'
            }}>
                {/* تبويبات Logs و Weekly */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('logs')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            backgroundColor: activeTab === 'logs' ? '#00b3a8' : '#e0e0e0',
                            color: activeTab === 'logs' ? 'white' : '#333',
                            transition: 'all 0.2s'
                        }}
                    >
                        📋 سجلات الحضور
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
                        onClick={() => setActiveTab('weekly')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            backgroundColor: activeTab === 'weekly' ? '#00b3a8' : '#e0e0e0',
                            color: activeTab === 'weekly' ? 'white' : '#333',
                            transition: 'all 0.2s'
                        }}
                    >
                        📊 ملخص التأخير الأسبوعي
                    </button>
                </div>

                {/* زر الفلتر */}
                <div style={{ position: 'relative' }}>
                    <span
                        style={{ cursor: "pointer", display: "inline-block", padding: "0 5.5rem" }}
                        onClick={() => setShowFilterPopup(prev => !prev)}
                    >
                        <i className="fa-solid fa-sliders" style={{ fontSize: 25 }}></i>
                    </span>

                    {showfilterpopup && (
                        <div style={{
                            position: "absolute",
                            top: "35px",
                            right: 0,
                            background: "white",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            padding: "0.5rem",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            zIndex: 10,
                            minWidth: "200px",
                            fontSize: "0.9rem"
                        }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                {[
                                    { key: 'all', label: 'الكل' },
                                    { key: 'fingerprint', label: 'لم يبصم' },
                                    { key: 'checkin', label: 'بصمة دخول فقط' },
                                    { key: 'checkout', label: 'بصمة خروج فقط' },
                                    { key: 'both', label: 'بصمة دخول وخروج' }
                                ].map(filter => (
                                    <button
                                        key={filter.key}
                                        onClick={() => { setFilterType(filter.key); setShowFilterPopup(false); }}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "0.4rem 0.6rem",
                                            border: "none",
                                            background: filterType === filter.key ? "#00b3a8" : "white",
                                            color: filterType === filter.key ? "white" : "#333",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            textAlign: "right"
                                        }}
                                    >
                                        <span>{filter.label}</span>
                                        {filterType === filter.key && <i className="fa-solid fa-check" style={{ marginLeft: "0.5rem" }}></i>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Logs Tab Content */}
            {activeTab === 'logs' && (
                <>
                    <div className="table-header">
                        <h3 className="table-title">سجلات الحضور</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="search-container" style={{ marginBottom: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="search-input"
                                    style={{ width: 'auto' }}
                                    title="من تاريخ"
                                />
                                <span style={{ color: '#666' }}>إلى</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="search-input"
                                    style={{ width: 'auto' }}
                                    title="إلى تاريخ"
                                />
                                <input
                                    type="text"
                                    placeholder="بحث بالاسم أو المعرف..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>

                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {loadingLogs ? 'جاري التحميل...' : `إجمالي: ${totalRecords} | المعروض: ${filteredLogs.length}`}
                            </span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <select
                                    value={exportDeviceFilter || ''}
                                    onChange={(e) => setExportDeviceFilter(e.target.value || null)}
                                    className="search-input"
                                    style={{ width: 'auto' }}
                                    title="اختر جهاز للتصدير الكامل أو اختر الكل"
                                >
                                    <option value="">📱 كل الأجهزة</option>
                                    <option value={deviceIp}>{deviceIp}</option>
                                </select>
                                <button
                                    className="btn-export"
                                    onClick={handleExportAll}
                                    title="تصدير كل البيانات من الخادم"
                                    style={{ backgroundColor: '#3498db' }}
                                >
                                    📥 تصدير الكل
                                </button>
                                <button
                                    className="btn-export"
                                    onClick={handleExportFiltered}
                                    disabled={filteredLogs.length === 0}
                                    title={`تصدير ${filteredLogs.length} سجل مفلتر`}
                                    style={{
                                        opacity: filteredLogs.length === 0 ? 0.5 : 1,
                                        cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
                                        backgroundColor: '#27ae60'
                                    }}
                                >
                                    📊 تصدير المفلتر 
                                </button>
                            </div>
                        </div>
                    </div>

                    {loadingLogs && logs.length === 0 ? (
                        <div style={{ padding: '2rem' }}>
                            <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>معرف المستخدم</th>
                                            <th>الاسم</th>
                                            <th>التاريخ</th>
                                            <th>الدخول</th>
                                            <th>الخروج</th>
                                            <th>التأخير (دقيقة)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map((log, index) => {
                                            const lateMins = calculateLateMinutes(log.CheckIn);
                                            return (
                                                <tr key={index}>
                                                    <td>{(page - 1) * pageSize + index + 1}</td>
                                                    <td>{log.UserID}</td>
                                                    <td>{log.Name}</td>
                                                    <td>{log.Date}</td>
                                                    <td dir="ltr" style={{ color: 'green', fontWeight: 'bold' }}>{log.CheckIn || '-'}</td>
                                                    <td dir="ltr" style={{ color: 'red', fontWeight: 'bold' }}>{log.CheckOut || '-'}</td>
                                                    <td style={{ color: lateMins > 0 ? 'red' : 'inherit', fontWeight: lateMins > 0 ? 'bold' : 'normal' }}>
                                                        {lateMins > 0 ? formatMinutes(lateMins) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredLogs.length === 0 && (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>لا توجد سجلات</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', gap: '10px' }}>
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="btn-pagination"
                                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                                    >
                                        السابق
                                    </button>
                                    <span>صفحة {page} من {totalPages}</span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="btn-pagination"
                                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                                    >
                                        التالي
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Weekly Late Tab Content */}
            {activeTab === 'weekly' && (
                <>
                    <div className="table-header">
                        <h3 className="table-title">
                            ملخص تأخيرات الأسبوع ({weekInfo.weekStart} - {weekInfo.weekEnd})
                        </h3>
                        <button
                            className="btn-export"
                            onClick={handleExportWeekly}
                            disabled={weeklyLate.length === 0}
                            title="تصدير إلى Excel"
                        >
                            📥 تصدير Excel
                        </button>
                    </div>

                    {loadingWeekly ? (
                        <div style={{ padding: '2rem' }}>
                            <div className="skeleton" style={{ height: '60px', marginBottom: '10px' }}></div>
                            <div className="skeleton" style={{ height: '60px', marginBottom: '10px' }}></div>
                        </div>
                    ) : weeklyLate.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>معرف المستخدم</th>
                                        <th>الاسم</th>
                                        <th>عدد أيام التأخير</th>
                                        <th>إجمالي التأخير</th>
                                        <th>التفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyLate.map((user, index) => (
                                        <React.Fragment key={user.userID || index}>
                                            <tr style={{ backgroundColor: expandedUser === user.userID ? '#f0f9f8' : '' }}>
                                                <td>{index + 1}</td>
                                                <td>{user.userID}</td>
                                                <td>{user.name}</td>
                                                <td style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                                                    {user.lateDaysCount} أيام
                                                </td>
                                                <td style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                                                    {formatMinutes(user.totalLateMinutes)}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => toggleExpand(user.userID)}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            border: '1px solid #00b3a8',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            background: expandedUser === user.userID ? '#00b3a8' : 'white',
                                                            color: expandedUser === user.userID ? 'white' : '#00b3a8',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    >
                                                        {expandedUser === user.userID ? 'إخفاء ▲' : 'عرض ▼'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedUser === user.userID && user.dailyDetails && user.dailyDetails.length > 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '0' }}>
                                                        <div style={{
                                                            background: '#f8fafc',
                                                            padding: '1rem',
                                                            borderRadius: '8px',
                                                            margin: '0.5rem'
                                                        }}>
                                                            <h4 style={{ marginBottom: '0.75rem', color: '#0c315d' }}>
                                                                تفاصيل التأخير اليومي
                                                            </h4>
                                                            <table style={{ width: '100%', background: 'white' }}>
                                                                <thead>
                                                                    <tr style={{ background: '#e2e8f0' }}>
                                                                        <th style={{ padding: '0.5rem' }}>اليوم</th>
                                                                        <th style={{ padding: '0.5rem' }}>التاريخ</th>
                                                                        <th style={{ padding: '0.5rem' }}>وقت الحضور</th>
                                                                        <th style={{ padding: '0.5rem' }}>مدة التأخير</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {user.dailyDetails.map((day, dIdx) => (
                                                                        <tr key={dIdx}>
                                                                            <td style={{ padding: '0.5rem' }}>{day.dayName}</td>
                                                                            <td style={{ padding: '0.5rem' }} dir="ltr">
                                                                                {(day.date || '').split('T')[0]}
                                                                            </td>
                                                                            <td style={{ padding: '0.5rem', color: '#e74c3c', fontWeight: 'bold' }} dir="ltr">
                                                                                {day.entryTime}
                                                                            </td>
                                                                            <td style={{ padding: '0.5rem', color: '#e74c3c' }}>
                                                                                {formatMinutes(day.lateMinutes)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--success-color)' }}>
                            <h3>لا يوجد متأخرين هذا الأسبوع!</h3>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LogsTable;
