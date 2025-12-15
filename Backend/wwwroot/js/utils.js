/**
 * Utility Module - Common helper functions
 */

/**
 * Show error message to user
 * @param {string} msg - Error message to display
 */
export function showError(msg) {
    const errorDiv = document.getElementById('errorMsg');
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

/**
 * Show loading state in a container
 * @param {string} containerId - ID of the container element
 * @param {string} message - Loading message to display
 */
export function showLoading(containerId, message = 'جاري التحميل...') {
    const content = document.getElementById(containerId);
    content.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Show empty state in a container
 * @param {string} containerId - ID of the container element
 * @param {string} message - Empty state message
 */
export function showEmptyState(containerId, message) {
    const content = document.getElementById(containerId);
    content.innerHTML = `<div class="loading"><p>${message}</p></div>`;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}
