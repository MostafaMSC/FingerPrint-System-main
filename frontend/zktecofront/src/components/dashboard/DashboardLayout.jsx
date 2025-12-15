import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../utils/api';
import './Dashboard.css';

const DashboardLayout = ({ activeTab, setActiveTab, children }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await apiService.logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            // Force logout even if API fails
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            navigate('/login');
        }
    };
    const menuItems = [
        { id: 'logs', label: 'سجلات الحضور', icon: '' },
        { id: 'users', label: ' الموظفين', icon: '' },
        { id: 'workHours', label: 'ساعات العمل', icon: '' },
        // { id: 'reports', label: 'التقارير', icon: '' },
        { id: 'settings', label: 'الإعدادات', icon: '' },
    ];

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="brand">
                    <img style={{ width: '200px', height: '60px', backgroundColor: '#0c315d', borderRadius: '8px', padding: '0.2rem' }}
                        src="./logo-light.svg" // **غَيِّر هذا المسار**
                        alt="Company Logo"
                        className="dashboard-logo"

                    />
                    {/* <span style={{ color: '#0c315d' }}>TWOKEYOK</span> */}

                </div>

                <nav className="nav-links">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}

                    <button
                        className="nav-item logout-button"
                        onClick={handleLogout}
                        style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        تسجيل خروج
                    </button>
                </nav>
            </aside>

            <main className="main-content">
                <header className="header">
                    <h1>لوحة التحكم</h1>
                    <p>نظرة عامة على الحضور والانصراف</p>
                </header>

                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
