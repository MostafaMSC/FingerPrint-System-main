import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { exportToExcel, tableHeaders } from '../../utils/excelExport';
import './Dashboard.css';

const LateTable = ({ deviceIp }) => {
    const [lateLogs, setLateLogs] = useState([]);
    const [weeklyLate, setWeeklyLate] = useState([]);
    const [weekInfo, setWeekInfo] = useState({ weekStart: '', weekEnd: '' });
    const [loading, setLoading] = useState(true);
    const [loadingWeekly, setLoadingWeekly] = useState(true);
    const [lateTime, setLateTime] = useState('08:30');
    const [activeTab, setActiveTab] = useState('today');
    const [expandedUser, setExpandedUser] = useState(null);

    const fetchLateLogs = async (time) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/ZKPython/get-late?time=${time}&deviceIp=${deviceIp}`);
            setLateLogs(res.data.lateLogs || []);
        } catch (error) {
            console.error("Failed to fetch late logs", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeeklyLate = async (time) => {
        setLoadingWeekly(true);
        try {
            const res = await axios.get(`/api/ZKPython/get-weekly-late?time=${time}&deviceIp=${deviceIp}`);
            console.log('Weekly late response:', res.data); // Debug log
            const result = res.data.result || [];
            // Normalize field names (handle both camelCase and PascalCase)
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
        const savedSettings = localStorage.getItem('workSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            const initialTime = parsed.workDayStart || '08:30';
            setLateTime(initialTime);
            fetchLateLogs(initialTime);
            fetchWeeklyLate(initialTime);
        } else {
            fetchLateLogs(lateTime);
            fetchWeeklyLate(lateTime);
        }

        const handleSettingsUpdate = () => {
            const savedSettings = localStorage.getItem('workSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                const newLateTime = parsed.workDayStart || '08:30';
                setLateTime(newLateTime);
                fetchLateLogs(newLateTime);
                fetchWeeklyLate(newLateTime);
            }
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceIp]);

    const handleExport = () => {
        if (!lateLogs || lateLogs.length === 0) return;

        const exportData = lateLogs.map(log => ({
            ...log,
            Time: log.Time || log.time || ''
        }));

        exportToExcel(exportData, tableHeaders.late, 'المتأخرين', 'المتأخرين');
    };

    const handleExportWeekly = () => {
        if (!weeklyLate || weeklyLate.length === 0) return;

        const exportData = [];
        weeklyLate.forEach(user => {
            // 1. استخدم التسلسل الاختياري (Optional Chaining) لضمان عدم وجود خطأ إذا كان dailyDetails غير موجود.
            // 2. استخدم isArray للتأكد من أنه مصفوفة قبل التكرار.
            const details = user.dailyDetails;

            if (Array.isArray(details) && details.length > 0) { // <--- التعديل هنا
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
        // ... بقية الكود
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
        if (hours > 0) {
            return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}`;
        }
        return `${mins} دقيقة`;
    };

    const toggleExpand = (userId) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    return (
        <div className="table-container">
            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                    className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
                    onClick={() => setActiveTab('today')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        backgroundColor: activeTab === 'today' ? '#00b3a8' : '#e0e0e0',
                        color: activeTab === 'today' ? 'white' : '#333',
                        transition: 'all 0.2s'
                    }}
                >
                    📅 متأخرين اليوم
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
                    📊 ملخص الأسبوع
                </button>
            </div>

            {/* Today's Late */}
            {activeTab === 'today' && (
                <>
                    <div className="table-header">
                        <h3 className="table-title">المتأخرين اليوم (بعد {lateTime})</h3>
                        <button
                            className="btn-export"
                            onClick={handleExport}
                            disabled={lateLogs.length === 0}
                            title="تصدير إلى Excel"
                        >
                            📥 تصدير Excel
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem' }}>
                            <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
                            <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
                        </div>
                    ) : lateLogs.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>معرف المستخدم</th>
                                        <th>الاسم</th>
                                        <th>وقت الحضور</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lateLogs.map((log, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{log.UserID}</td>
                                            <td>{log.Name}</td>
                                            <td dir="ltr" style={{ textAlign: 'right', color: 'var(--danger-color)', fontWeight: 'bold' }}>
                                                {(log.Time || log.time || "").replace("T", " ").split(" ")[1] || (log.Time || log.time)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--success-color)' }}>
                            <h3>لا يوجد متأخرين بعد الساعة {lateTime}!</h3>
                        </div>
                    )}
                </>
            )}

            {/* Weekly Late Summary */}
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
                                            {/* Daily Details Row */}
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

export default LateTable;
