import React, { useState } from 'react';
import DashboardLayout from './components/dashboard/DashboardLayout';
import StatsCards from './components/dashboard/StatsCards';
import LogsTable from './components/dashboard/LogsTable';
import UsersTable from './components/dashboard/UsersTable';
import WorkHoursTable from './components/dashboard/WorkHoursTable';
import Reports from './components/dashboard/Reports';
import Settings from './components/dashboard/Settings';
import './components/dashboard/Dashboard.css';

function ZKDashboard() {
    const [activeTab, setActiveTab] = useState('logs');
    const [selectedDevice, setSelectedDevice] = useState('172.16.1.40'); // Default to HQ

    const devices = [
        { name: 'Head Quarter', ip: '172.16.1.40' },
        { name: 'Dawoodi-Data Center', ip: '192.168.150.233' },
        { name: 'Customer Center', ip: '10.4.44.15' },
        { name: 'Cairo-Desaster Recovery', ip: '192.168.11.184' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'logs':
                return <LogsTable key={selectedDevice} deviceIp={selectedDevice} />;
            case 'users':
                return <UsersTable key={selectedDevice} deviceIp={selectedDevice} />;
            // case 'late':
            //     return <LateTable key={selectedDevice} deviceIp={selectedDevice} />;
            case 'workHours':
                return <WorkHoursTable key={selectedDevice} deviceIp={selectedDevice} />;
            case 'reports':
                return <Reports key={selectedDevice} deviceIp={selectedDevice} />;
            case 'settings':
                return <Settings key={selectedDevice} deviceIp={selectedDevice} />;
            default:
                return <LogsTable key={selectedDevice} deviceIp={selectedDevice} />;
        }
    };

    return (
        <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            {/* حاوية جديدة للوغو واختيار الجهاز لتنظيم المظهر */}
            <div className="header-controls-container" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(130deg, #0c315d -10.59%, #00b3a8 100.59%)',
                padding: '1rem', borderRadius: '8px', width: 'auto'
            }}>
                {/* 1. عنصر اللوغو (أضف مسار صورتك هنا) */}
                <img
                    src="./logo-light.svg" // **غَيِّر هذا المسار**
                    alt="Company Logo"
                    className="dashboard-logo"

                />

                {/* 2. عنصر اختيار الجهاز */}
                <div className="device-select-container">
                    <label htmlFor="device-select" style={{ color: 'white' }}></label>
                    <select
                        id="device-select"
                        className="device-select"
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                    >
                        {devices.map((d) => (
                            <option key={d.ip} value={d.ip}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <StatsCards key={`stats-${selectedDevice}`} deviceIp={selectedDevice} />
            <div style={{ marginTop: '2rem' }}>
                {renderContent()}
            </div>
        </DashboardLayout>
    );
}

export default ZKDashboard;