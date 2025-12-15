/**
 * Main Module - Application entry point
 */

import { connectDevice } from './device.js';
import { loadLogs, exportCSV } from './logs.js';
import { loadUsers } from './users.js';
import { applyFilters } from './filters.js';
import { switchTab } from './tabs.js';

// Make functions globally available for HTML onclick handlers
window.connectDevice = connectDevice;
window.loadLogs = loadLogs;
window.loadUsers = loadUsers;
window.applyFilters = applyFilters;
window.switchTab = switchTab;
window.exportCSV = exportCSV;

// Initialize application when DOM is ready
window.onload = () => {
    loadLogs();
};
