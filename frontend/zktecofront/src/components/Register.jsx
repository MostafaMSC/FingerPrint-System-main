import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../utils/api';
import './Auth.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [deviceIp, setDeviceIp] = useState('172.16.1.40');
    const [department, setDepartment] = useState('');
    const [section, setSection] = useState('');
    const [role, setRole] = useState(0); // Default to Employee

    const devices = [
        { name: 'Head Quarter', ip: '172.16.1.40' },
        { name: 'Dawoodi-Data Center', ip: '192.168.150.233' },
        { name: 'Customer Center', ip: '10.4.44.15' },
        { name: 'Dawoodi-Desaster Recovery', ip: '192.168.11.184' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            console.log('Registering user:', username);
            const response = await apiService.register({
                username,
                password,
                deviceIp: deviceIp || undefined,
                department: department || undefined,
                section: section || undefined,
                role // keep value matching backend enum names
            });
            console.log('Register response:', response);

            // Small delay to ensure localStorage updates before navigation
            setTimeout(() => navigate('/dashboard'), 150);
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="auth-blob blob-1"></div>
                <div className="auth-blob blob-2"></div>
                <div className="auth-blob blob-3"></div>
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                    <img style={{ width: '200px', height: '60px', backgroundColor: '#0c315d', borderRadius: '8px', padding: '0.2rem' }}
                        src="./logo-light.svg" // **غَيِّر هذا المسار**
                        alt="Company Logo"
                        className="dashboard-logo"

                    />
                    {/* <span style={{ color: '#0c315d' }}>TWOKEYOK</span> */}

                    </div>
                    <h1>أنشاء حساب</h1>
                    <p>Sign up to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="12" cy="16" r="1" fill="currentColor" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">اسم المستخدم</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ادخل اسم المستخدم"
                                required
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">كلمة المرور</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="ادخل كلمة المرور"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 11V6C9 4.93913 9.42143 3.92172 10.1716 3.17157C10.9217 2.42143 11.9391 2 13 2C14.0609 2 15.0783 2.42143 15.8284 3.17157C16.5786 3.92172 17 4.93913 17 6V11M5 11H21C21.5523 11 22 11.4477 22 12V21C22 21.5523 21.5523 22 21 22H5C4.44772 22 4 21.5523 4 21V12C4 11.4477 4.44772 11 5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="أعد إدخال كلمة المرور"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="role">الدور</label>
                        <div className="input-wrapper">
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value={0}>Employee</option>
                                <option value={1}>Manager</option>
                                <option value={2}>ِAdmin</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="deviceIp">مكان العمل</label>
                        <div className="input-wrapper">
                            <select
                                id="deviceIp"
                                value={deviceIp}
                                onChange={(e) => setDeviceIp(e.target.value)}
                            >
                                {devices.map((d) => (
                                    <option key={d.ip} value={d.ip}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="department">القسم</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                id="department"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="ادخل اسم القسم"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="section">الشعبة</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                id="section"
                                value={section}
                                onChange={(e) => setSection(e.target.value)}
                                placeholder="ادخل اسم الشعبة"
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                يتم أنشاء الحساب...
                            </>
                        ) : (
                            <>
                                اكمل التسجيل
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>تمتلك حساب بالفعل? <button onClick={() => navigate('/login')} className="auth-link">Sign in</button></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
