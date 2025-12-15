/**
 * Users Module - Handles users display and management
 */

import { fetchUsers, parseLogsData } from './api.js';
import { showError, showLoading, showEmptyState } from './utils.js';
import { getAllLogs } from './filters.js';

let allUsers = [];

/**
 * Load users from the API
 */
export async function loadUsers() {
    showLoading('usersContent');

    try {
        const result = await fetchUsers();

        if (result.success) {
            const logs = parseLogsData(result.data);
            allUsers = [...new Set(logs.map(log => log.userId))].sort((a, b) => {
                return parseInt(a) - parseInt(b);
            });
            displayUsers();
        } else {
            showError(result.data);
            showEmptyState('usersContent', 'فشل في تحميل البيانات');
        }
    } catch (err) {
        showError('فشل الاتصال بالخادم');
        showEmptyState('usersContent', 'فشل الاتصال بالخادم');
    }
}

/**
 * Display users in a grid
 */
export function displayUsers() {
    const content = document.getElementById('usersContent');

    if (allUsers.length === 0) {
        showEmptyState('usersContent', 'لا يوجد موظفين');
        return;
    }

    const logs = getAllLogs();
    let html = '<div class="users-grid">';

    allUsers.forEach(userId => {
        const userLogs = logs.filter(log => log.userId === userId);
        html += `
            <div class="user-card">
                <div class="user-icon">${userId}</div>
                <h3>موظف ${userId}</h3>
                <p style="color: #666; margin-top: 10px;">${userLogs.length} سجل</p>
            </div>
        `;
    });

    html += '</div>';
    content.innerHTML = html;
}

/**
 * Get all users
 * @returns {Array} All user IDs
 */
export function getAllUsersData() {
    return allUsers;
}
