import React, { useState, useEffect } from 'react';
import { getEmployeeData, saveEmployeeData } from '../../utils/employeeData';
import './EmployeeDetailModal.css';

const EmployeeDetailModal = ({ employee, onClose, settings }) => {
    const [employeeData, setEmployeeData] = useState({
        overtimeHours: 0,
        vacationDays: 0
    });

    useEffect(() => {
        if (employee) {
            const data = getEmployeeData(employee.userID);
            setEmployeeData(data);
        }
    }, [employee]);

    if (!employee) return null;

    const handleSave = () => {
        saveEmployeeData(employee.userID, employeeData);
        // Trigger refresh
        window.dispatchEvent(new Event('employeeDataUpdated'));
        onClose();
    };

    // Calculate adjusted hours
    const overtimeHours = parseFloat(employeeData.overtimeHours) || 0;
    const vacationDays = parseInt(employeeData.vacationDays) || 0;
    const vacationHours = vacationDays * settings.requiredDailyHours;
    const adjustedHours = employee.monthHours + overtimeHours + vacationHours;
    const monthlyRequired = settings.requiredDailyHours * settings.workingDaysPerMonth;
    const adjustedAchievement = monthlyRequired > 0 ? (adjustedHours / monthlyRequired) * 100 : 0;
    const adjustedDeduction = monthlyRequired > 0 ? Math.max(0, ((monthlyRequired - adjustedHours) / monthlyRequired) * 100) : 0;

    const getAchievementColor = (percent) => {
        if (percent >= 100) return '#27ae60';
        if (percent >= 80) return '#f39c12';
        return '#e74c3c';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2> تقرير الموظف التفصيلي</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Employee Info */}
                    <div className="info-section">
                        <h3>معلومات الموظف</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">معرف المستخدم:</span>
                                <span className="info-value">{employee.userID}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">الاسم:</span>
                                <span className="info-value">{employee.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Work Hours */}
                    <div className="info-section">
                        <h3>ساعات العمل</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">ساعات اليوم:</span>
                                <span className="info-value">{employee.todayHours} ساعة</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">ساعات الأسبوع:</span>
                                <span className="info-value">{employee.weeklyHours} ساعة</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">ساعات الشهر:</span>
                                <span className="info-value">{employee.monthHours} ساعة</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">المطلوب شهرياً:</span>
                                <span className="info-value">{employee.monthlyRequired} ساعة</span>
                            </div>
                        </div>
                    </div>

                    {/* Overtime */}
                    <div className="info-section">
                        <h3> ساعات الزمنيات</h3>
                        <div className="input-group">
                            <label>ساعات الزمنيات المأخوذة هذا الشهر:</label>
                            <input
                                type="number"
                                min="0"
                                max={settings.allowedOvertimeHours}
                                step="0.5"
                                value={employeeData.overtimeHours}
                                onChange={(e) => setEmployeeData(prev => ({
                                    ...prev,
                                    overtimeHours: parseFloat(e.target.value) || 0
                                }))}
                            />
                            <small>المسموح: {settings.allowedOvertimeHours} ساعة</small>
                        </div>
                        <div className="usage-bar">
                            <div
                                className="usage-fill"
                                style={{
                                    width: `${Math.min((overtimeHours / settings.allowedOvertimeHours) * 100, 100)}%`,
                                    backgroundColor: overtimeHours > settings.allowedOvertimeHours ? '#e74c3c' : '#3498db'
                                }}
                            ></div>
                        </div>
                        <p className="usage-text">
                            مستخدم: {overtimeHours} / {settings.allowedOvertimeHours} ساعة
                        </p>
                    </div>

                    {/* Vacation */}
                    <div className="info-section">
                        <h3> أيام الإجازات</h3>
                        <div className="input-group">
                            <label>أيام الإجازات المأخوذة هذا الشهر:</label>
                            <input
                                type="number"
                                min="0"
                                max={settings.allowedVacationDays}
                                value={employeeData.vacationDays}
                                onChange={(e) => setEmployeeData(prev => ({
                                    ...prev,
                                    vacationDays: parseInt(e.target.value) || 0
                                }))}
                            />
                            <small>المسموح: {settings.allowedVacationDays} يوم (كل يوم = {settings.requiredDailyHours} ساعة)</small>
                        </div>
                        <div className="usage-bar">
                            <div
                                className="usage-fill"
                                style={{
                                    width: `${Math.min((vacationDays / settings.allowedVacationDays) * 100, 100)}%`,
                                    backgroundColor: vacationDays > settings.allowedVacationDays ? '#e74c3c' : '#27ae60'
                                }}
                            ></div>
                        </div>
                        <p className="usage-text">
                            مستخدم: {vacationDays} / {settings.allowedVacationDays} يوم ({vacationHours.toFixed(2)} ساعة)
                        </p>
                    </div>

                    {/* Adjusted Calculations */}
                    <div className="info-section adjusted">
                        <h3>الحسابات المعدلة (بعد الزمنيات والإجازات)</h3>
                        <div className="adjusted-grid">
                            <div className="adjusted-item">
                                <span className="adjusted-label">إجمالي الساعات المعدلة:</span>
                                <span className="adjusted-value">{adjustedHours.toFixed(2)} ساعة</span>
                            </div>
                            <div className="adjusted-item">
                                <span className="adjusted-label">نسبة الإنجاز:</span>
                                <span className="adjusted-value" style={{ color: getAchievementColor(adjustedAchievement) }}>
                                    {adjustedAchievement.toFixed(2)}%
                                </span>
                            </div>
                            <div className="adjusted-item">
                                <span className="adjusted-label">نسبة الخصم:</span>
                                <span className="adjusted-value" style={{ color: adjustedDeduction > 0 ? '#e74c3c' : '#27ae60' }}>
                                    {adjustedDeduction.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                        <div className="calculation-breakdown">
                            <p>الحساب: {employee.monthHours} (ساعات العمل) + {overtimeHours} (زمنيات) + {vacationHours.toFixed(2)} (إجازات) = {adjustedHours.toFixed(2)} ساعة</p>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
                    <button className="btn btn-primary" onClick={handleSave}>حفظ التغييرات</button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailModal;
