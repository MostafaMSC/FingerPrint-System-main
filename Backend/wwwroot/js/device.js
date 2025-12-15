/**
 * Device Module - Handles device connection
 */

import { connectDevice as apiConnectDevice } from './api.js';
import { showError } from './utils.js';

/**
 * Connect to the fingerprint device
 */
export async function connectDevice() {
    const btn = document.getElementById('connectBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جاري الاتصال...';

    try {
        const result = await apiConnectDevice();

        if (result.success) {
            alert('✅ تم الاتصال بالجهاز بنجاح');
        } else {
            showError(result.data);
        }
    } catch (err) {
        showError('فشل الاتصال بالجهاز');
    }

    btn.disabled = false;
    btn.textContent = '🔄 اتصال بالجهاز';
}
