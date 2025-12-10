import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const endpoints = {
    count: '/api/ZKPython/get-count',
    usersCount: '/api/ZKPython/get-users-count',
    today: '/api/ZKPython/get-today',
    late: '/api/ZKPython/get-late',
};

const StatsCards = ({ deviceIp }) => {
    const [stats, setStats] = useState({
        logsCount: 0,
        usersCount: 0,
        todayCount: 0,
        lateCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [lateTime, setLateTime] = useState('08:30');

    const fetchStats = React.useCallback(async (time) => {
        try {
            const [countRes, usersCountRes, todayRes, lateRes] = await Promise.all([
                axios.get(`${endpoints.count}?deviceIp=${deviceIp}`),
                axios.get(`${endpoints.usersCount}?deviceIp=${deviceIp}`),
                axios.get(`${endpoints.today}?deviceIp=${deviceIp}`),
                axios.get(`${endpoints.late}?time=${time}&deviceIp=${deviceIp}`),
            ]);

            setStats({
                logsCount: countRes.data.count || 0,
                usersCount: usersCountRes.data.usersCount || 0,
                todayCount: (todayRes.data.logs || []).length,
                lateCount: (lateRes.data.lateLogs || []).length,
            });
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setLoading(false);
        }
    }, [deviceIp]);

    useEffect(() => {
        // Load late time from settings
        const savedSettings = localStorage.getItem('workSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            const initialTime = parsed.workDayStart || '08:30';
            setLateTime(initialTime);
            fetchStats(initialTime);
        } else {
            fetchStats(lateTime);
        }

        // Listen for settings updates
        const handleSettingsUpdate = () => {
            const savedSettings = localStorage.getItem('workSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                const newLateTime = parsed.workDayStart || '08:30';
                setLateTime(newLateTime);
                fetchStats(newLateTime);
            }
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdate);

        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdate);
        };
    }, [deviceIp, fetchStats, lateTime]); // Re-fetch when device changes

    if (loading) {
        return (
            <div className="stats-grid">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="stat-card skeleton">
                        <div className="skeleton-text" style={{ width: '50%' }}></div>
                        <div className="skeleton-text" style={{ width: '30%', height: '2rem' }}></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-title">إجمالي السجلات</div>
                <div className="stat-value">{stats.logsCount}</div>
            </div>
            <div className="stat-card">
                <div className="stat-title">عدد الموظفين</div>
                <div className="stat-value">{stats.usersCount}</div>
            </div>
            <div className="stat-card">
                <div className="stat-title">سجلات اليوم</div>
                <div className="stat-value">{stats.todayCount}</div>
            </div>
            <div className="stat-card danger">
                <div className="stat-title">المتأخرين اليوم (بعد {lateTime})</div>
                <div className="stat-value">{stats.lateCount}</div>
            </div>
        </div>
    );
};

export default StatsCards;
