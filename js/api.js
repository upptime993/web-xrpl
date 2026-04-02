/**
 * Standardized Fetch wrapper
 * Automatically handles JSON parsing, error catching, loaders, and standard success/error formats.
 */
async function apiFetch(url, options = {}) {
    if(window.showLoader) window.showLoader();
    try {
        const token = localStorage.getItem('xrpl_token');
        if (token) {
            options.headers = options.headers || {};
            if (!options.headers['Authorization']) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        const response = await fetch(url, options);
        let data;
        
        try {
            data = await response.json();
        } catch (e) {
            if(window.hideLoader) window.hideLoader();
            if(window.showToast) window.showToast('Response dari server bukan JSON valid', 'error');
            return { success: false, error: 'Invalid JSON response' };
        }

        if(window.hideLoader) window.hideLoader();

        if (!response.ok || !data.success) {
            if(window.showToast) window.showToast(data.error || data.message || 'Terjadi kesalahan sistem', 'error');
            return { success: false, error: data.error || data.message };
        }

        return data; // returns { success: true, data: ..., ... }
    } catch (e) {
        if(window.hideLoader) window.hideLoader();
        if(window.showToast) window.showToast('Koneksi terputus ke server', 'error');
        return { success: false, error: 'Koneksi terputus' };
    }
}
window.apiFetch = apiFetch;
