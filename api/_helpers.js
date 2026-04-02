// ============================================================
// _helpers.js — Standarisasi Response & Utility Functions
// ============================================================

/**
 * Kirim response sukses dengan format standar
 * @param {object} res - Response object
 * @param {object} data - Data tambahan (akan di-spread ke response)
 * @param {number} statusCode - HTTP status code (default 200)
 */
export function sendSuccess(res, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        ...data
    });
}

/**
 * Kirim response error dengan format standar
 * @param {object} res - Response object
 * @param {string} message - Pesan error
 * @param {number} statusCode - HTTP status code (default 500)
 */
export function sendError(res, message = 'Terjadi kesalahan server', statusCode = 500) {
    return res.status(statusCode).json({
        success: false,
        message
    });
}

/**
 * Parse request body — handle string dan object
 * Vercel kadang mengirim body sebagai string
 * @param {object} req - Request object
 * @returns {object} Parsed body
 */
export function parseBody(req) {
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            body = {};
        }
    }
    return body || {};
}

/**
 * Escape HTML untuk mencegah XSS
 * @param {string} str - String yang akan di-escape
 * @returns {string} Escaped string
 */
export function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Validasi ObjectId MongoDB
 * @param {string} id - ID yang akan divalidasi
 * @returns {boolean}
 */
export function isValidObjectId(id) {
    return /^[a-fA-F0-9]{24}$/.test(String(id));
}

/**
 * Ambil parameter pagination dari query string
 * @param {object} query - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function getPagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
