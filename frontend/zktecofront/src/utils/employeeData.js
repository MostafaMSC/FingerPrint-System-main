// Employee data management utility for localStorage

const STORAGE_KEY = 'employeeData';

/**
 * Get all employee data from localStorage
 * @returns {Object} Object with userId as keys
 */
export const getAllEmployeeData = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error reading employee data:', error);
        return {};
    }
};

/**
 * Get specific employee data
 * @param {string} userId - Employee user ID
 * @returns {Object} Employee data with overtimeHours and vacationDays
 */
export const getEmployeeData = (userId) => {
    const allData = getAllEmployeeData();
    return allData[userId] || {
        userId,
        overtimeHours: 0,
        vacationDays: 0
    };
};

/**
 * Save employee data
 * @param {string} userId - Employee user ID
 * @param {Object} data - Data to save { overtimeHours, vacationDays }
 */
export const saveEmployeeData = (userId, data) => {
    try {
        const allData = getAllEmployeeData();
        allData[userId] = {
            userId,
            overtimeHours: parseFloat(data.overtimeHours) || 0,
            vacationDays: parseInt(data.vacationDays) || 0,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        return true;
    } catch (error) {
        console.error('Error saving employee data:', error);
        return false;
    }
};

/**
 * Delete employee data
 * @param {string} userId - Employee user ID
 */
export const deleteEmployeeData = (userId) => {
    try {
        const allData = getAllEmployeeData();
        delete allData[userId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        return true;
    } catch (error) {
        console.error('Error deleting employee data:', error);
        return false;
    }
};

/**
 * Reset all employee data (for new month)
 */
export const resetAllEmployeeData = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
        return true;
    } catch (error) {
        console.error('Error resetting employee data:', error);
        return false;
    }
};
