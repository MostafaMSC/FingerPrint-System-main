/**
 * Statistics Module - Handles statistics calculations and display
 */

import { getTodayDate } from './utils.js';

/**
 * Update statistics display
 * @param {Array} logs - All logs
 * @param {Array} users - All unique user IDs
 */
export function updateStats(logs, users) {
    const today = getTodayDate();

    // Filter logs for today
    const todayLogs = logs.filter(log => log.timestamp.startsWith(today));

    // Get unique users who attended today
    const uniqueToday = new Set(todayLogs.map(log => log.userId)).size;

    // Update DOM elements
    document.getElementById('totalLogs').textContent = logs.length;
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('todayAttendance').textContent = uniqueToday;
    document.getElementById('todayLogs').textContent = todayLogs.length;
}
