const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5218/api';

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    getAuthHeaders() {
        const token = localStorage.getItem('accessToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async handleResponse(response) {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }

        return data;
    }

async register(payload) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await this.handleResponse(response);

    const accessToken = data.AccessToken || data.accessToken;
    const refreshToken = data.RefreshToken || data.refreshToken;

    if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    }

    return data;
}
    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await this.handleResponse(response);

        const accessToken = data.AccessToken || data.accessToken;
        const refreshToken = data.RefreshToken || data.refreshToken;

        if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        }

        return data;
    }

    async logout() {
        try {
            await fetch(`${this.baseUrl}/auth/logout`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const data = await this.handleResponse(response);

        const accessToken = data.AccessToken || data.accessToken;
        const newRefreshToken = data.RefreshToken || data.refreshToken;

        if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
        }

        return data;
    }

    isAuthenticated() {
        return !!localStorage.getItem('accessToken');
    }
}

export default new ApiService();
