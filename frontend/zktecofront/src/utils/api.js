const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.20.140.62:5830/api';

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
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

        return fetch(url, config);
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

    async logout() {
        await this.fetchWithCredentials(`${this.baseUrl}/auth/logout`, {
            method: 'POST'
        });
    }

    async refreshToken() {
        const response = await this.fetchWithCredentials(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            body: JSON.stringify({}) // Refresh token is now in cookie
        });

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
}

export default new ApiService();
