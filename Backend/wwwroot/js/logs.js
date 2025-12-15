/**
 * Logs Module - Handles logs display and management
 */

import { fetchLogs, parseLogsData } from './api.js';
import { showError, showLoading, showEmptyState } from './utils.js';
import { setLogsData, updateUserFilter, getAllLogs } from './filters.js';
import { updateStats } from './stats.js';

/**
 * Load logs from the API
 */
export async function loadLogs() {
    showLoading('logsContent');
    const dateFilter = document.getElementById('filterDate')?.value || '';
    const userFilter = document.getElementById('filterUser')?.value || '';

    try {
        const result = await fetchLogs();
        if (!result.success) {
            showError(result.data);
            showEmptyState('logsContent', 'فشل في تحميل البيانات');
            return;
        }

        const logs = parseLogsData(result.data);
        const users = [...new Set(logs.map(log => log.userId))].sort((a, b) => parseInt(a) - parseInt(b));

        setLogsData(logs);
        updateUserFilter();
        updateStats(logs, users);

        // Restore filter values
        if (dateFilter) document.getElementById('filterDate').value = dateFilter;
        if (userFilter) document.getElementById('filterUser').value = userFilter;

        // Apply filters if any were set, otherwise show all logs
        if (dateFilter || userFilter) {
            import('./filters.js').then(module => module.applyFilters());
        } else {
            displayLogs(logs);
        }
    } catch (err) {
        showError('فشل الاتصال بالخادم');
        showEmptyState('logsContent', 'فشل الاتصال بالخادم');
    }
}

/**
 * Display logs in a table
 * @param {Array} logs - Array of log objects to display
 */
export function displayLogs(logs) {
    const content = document.getElementById('logsContent');
    if (logs.length === 0) {
        showEmptyState('logsContent', 'لا توجد سجلات');
        return;
    }

    let html = '<table><thead><tr><th>#</th><th>رقم الموظف</th><th>التاريخ</th><th>الوقت</th></tr></thead><tbody>';
    logs.forEach((log, idx) => {
        const [date, time] = log.timestamp.split(' ');
        html += `<tr><td>${idx + 1}</td><td><strong>${log.userId}</strong></td><td>${date || ''}</td><td>${time || ''}</td></tr>`;
    });
    html += '</tbody></table>';
    content.innerHTML = html;
}

/**
 * Export logs to CSV
 */
export function exportCSV() {
    const logs = getAllLogs();
    if (logs.length === 0) {
        showError('لا توجد بيانات للتصدير');
        return;
    }

    let csv = 'User ID,Timestamp\n';
    logs.forEach(log => csv += `${log.userId},${log.timestamp}\n`);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
