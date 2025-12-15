/**
 * API Module - Handles all API calls to the backend
 */

const API_BASE = '/api/ZKPython';

/**
 * Parse logs data from the API response
 * @param {string} data - Raw data from API
 * @returns {Array} Parsed logs array
 */
export function parseLogsData(data) {
    if (!data || data.startsWith('ERROR')) {
        throw new Error(data || 'فشل في جلب البيانات');
    }

    const lines = data.split('\n').filter(line => line.trim());
    const logs = [];

    lines.forEach(line => {
        const match = line.match(/UserID:\s*(\d+),\s*Time:\s*(.+)/);
        if (match) {
            logs.push({
                userId: match[1],
                timestamp: match[2].trim()
            });
        }
    });

    return logs;
}

/**
 * Connect to the fingerprint device
 * @returns {Promise<Object>} API response
 */
export async function connectDevice() {
    const response = await fetch(`${API_BASE}/connect`);
    return await response.json();
}

/**
 * Fetch all attendance logs
 * @returns {Promise<Object>} API response
 */
export async function fetchLogs() {
    const response = await fetch(`${API_BASE}/logs`);
    return await response.json();
}

/**
 * Fetch all users
 * @returns {Promise<Object>} API response
 */
export async function fetchUsers() {
    const response = await fetch(`${API_BASE}/users`);
    return await response.json();
}
