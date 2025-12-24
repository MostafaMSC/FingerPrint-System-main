// Determine API base URL from env or infer from window location
const ENV_API_URL = process.env.REACT_APP_API_URL;
function inferApiUrl() {
    if (typeof window === 'undefined') return 'http://localhost:5830/api';
    const host = window.location.hostname;
    const proto = window.location.protocol; // includes ':'
    if (ENV_API_URL) return ENV_API_URL;
    if (host === 'localhost' || host === '127.0.0.1') return `${proto}//${host}:5830/api`;
    if (process.env.NODE_ENV === 'production') return '/api';
    return `${proto}//${host}:5830/api`;
}

const API_BASE_URL = ENV_API_URL || inferApiUrl();

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    processQueue(error, token = null) {
        this.failedQueue.forEach(prom => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });
        this.failedQueue = [];
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json'
        };
    }

    // New helper for all fetches to ensure credentials are sent
    async fetchWithCredentials(url, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: 'include' // Important for sending/receiving cookies
        };

        let response = await fetch(url, config);

        // If we get a 401 and this isn't a login/register/refresh request, try to refresh the token
        if (response.status === 401 &&
            !url.includes('/auth/login') &&
            !url.includes('/auth/register') &&
            !url.includes('/auth/refresh')) {

            if (this.isRefreshing) {
                // Wait for the refresh to complete
                return new Promise((resolve, reject) => {
                    this.failedQueue.push({ resolve, reject });
                }).then(() => {
                    // Retry the original request
                    return fetch(url, config);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            this.isRefreshing = true;

            try {
                await this.refreshToken();
                this.processQueue(null);
                this.isRefreshing = false;

                // Retry the original request
                response = await fetch(url, config);
            } catch (refreshError) {
                this.processQueue(refreshError, null);
                this.isRefreshing = false;

                // Redirect to login if refresh fails
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                throw refreshError;
            }
        }

        return response;
    }

    async handleResponse(response) {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }

        return data;
    }

    async register(payload) {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/register`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        return this.handleResponse(response);
    }

    async login(username, password) {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        return this.handleResponse(response);
    }

    async verifyOtp(userId, otp) {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({ userId, otp })
        });

        return this.handleResponse(response);
    }

    async logout() {
        try {
            await this.fetchWithCredentials(`${this.baseUrl}/auth/logout`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always redirect to login after logout
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    }

    async refreshToken() {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({}) // Refresh token is now in cookie
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        return this.handleResponse(response);
    }

    async isAuthenticated() {
        try {
            const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/me`, {
                method: 'GET'
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async getCurrentUser() {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/me`, {
            method: 'GET'
        });
        return this.handleResponse(response);
    }

    // ========================================
    // 🔐 2FA Management Methods
    // ========================================

    async get2FAStatus() {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/2fa-status`, {
            method: 'GET'
        });

        return this.handleResponse(response);
    }

    async enable2FA() {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/enable-2fa`, {
            method: 'POST'
        });

        return this.handleResponse(response);
    }

    async disable2FA() {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/disable-2fa`, {
            method: 'POST'
        });

        return this.handleResponse(response);
    }
}

export default new ApiService();