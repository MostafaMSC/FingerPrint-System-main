/**
 * Tabs Module - Handles tab switching
 */

import { loadLogs } from './logs.js';
import { loadUsers, getAllUsersData } from './users.js';
import { getAllLogs } from './filters.js';

/**
 * Switch between tabs
 * @param {string} tab - Tab name ('logs' or 'users')
 */
export function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // Hide all tab content
    document.getElementById('logsTab').classList.add('hidden');
    document.getElementById('usersTab').classList.add('hidden');

    // Show selected tab and load data if needed
    if (tab === 'logs') {
        document.getElementById('logsTab').classList.remove('hidden');
        if (getAllLogs().length === 0) {
            loadLogs();
        }
    } else if (tab === 'users') {
        document.getElementById('usersTab').classList.remove('hidden');
        if (getAllUsersData().length === 0) {
            loadUsers();
        }
    }
}
