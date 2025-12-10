import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getEmployeeData } from '../../utils/employeeData';
import { exportToExcel, tableHeaders } from '../../utils/excelExport';
import EmployeeDetailModal from './EmployeeDetailModal';
import WorkHoursDetailModal from './WorkHoursDetailModal';
import './Dashboard.css';

const SortIcon = ({ active, direction }) => {
    if (!active) return null;

    return (
        <span style={{ marginRight: "5px" }}>
            {direction === "asc" ? "↑" : "↓"}
        </span>
    );
};

const WorkHoursTable = ({ deviceIp }) => {
    const [workHours, setWorkHours] = useState([]);
    const [filteredWorkHours, setFilteredWorkHours] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [settings, setSettings] = useState({
        requiredDailyHours: 8,
        workingDaysPerMonth: 26,
        allowedOvertimeHours: 20,
        allowedVacationDays: 2
    });
    const [activeView, setActiveView] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
    const [sorting, setSorting] = useState({
        key: null,
        direction: 'asc'
    });
    const [detailModal, setDetailModal] = useState(null); // { employee, viewType: 'daily' | 'weekly' | 'monthly' }
    useEffect(() => {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem('workSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings({
                requiredDailyHours: parsed.requiredDailyHours || 8,
                workingDaysPerMonth: parsed.workingDaysPerMonth || 26,
                allowedOvertimeHours: parsed.allowedOvertimeHours || 20,
                allowedVacationDays: parsed.allowedVacationDays || 2
            });
        }
    }, []);

    const fetchWorkHours = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                requiredDailyHours: settings.requiredDailyHours,
                workingDaysPerMonth: settings.workingDaysPerMonth,
                deviceIp: deviceIp || ''
            });
            const res = await axios.get(`/api/ZKPython/get-work-hours?${params}`);
            const data = res.data.result || [];

            const enrichedData = data.map(emp => {
                const empData = getEmployeeData(emp.UserID);

                const overtimeHours = parseFloat(empData.overtimeHours) || 0;
                const vacationDays = parseInt(empData.vacationDays) || 0;

                const vacationHours = vacationDays * settings.requiredDailyHours;

                // ⚠ هنا نستخدم MonthHours من API وليس emp.monthHours
                const monthHours = emp.MonthHours || 0;

                const adjustedHours = monthHours + overtimeHours + vacationHours;

                const monthlyRequired = emp.MonthlyRequired || (settings.requiredDailyHours * settings.workingDaysPerMonth);

                const adjustedAchievement = (monthlyRequired > 0)
                    ? (adjustedHours / monthlyRequired) * 100
                    : 0;

                const adjustedDeduction = (monthlyRequired > 0)
                    ? Math.max(0, ((monthlyRequired - adjustedHours) / monthlyRequired) * 100)
                    : 0;

                return {
                    ...emp,

                    // ✔ احفظ الحقول بالاسم المستخدم في الواجهة
                    userID: emp.UserID,
                    name: emp.Name,

                    TodayHours: emp.TodayHours,
                    WeeklyHours: emp.WeeklyHours,
                    MonthHours: monthHours,
                    MonthlyRequired: monthlyRequired,

                    achievementPercent: emp.AchievementPercent,
                    deductionPercent: emp.DeductionPercent,

                    overtimeHours,
                    vacationDays,
                    adjustedHours,
                    adjustedAchievement,
                    adjustedDeduction
                };
            });


            setWorkHours(enrichedData);
            setFilteredWorkHours(enrichedData);
        } catch (error) {
            console.error("Failed to fetch work hours", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkHours();

        // Listen for settings updates
        const handleSettingsUpdate = () => {
            const savedSettings = localStorage.getItem('workSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setSettings({
                    requiredDailyHours: parsed.requiredDailyHours || 8,
                    workingDaysPerMonth: parsed.workingDaysPerMonth || 26,
                    allowedOvertimeHours: parsed.allowedOvertimeHours || 20,
                    allowedVacationDays: parsed.allowedVacationDays || 2
                });
            }
        };

        // Listen for employee data updates
        const handleEmployeeDataUpdate = () => {
            fetchWorkHours();
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        window.addEventListener('employeeDataUpdated', handleEmployeeDataUpdate);

        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdate);
            window.removeEventListener('employeeDataUpdated', handleEmployeeDataUpdate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings, deviceIp]); // Re-fetch when device or settings change

    // Filter work hours based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredWorkHours(workHours);
        } else {
            const filtered = workHours.filter(emp =>
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.userID.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredWorkHours(filtered);
        }
    }, [searchTerm, workHours]);

    const getAchievementColor = (percent) => {
        if (percent >= 100) return '#27ae60'; // Green
        if (percent >= 80) return '#f39c12'; // Yellow
        return '#e74c3c'; // Red
    };

    const handleRowClick = (employee) => {
        setSelectedEmployee(employee);
    };

    const sortedData = React.useMemo(() => {
        let sortable = [...filteredWorkHours];

        if (sorting.key) {
            sortable.sort((a, b) => {
                const valA = a[sorting.key];
                const valB = b[sorting.key];

                // للتعامل مع null أو undefined
                if (valA == null) return 1;
                if (valB == null) return -1;

                // إذا الرقم عدد — فرّز كأرقام
                if (!isNaN(valA) && !isNaN(valB)) {
                    return sorting.direction === 'asc'
                        ? valA - valB
                        : valB - valA;
                }

                // فرز النصوص
                return sorting.direction === 'asc'
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            });
        }

        return sortable;
    }, [filteredWorkHours, sorting]);


    const requestSort = (key) => {
        let direction = 'asc';

        if (sorting.key === key && sorting.direction === 'asc') {
            direction = 'desc';
        }

        setSorting({ key, direction });
    };


    const handleExport = () => {
        // Format data for export with correct keys matching tableHeaders.workHours
        const exportData = filteredWorkHours.map((user, index) => ({
            '#': index + 1,
            'userID': user.userID || user.UserID || '-',
            'name': user.name || user.Name || '-',
            'todayHours': `${user.TodayHours} ساعة`,
            'weeklyHours': `${user.WeeklyHours} ساعة`,
            'adjustedHours': `${user.adjustedHours.toFixed(2)} ساعة`,
            'monthlyRequired': `${user.MonthlyRequired} ساعة`,
            'adjustedAchievement': `${user.adjustedAchievement.toFixed(2)}%`,
            'adjustedDeduction': `${user.adjustedDeduction.toFixed(2)}%`
        }));
        exportToExcel(exportData, tableHeaders.workHours, 'ساعات_العمل', 'ساعات العمل');
    };

    return (
        <div className="table-container">

            <div className="table-header">
                <h3 className="table-title"> ساعات العمل </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="search-container" style={{ marginBottom: 0 }}>
                        <input
                            type="text"
                            placeholder="🔍 بحث بالاسم أو المعرف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <button
                        className="btn-export"
                        onClick={handleExport}
                        disabled={filteredWorkHours.length === 0}
                        title="تصدير إلى Excel"
                    >
                        📥 تصدير Excel
                    </button>
                </div>
            </div>
            {loading ? (
                <div style={{ padding: '2rem' }}>
                    <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
                    <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th >#</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('userID')}>
                                    <SortIcon active={sorting.key === 'userID'} direction={sorting.direction} />
                                    معرف المستخدم</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('name')}>
                                    <SortIcon active={sorting.key === 'name'} direction={sorting.direction} />
                                    الاسم</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('TodayHours')}>
                                    <SortIcon active={sorting.key === 'todayHours'} direction={sorting.direction} />
                                    ساعات اليوم</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('WeeklyHours')}>
                                    <SortIcon active={sorting.key === 'weeklyHours'} direction={sorting.direction} />
                                    ساعات الأسبوع</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('monthHours')}>
                                    <SortIcon active={sorting.key === 'adjustedHours'} direction={sorting.direction} />
                                    ساعات الشهر</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('monthlyRequired')}>
                                    <SortIcon active={sorting.key === 'monthlyRequired'} direction={sorting.direction} />
                                    المطلوب شهرياً</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('adjustedAchievement')}>
                                    <SortIcon active={sorting.key === 'adjustedAchievement'} direction={sorting.direction} />
                                    نسبة الإنجاز</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('adjustedDeduction')}>
                                    <SortIcon active={sorting.key === 'adjustedDeduction'} direction={sorting.direction} />
                                    نسبة الخصم</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((user, index) => (
                                <tr
                                    key={index}
                                    onClick={() => handleRowClick(user)}
                                    style={{ cursor: 'pointer' }}
                                    className="clickable-row"
                                >
                                    <td>{index + 1}</td>
                                    <td>{user.userID}</td>
                                    <td>{user.name}</td>
                                    <td
                                        style={{
                                            fontWeight: 'bold',
                                            color: user.TodayHours > 0 ? 'var(--success-color)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            textDecorationStyle: 'dotted'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setDetailModal({ employee: user, viewType: 'daily' }); }}
                                        title="اضغط لعرض تفاصيل اليوم"
                                    >
                                        {user.TodayHours} ساعة
                                    </td>
                                    <td
                                        style={{
                                            fontWeight: 'bold',
                                            color: 'var(--primary-color)',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            textDecorationStyle: 'dotted'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setDetailModal({ employee: user, viewType: 'weekly' }); }}
                                        title="اضغط لعرض تفاصيل الأسبوع"
                                    >
                                        {user.WeeklyHours} ساعة
                                    </td>
                                    <td
                                        style={{
                                            fontWeight: 'bold',
                                            color: 'var(--primary-color)',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            textDecorationStyle: 'dotted'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setDetailModal({ employee: user, viewType: 'monthly' }); }}
                                        title="اضغط لعرض تفاصيل الشهر"
                                    >
                                        {user.adjustedHours.toFixed(2)} ساعة
                                    </td>
                                    <td style={{ fontWeight: 'bold' }}>
                                        {user.MonthlyRequired} ساعة
                                    </td>
                                    <td style={{
                                        fontWeight: 'bold',
                                        color: getAchievementColor(user.adjustedAchievement),
                                        fontSize: '16px'
                                    }}>
                                        {user.adjustedAchievement.toFixed(2)}%
                                    </td>
                                    <td style={{
                                        fontWeight: 'bold',
                                        color: user.adjustedDeduction > 0 ? '#e74c3c' : '#27ae60',
                                        fontSize: '16px'
                                    }}>
                                        {user.adjustedDeduction.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredWorkHours.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#7f8c8d' }}>
                            <h3>لا توجد نتائج للبحث "{searchTerm}"</h3>
                        </div>
                    )}
                </div>
            )}

            {selectedEmployee && (
                <EmployeeDetailModal
                    employee={selectedEmployee}
                    settings={settings}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}

            {detailModal && (
                <WorkHoursDetailModal
                    employee={detailModal.employee}
                    viewType={detailModal.viewType}
                    deviceIp={deviceIp}
                    settings={settings}
                    onClose={() => setDetailModal(null)}
                />
            )}
        </div>
    );
};

export default WorkHoursTable;
