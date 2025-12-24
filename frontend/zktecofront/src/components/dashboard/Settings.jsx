import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../utils/api';
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

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading2FA, setLoading2FA] = useState(false);
    const [saved, setSaved] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

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

        // Load 2FA status
        load2FAStatus();
    }, []);

    const load2FAStatus = async () => {
        try {
            const response = await apiService.get2FAStatus();
            // Handle both camelCase and PascalCase
            const enabled = response.twoFactorEnabled || response.TwoFactorEnabled || false;
            setTwoFactorEnabled(enabled);
            console.log('2FA Status loaded:', enabled);
        } catch (error) {
            console.error('Error loading 2FA status:', error);
        }
    };

    const handle2FAToggle = async () => {
        setLoading2FA(true);
        setMessage({ type: '', text: '' });

        try {
            if (twoFactorEnabled) {
                await apiService.disable2FA();
                setTwoFactorEnabled(false);
                setMessage({ type: 'success', text: 'تم تعطيل المصادقة الثنائية بنجاح' });
            } else {
                await apiService.enable2FA();
                setTwoFactorEnabled(true);
                setMessage({ type: 'success', text: 'تم تفعيل المصادقة الثنائية بنجاح. سيتم إرسال رمز التحقق إلى بريدك الإلكتروني عند تسجيل الدخول.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'حدث خطأ أثناء تحديث إعدادات المصادقة الثنائية' });
        } finally {
            setLoading2FA(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        }
    };

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
            <h2>إعدادات النظام</h2>

            {/* 2FA Section */}
            <div className="settings-section">
                <h3>إعدادات الأمان</h3>
                <div className="settings-grid">
                    <div className="setting-item" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="twoFactor">المصادقة الثنائية (2FA):</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={handle2FAToggle}
                                disabled={loading2FA}
                                className={`toggle-button ${twoFactorEnabled ? 'enabled' : 'disabled'}`}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: loading2FA ? 'not-allowed' : 'pointer',
                                    backgroundColor: twoFactorEnabled ? '#10b981' : '#6b7280',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {loading2FA ? 'جاري التحديث...' : (twoFactorEnabled ? 'مفعل ✓' : 'معطل ✗')}
                            </button>
                            <small style={{ color: '#666', fontSize: '13px' }}>
                                {twoFactorEnabled 
                                    ? 'سيتم إرسال رمز التحقق إلى بريدك الإلكتروني عند تسجيل الدخول'
                                    : 'قم بتفعيل المصادقة الثنائية لحماية حسابك'}
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Settings Section */}
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

            {message.text && (
                <div className={`message-alert ${message.type}`} style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
                }}>
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default Settings;