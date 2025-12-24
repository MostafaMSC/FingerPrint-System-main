import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../utils/api';
import './Auth.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Attempting login with username:', username);
            const response = await apiService.login(username, password);
            console.log('Login response:', response);

            // Check if 2FA is required (handle both camelCase and PascalCase)
            const requires2FA = response.requires2FA || response.Requires2FA || false;
            const returnedUserId = response.userId || response.UserId;
            
            console.log('2FA Check:', { requires2FA, returnedUserId, fullResponse: response });
            
            if (requires2FA === true) {
                console.log('2FA required for user:', returnedUserId);
                setShowOtp(true);
                setUserId(returnedUserId);
                setLoading(false);
                setError(''); // Clear any errors
                return;
            }

            // If no 2FA required, login is complete
            console.log('Login successful, no 2FA required');
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Verifying OTP for user:', userId);
            const response = await apiService.verifyOtp(userId, otp);
            console.log('OTP verification successful:', response);
            
            // Navigate to dashboard after successful OTP verification
            navigate('/dashboard');
        } catch (err) {
            console.error('OTP verification error:', err);
            setError(err.message || 'Invalid OTP. Please try again.');
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setShowOtp(false);
        setOtp('');
        setUserId(null);
        setError('');
        setPassword('');
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
                        <img 
                            style={{ 
                                width: '200px', 
                                height: '60px', 
                                backgroundColor: '#0c315d', 
                                borderRadius: '8px', 
                                padding: '0.2rem' 
                            }}
                            src="./logo-light.svg"
                            alt="Company Logo"
                            className="dashboard-logo"
                        />
                    </div>
                    <h1>{showOtp ? 'التحقق الثنائي' : 'تسجيل الدخول'}</h1>
                    <p>
                        {showOtp 
                            ? 'أدخل الرمز المرسل إلى بريدك الإلكتروني' 
                            : 'Sign in to your account to continue'}
                    </p>
                </div>

                <form onSubmit={showOtp ? handleOtpSubmit : handleSubmit} className="auth-form">
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

                    {!showOtp ? (
                        <>
                            <div className="form-group">
                                <label htmlFor="username">اسم المستخدم او البريد الالكتروني</label>
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
                                        placeholder="أدخل اسم المستخدم او البريد الالكتروني"
                                        required
                                        autoComplete="username"
                                        disabled={loading}
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
                                        placeholder="أدخل كلمة المرور"
                                        required
                                        autoComplete="current-password"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label htmlFor="otp">رمز التحقق (OTP)</label>
                                <div className="input-wrapper">
                                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <input
                                        type="text"
                                        id="otp"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="أدخل الرمز المكون من 6 أرقام"
                                        required
                                        maxLength="6"
                                        autoComplete="one-time-code"
                                        disabled={loading}
                                        autoFocus
                                    />
                                </div>
                                <small style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem', display: 'block' }}>
                                    تم إرسال الرمز إلى بريدك الإلكتروني. صالح لمدة 5 دقائق.
                                </small>
                            </div>

                            <button 
                                type="button" 
                                onClick={handleBackToLogin}
                                className="back-to-login-button"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#0c315d',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    fontSize: '14px',
                                    marginBottom: '1rem'
                                }}
                            >
                                ← العودة إلى تسجيل الدخول
                            </button>
                        </>
                    )}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                {showOtp ? 'جاري التحقق...' : 'يتم التسجيل...'}
                            </>
                        ) : (
                            <>
                                {showOtp ? 'تحقق من الرمز' : 'تسجيل الدخول'}
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                {!showOtp && (
                    <div className="auth-footer">
                        <p>انشاء حساب جديد? <button onClick={() => navigate('/register')} className="auth-link">Sign up</button></p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;