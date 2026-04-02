// ============================================================
// _rateLimit.js — Rate Limiter (MongoDB-backed for serverless)
// ============================================================
import getDB from './_db.js';
import { sendError } from './_helpers.js';

/**
 * Cek rate limit berdasarkan IP dan endpoint (MongoDB backed)
 * Cocok untuk Vercel serverless yang tidak share memory antar request
 * 
 * @param {object} req - Request object
 * @param {string} endpoint - Nama endpoint (e.g. 'guestbook-post', 'login')
 * @param {number} maxRequests - Maks request dalam window (default 30)
 * @param {number} windowMs - Window dalam ms (default 60000 = 1 menit)
 * @returns {Promise<boolean>} true jika BOLEH lanjut, false jika RATE LIMITED
 */
export async function checkRateLimit(req, endpoint, maxRequests = 30, windowMs = 60000) {
    try {
        const db = await getDB();
        const collection = db.collection('rate_limits');
        const ip = getClientIp(req);
        const key = `${ip}:${endpoint}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Hapus record lama yang sudah expired
        await collection.deleteMany({
            key,
            timestamp: { $lt: windowStart }
        });

        // Hitung request dalam window
        const count = await collection.countDocuments({
            key,
            timestamp: { $gte: windowStart }
        });

        if (count >= maxRequests) {
            return false; // Rate limited
        }

        // Catat request baru
        await collection.insertOne({
            key,
            timestamp: now,
            createdAt: new Date() // TTL index purpose
        });

        return true; // Boleh lanjut
    } catch (error) {
        // Jika rate limit check gagal, biarkan request lewat
        // (lebih baik allow daripada block user karena error internal)
        console.error('Rate limit check error:', error.message);
        return true;
    }
}

/**
 * Middleware wrapper: cek rate limit dan kirim 429 jika terlalu banyak
 * 
 * @param {object} req - Request object  
 * @param {object} res - Response object
 * @param {string} endpoint - Nama endpoint
 * @param {number} maxRequests - Maks request (default 30)
 * @param {number} windowMs - Window dalam ms (default 60000)
 * @returns {Promise<boolean>} true jika BOLEH lanjut
 */
export async function rateLimit(req, res, endpoint, maxRequests = 30, windowMs = 60000) {
    const allowed = await checkRateLimit(req, endpoint, maxRequests, windowMs);
    if (!allowed) {
        sendError(res, 'Terlalu banyak request. Coba lagi nanti.', 429);
        return false;
    }
    return true;
}

/**
 * Ambil IP client dari header (support proxy/Vercel)
 */
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

/**
 * Setup TTL index pada rate_limits collection (panggil sekali saat setup)
 * Ini akan auto-delete documents setelah 2 menit
 */
export async function setupRateLimitIndex() {
    try {
        const db = await getDB();
        await db.collection('rate_limits').createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: 120 }
        );
    } catch (error) {
        console.error('Failed to create rate limit TTL index:', error.message);
    }
}
