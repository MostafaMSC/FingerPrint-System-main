import React, { useState, useEffect, useCallback } from 'react';
import './Settings.css';

function Settings() {
    const [settings, setSettings] = useState({
        workDayStart: '08:00',
        workDayEnd: '16:00',
        requiredDailyHours: 8,
        workingDaysPerMonth: 26,
        allowedOvertimeHours: 20,
        allowedVacationDays: 2
    });

    const [saved, setSaved] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('workSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings({
                workDayStart: parsed.workDayStart || '08:00',
                workDayEnd: parsed.workDayEnd || '16:00',
                requiredDailyHours: parsed.requiredDailyHours || 8,
                workingDaysPerMonth: parsed.workingDaysPerMonth || 26,
                allowedOvertimeHours: parsed.allowedOvertimeHours || 20,
                allowedVacationDays: parsed.allowedVacationDays || 2
            });
        }
    }, []);

    // Auto-calculate required daily hours when start/end times change
    const calculateDailyHours = useCallback(() => {
        const [startHour, startMin] = settings.workDayStart.split(':').map(Number);
        const [endHour, endMin] = settings.workDayEnd.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        const diffMinutes = endMinutes - startMinutes;
        const hours = diffMinutes / 60;

        if (hours > 0 && hours !== settings.requiredDailyHours) {
            setSettings(prev => ({
                ...prev,
                requiredDailyHours: Math.round(hours * 100) / 100
            }));
        }
    }, [settings.workDayStart, settings.workDayEnd, settings.requiredDailyHours]);

    useEffect(() => {
        calculateDailyHours();
    }, [calculateDailyHours]);

    const handleChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
        setSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem('workSettings', JSON.stringify(settings));
        setSaved(true);

        window.dispatchEvent(new Event('settingsUpdated'));

        setTimeout(() => setSaved(false), 3000);
    };

    const monthlyRequired = settings.requiredDailyHours * settings.workingDaysPerMonth;

    return (
        <div className="settings-container">
            <h2>إعدادات ساعات العمل</h2>

            <div className="settings-section">
                <h3>أوقات العمل</h3>
                <div className="settings-grid">
                    <div className="setting-item">
                        <label htmlFor="workDayStart">ساعة بداية اليوم:</label>
                        <input
                            type="time"
                            id="workDayStart"
                            value={settings.workDayStart}
                            onChange={(e) => handleChange('workDayStart', e.target.value)}
                        />
                    </div>

                    <div className="setting-item">
                        <label htmlFor="workDayEnd">ساعة نهاية اليوم:</label>
                        <input
                            type="time"
                            id="workDayEnd"
                            value={settings.workDayEnd}
                            onChange={(e) => handleChange('workDayEnd', e.target.value)}
                        />
                    </div>

                    <div className="setting-item">
                        <label htmlFor="requiredDailyHours">ساعات العمل اليومية المطلوبة:</label>
                        <input
                            type="number"
                            id="requiredDailyHours"
                            min="1"
                            max="24"
                            step="0.5"
                            value={settings.requiredDailyHours}
                            readOnly
                            style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                            title="يتم حسابها تلقائياً من ساعة البداية والنهاية"
                        />
                        <small style={{ color: '#666', fontSize: '12px' }}>
                            (محسوبة تلقائياً من ساعة البداية والنهاية)
                        </small>
                    </div>

                    <div className="setting-item">
                        <label htmlFor="workingDaysPerMonth">أيام العمل الشهرية:</label>
                        <input
                            type="number"
                            id="workingDaysPerMonth"
                            min="1"
                            max="31"
                            value={settings.workingDaysPerMonth}
                            onChange={(e) => handleChange('workingDaysPerMonth', parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3>السماحات الشهرية (لجميع الموظفين)</h3>
                <div className="settings-grid">
                    <div className="setting-item">
                        <label htmlFor="allowedOvertimeHours">ساعات الزمنيات المسموحة شهرياً:</label>
                        <input
                            type="number"
                            id="allowedOvertimeHours"
                            min="0"
                            max="100"
                            step="0.5"
                            value={settings.allowedOvertimeHours}
                            onChange={(e) => handleChange('allowedOvertimeHours', parseFloat(e.target.value))}
                        />
                        <small style={{ color: '#666', fontSize: '12px' }}>
                            (تحسب كساعات عمل فعلية)
                        </small>
                    </div>

                    <div className="setting-item">
                        <label htmlFor="allowedVacationDays">أيام الإجازات المسموحة شهرياً:</label>
                        <input
                            type="number"
                            id="allowedVacationDays"
                            min="0"
                            max="31"
                            value={settings.allowedVacationDays}
                            onChange={(e) => handleChange('allowedVacationDays', parseInt(e.target.value))}
                        />
                        <small style={{ color: '#666', fontSize: '12px' }}>
                            (كل يوم = {settings.requiredDailyHours} ساعة عمل)
                        </small>
                    </div>
                </div>
            </div>

            <div className="calculated-info">
                <h3> الساعات الشهرية المطلوبة</h3>
                <p className="monthly-hours">{monthlyRequired.toFixed(2)} ساعة</p>
                <p className="calculation-formula">
                    ({settings.requiredDailyHours.toFixed(2)} ساعة يومياً × {settings.workingDaysPerMonth} يوم)
                </p>
            </div>

            <button
                className="save-button"
                onClick={handleSave}
            >
                حفظ الإعدادات
            </button>

            {saved && (
                <div className="success-message">
                    تم حفظ الإعدادات بنجاح! سيتم تطبيقها على كل النظام.
                </div>
            )}
        </div>
    );
}

export default Settings;
