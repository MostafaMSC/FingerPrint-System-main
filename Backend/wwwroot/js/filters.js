/**
 * Filters Module - Handles filtering logic for logs
 */

import { displayLogs } from './logs.js';

let allLogs = [];
let allUsers = [];

/**
 * Set the logs data for filtering
 * @param {Array} logs - Array of log objects
 */
export function setLogsData(logs) {
    allLogs = logs;
    allUsers = [...new Set(logs.map(log => log.userId))].sort((a, b) => {
        // Convert to numbers for proper sorting
        return parseInt(a) - parseInt(b);
    });
}

/**
 * Get all logs
 * @returns {Array} All logs
 */
export function getAllLogs() {
    return allLogs;
}

/**
 * Get all unique user IDs
 * @returns {Array} All user IDs
 */
export function getAllUsers() {
    return allUsers;
}

/**
 * Update the user filter dropdown
 */
export function updateUserFilter() {
    const select = document.getElementById('filterUser');
    const currentValue = select.value; // Save current selection

    select.innerHTML = '<option value="">كل الموظفين</option>';

    allUsers.forEach(userId => {
        const option = document.createElement('option');
        option.value = userId;
        option.textContent = `موظف ${userId}`;
        select.appendChild(option);
    });

    // Restore previous selection if it still exists
    if (currentValue && allUsers.includes(currentValue)) {
        select.value = currentValue;
    }
}

/**
 * Apply filters to logs and display filtered results
 */
export function applyFilters() {
    const dateFilter = document.getElementById('filterDate').value;
    const userFilter = document.getElementById('filterUser').value;

    const filtered = allLogs.filter(log => {
        // Fix: Ensure proper date matching
        const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter);

        // Fix: Ensure proper user ID matching (both are strings, so direct comparison works)
        const matchesUser = !userFilter || log.userId === userFilter;

        return matchesDate && matchesUser;
    });

    displayLogs(filtered);
}

/**
 * Get filtered logs based on current filter values
 * @returns {Array} Filtered logs
 */
export function getFilteredLogs() {
    const dateFilter = document.getElementById('filterDate').value;
    const userFilter = document.getElementById('filterUser').value;

    return allLogs.filter(log => {
        const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter);
        const matchesUser = !userFilter || log.userId === userFilter;
        return matchesDate && matchesUser;
    });
}
