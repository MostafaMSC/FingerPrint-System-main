import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import './WorkHoursDetailModal.css';

const WorkHoursDetailModal = ({ employee, viewType, deviceIp, settings, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Navigation states
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedWeekStart, setSelectedWeekStart] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // Helper to get Saturday-based week start
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        // We want Saturday as first day
        // If Saturday (6), offset = 0
        // If Sunday (0), offset = 1
        // If Monday (1), offset = 2
        // etc.
        const offset = day === 6 ? 0 : day + 1;
        d.setDate(d.getDate() - offset);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Initialize week start on mount
    useEffect(() => {
        setSelectedWeekStart(getWeekStart(new Date()));
    }, []);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                // Use get-user endpoint to get ALL logs for this user, not just system-wide page
                const res = await axios.get(`/api/ZKPython/get-user/${employee.userID}?deviceIp=${deviceIp || ''}`);
                const userLogs = res.data.userLogs || [];
                setLogs(userLogs);
            } catch (error) {
                console.error("Failed to fetch logs", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [employee.userID, deviceIp]);

    if (!employee) return null;

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Get day name in Arabic based on JS getDay() (0=Sunday)
    const getDayNameAr = (date) => {
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[date.getDay()];
    };

    // Parse time from log
    const parseLogTime = (log) => {
        const timeStr = log.Time || log.time;
        if (!timeStr) return null;
        try {
            return new Date(timeStr.replace(' ', 'T'));
        } catch {
            return null;
        }
    };

    // Calculate hours between check-in and check-out for a day
    const calculateDayHours = (dayLogs) => {
        if (!dayLogs || dayLogs.length === 0) return 0;

        // Get all timestamps
        const allTimes = dayLogs
            .map(l => ({ time: parseLogTime(l), log: l }))
            .filter(item => item.time)
            .sort((a, b) => a.time.getTime() - b.time.getTime());

        if (allTimes.length === 0) return 0;

        // Try to find explicit CheckIn and CheckOut
        const checkIn = allTimes.find(x => {
            const status = (x.log.CheckStatus || "").replace(/\s+/g, "");
            return status === "CheckIn" || status === "0";
        });

        const checkOut = [...allTimes].reverse().find(x => {
            const status = (x.log.CheckStatus || "").replace(/\s+/g, "");
            return status === "CheckOut" || status === "1";
        });

        if (checkIn && checkOut && checkIn.time.getTime() !== checkOut.time.getTime()) {
            const diffMs = checkOut.time.getTime() - checkIn.time.getTime();
            return Math.max(0, diffMs / (1000 * 60 * 60));
        }

        // Fallback: First and Last
        const firstEntry = allTimes[0].time;
        let lastEntry = allTimes[allTimes.length - 1].time;
        const lastLog = allTimes[allTimes.length - 1].log;

        const todayStr = formatDate(new Date());
        const firstEntryDateStr = formatDate(firstEntry);
        const isToday = firstEntryDateStr === todayStr;

        // Duplicate Prevention Logic
        const durationMinutes = (lastEntry.getTime() - firstEntry.getTime()) / (1000 * 60);
        const isExplicitCheckOut = (lastLog.CheckStatus === "CheckOut" || lastLog.CheckStatus === "1");

        // If multiple punches but close together (and not explicit CheckOut)
        if (allTimes.length > 1 && durationMinutes < 60 && !isExplicitCheckOut) {
            if (isToday) {
                // Live Calculation
                lastEntry = new Date();
            } else {
                // Ignore duplicate punch, treat as 0 hours (or single punch)
                return 0;
            }
        } else if (allTimes.length === 1 && isToday) {
            // Live Calculation for single punch
            lastEntry = new Date();
        } else if (allTimes.length === 1 && !isToday) {
            return 0;
        }

        // Cap live calculation at shift end (e.g. 16:00)
        // For simplicity in modal, we just use current time vs first entry
        // You can add settings.finishTime logic here if needed

        const diffMs = lastEntry.getTime() - firstEntry.getTime();
        return Math.max(0, diffMs / (1000 * 60 * 60));
    };

    // Group logs by date
    const groupByDate = (logsArr) => {
        const grouped = {};
        logsArr.forEach(log => {
            const dateObj = parseLogTime(log);
            if (!dateObj) return;
            const dateStr = formatDate(dateObj); // Ensure consistent YYYY-MM-DD format

            if (!grouped[dateStr]) grouped[dateStr] = [];
            grouped[dateStr].push(log);
        });
        return grouped;
    };

    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    // --- DAILY VIEW ---
    const renderDailyView = () => {
        const dateStr = formatDate(selectedDate);
        const dayName = getDayNameAr(selectedDate);

        const dayLogs = logs.filter(log => {
            const dateObj = parseLogTime(log);
            if (!dateObj) return false;
            return formatDate(dateObj) === dateStr;
        });

        const hoursWorked = calculateDayHours(dayLogs);
        const requiredHours = settings.requiredDailyHours || 8;
        const remainingHours = Math.max(0, requiredHours - hoursWorked);
        const progressPercent = Math.min(100, (hoursWorked / requiredHours) * 100);

        const events = dayLogs.map(log => {
            const timeStr = log.Time || log.time;
            const timePart = timeStr ? timeStr.split(' ')[1] : '';
            const status = (log.CheckStatus || '').replace(/\s+/g, '');
            return {
                time: timePart,
                status,
                isCheckIn: status === 'CheckIn'
            };
        }).filter(e => e.time).sort((a, b) => a.time.localeCompare(b.time));

        const goToPrevDay = () => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 1);
            setSelectedDate(newDate);
        };

        const goToNextDay = () => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 1);
            const today = new Date();
            if (newDate <= today) {
                setSelectedDate(newDate);
            }
        };

        const isToday = formatDate(selectedDate) === formatDate(new Date());

        return (
            <div className="daily-view">
                <div className="nav-controls">
                    <button className="nav-btn" onClick={goToPrevDay}>→ اليوم السابق</button>
                    <h4>{dayName} - {dateStr}</h4>
                    <button className="nav-btn" onClick={goToNextDay} disabled={isToday}>
                        اليوم التالي ←
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                    <div className="progress-header">
                        <span>المنجز: <strong>{hoursWorked.toFixed(2)} ساعة</strong></span>
                        <span>المتبقي: <strong>{remainingHours.toFixed(2)} ساعة</strong></span>
                        <span>المطلوب: <strong>{requiredHours} ساعة</strong></span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${progressPercent}%`,
                                backgroundColor: progressPercent >= 100 ? '#27ae60' : '#00b3a8'
                            }}
                        ></div>
                    </div>
                    <div className="progress-percent">{progressPercent.toFixed(1)}%</div>
                </div>

                {events.length === 0 ? (
                    <div className="no-data">
                        <p>لا توجد سجلات لهذا اليوم ({dayName})</p>
                    </div>
                ) : (
                    <div className="timeline">
                        {events.map((event, idx) => (
                            <div key={idx} className={`timeline-item ${event.isCheckIn ? 'check-in' : 'check-out'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <span className="timeline-time">{event.time}</span>
                                    <span className="timeline-label">
                                        {event.isCheckIn ? 'دخول' : 'خروج'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // --- WEEKLY VIEW ---
    const renderWeeklyView = () => {
        if (!selectedWeekStart) return <div className="loading">جاري التحميل...</div>;

        const grouped = groupByDate(logs);
        const weekData = [];

        // Generate 7 days starting from selectedWeekStart (Saturday)
        for (let i = 0; i < 7; i++) {
            const date = new Date(selectedWeekStart);
            date.setDate(selectedWeekStart.getDate() + i);
            const dateStr = formatDate(date);
            const dayName = getDayNameAr(date);
            const dayLogs = grouped[dateStr] || [];
            const hours = calculateDayHours(dayLogs);

            weekData.push({
                dayName: dayName,
                date: dateStr,
                shortDate: date.getDate().toString(),
                hours: parseFloat(hours.toFixed(2)),
                worked: dayLogs.length > 0,
                isFriday: date.getDay() === 5 // Friday
            });
        }

        const weekEnd = new Date(selectedWeekStart);
        weekEnd.setDate(selectedWeekStart.getDate() + 6);

        const totalHours = weekData.reduce((sum, d) => sum + d.hours, 0);
        const workedDays = weekData.filter(d => d.worked).length;

        const goToPrevWeek = () => {
            const newStart = new Date(selectedWeekStart);
            newStart.setDate(newStart.getDate() - 7);
            setSelectedWeekStart(newStart);
        };

        const goToNextWeek = () => {
            const newStart = new Date(selectedWeekStart);
            newStart.setDate(newStart.getDate() + 7);
            const today = new Date();
            if (newStart <= today) {
                setSelectedWeekStart(newStart);
            }
        };

        const isCurrentWeek = formatDate(getWeekStart(new Date())) === formatDate(selectedWeekStart);

        return (
            <div className="weekly-view">
                <div className="nav-controls">
                    <button className="nav-btn" onClick={goToPrevWeek}>→ الأسبوع السابق</button>
                    <h4>{formatDate(selectedWeekStart)} إلى {formatDate(weekEnd)}</h4>
                    <button className="nav-btn" onClick={goToNextWeek} disabled={isCurrentWeek}>
                        الأسبوع التالي ←
                    </button>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weekData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="dayName"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis label={{ value: 'ساعات', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                            formatter={(value) => [`${value} ساعة`, 'ساعات العمل']}
                            labelFormatter={(label, payload) => {
                                const item = payload?.[0]?.payload;
                                return item ? `${item.dayName} (${item.date})` : label;
                            }}
                        />
                        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                            {weekData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isFriday ? '#94a3b8' : (entry.worked ? '#00b3a8' : '#e0e0e0')}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Week days table for clarity */}
                <div className="week-table">
                    <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {weekData.map((d, i) => (
                                    <th key={i} style={{
                                        padding: '0.5rem',
                                        background: d.isFriday ? '#f1f5f9' : '#f8fafc',
                                        border: '1px solid #e0e0e0',
                                        fontSize: '0.85rem'
                                    }}>
                                        {d.dayName}<br />
                                        <small style={{ color: '#666' }}>{d.date}</small>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {weekData.map((d, i) => (
                                    <td key={i} style={{
                                        padding: '0.5rem',
                                        textAlign: 'center',
                                        background: d.isFriday ? '#f1f5f9' : (d.worked ? '#d4edda' : '#f8d7da'),
                                        border: '1px solid #e0e0e0',
                                        fontWeight: 'bold'
                                    }}>
                                        {d.hours.toFixed(1)}h
                                        <br />
                                        <small>{d.worked ? '✓' : (d.isFriday ? 'إجازة' : '✗')}</small>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="weekly-summary">
                    <p>إجمالي الأسبوع: <strong>{totalHours.toFixed(2)} ساعة</strong></p>
                    <p>أيام الحضور: <strong>{workedDays} من 6</strong> (بدون الجمعة)</p>
                </div>
            </div>
        );
    };

    // --- MONTHLY VIEW ---
    const renderMonthlyView = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Week header: السبت الأحد الاثنين الثلاثاء الأربعاء الخميس الجمعة
        const weekDaysHeader = ['س', 'أ', 'إ', 'ث', 'أ', 'خ', 'ج'];

        // Calculate offset - we want Saturday as first column
        // JS getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
        // Our grid: 0=Saturday, 1=Sunday, ..., 6=Friday
        // So: Saturday(6)->0, Sunday(0)->1, Monday(1)->2, ..., Friday(5)->6
        const firstDayJS = firstDayOfMonth.getDay();
        const firstDayOffset = firstDayJS === 6 ? 0 : firstDayJS + 1;

        const grouped = groupByDate(logs);
        const today = new Date();

        const monthData = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateStr = formatDate(date);
            const dayLogs = grouped[dateStr] || [];
            const hours = calculateDayHours(dayLogs);
            const isFuture = date > today;
            const isFriday = date.getDay() === 5;

            monthData.push({
                day: i,
                date: dateStr,
                dayName: getDayNameAr(date),
                hours: parseFloat(hours.toFixed(2)),
                worked: dayLogs.length > 0,
                isFuture,
                isFriday
            });
        }

        const workedDays = monthData.filter(d => d.worked && !d.isFuture).length;
        const workableDays = monthData.filter(d => !d.isFuture && !d.isFriday).length;
        const totalHours = monthData.reduce((sum, d) => sum + d.hours, 0);

        const goToPrevMonth = () => {
            const newMonth = new Date(selectedMonth);
            newMonth.setMonth(newMonth.getMonth() - 1);
            setSelectedMonth(newMonth);
        };

        const goToNextMonth = () => {
            const newMonth = new Date(selectedMonth);
            newMonth.setMonth(newMonth.getMonth() + 1);
            const today = new Date();
            if (newMonth.getMonth() <= today.getMonth() || newMonth.getFullYear() < today.getFullYear()) {
                setSelectedMonth(newMonth);
            }
        };

        const isCurrentMonth = selectedMonth.getMonth() === today.getMonth() &&
            selectedMonth.getFullYear() === today.getFullYear();

        return (
            <div className="monthly-view">
                <div className="nav-controls">
                    <button className="nav-btn" onClick={goToPrevMonth}>→ الشهر السابق</button>
                    <h4>{monthNames[month]} {year}</h4>
                    <button className="nav-btn" onClick={goToNextMonth} disabled={isCurrentMonth}>
                        الشهر التالي ←
                    </button>
                </div>

                <div className="calendar-grid">
                    {/* Week day headers */}
                    {weekDaysHeader.map((d, i) => (
                        <div key={i} className={`calendar-header ${i === 6 ? 'friday' : ''}`}>{d}</div>
                    ))}

                    {/* Empty cells for alignment */}
                    {Array.from({ length: firstDayOffset }).map((_, i) => (
                        <div key={`empty-${i}`} className="calendar-day empty"></div>
                    ))}

                    {/* Month days */}
                    {monthData.map((day, idx) => (
                        <div
                            key={idx}
                            className={`calendar-day ${day.isFuture ? 'future' :
                                day.isFriday ? 'friday-day' :
                                    day.worked ? 'worked' : 'absent'
                                }`}
                            title={`${day.dayName} ${day.date}: ${day.hours} ساعة`}
                        >
                            <span className="day-number">{day.day}</span>
                            {!day.isFuture && (
                                <span className="day-status">
                                    {day.isFriday ? '-' : (day.worked ? '✓' : '✗')}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="calendar-legend">
                    <span className="legend-item"><span className="legend-color worked"></span> حضور</span>
                    <span className="legend-item"><span className="legend-color absent"></span> غياب</span>
                    <span className="legend-item"><span className="legend-color friday-legend"></span> جمعة</span>
                    <span className="legend-item"><span className="legend-color future"></span> قادم</span>
                </div>

                <div className="monthly-summary">
                    <p>أيام الحضور: <strong>{workedDays} من {workableDays}</strong> (بدون الجمعة)</p>
                    <p>إجمالي ساعات الشهر: <strong>{totalHours.toFixed(2)} ساعة</strong></p>
                </div>
            </div>
        );
    };

    const getTitle = () => {
        switch (viewType) {
            case 'daily': return 'تفاصيل ساعات اليوم';
            case 'weekly': return 'تفاصيل ساعات الأسبوع';
            case 'monthly': return 'تفاصيل ساعات الشهر';
            default: return 'تفاصيل ساعات العمل';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{getTitle()}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="employee-info-bar">
                    <span><strong>الموظف:</strong> {employee.name}</span>
                    <span><strong>المعرف:</strong> {employee.userID}</span>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading">جاري تحميل البيانات...</div>
                    ) : (
                        <>
                            {viewType === 'daily' && renderDailyView()}
                            {viewType === 'weekly' && renderWeeklyView()}
                            {viewType === 'monthly' && renderMonthlyView()}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>إغلاق</button>
                </div>
            </div>
        </div>
    );
};

export default WorkHoursDetailModal;
