// ============================================================
// _auth.js — JWT Authentication Middleware
// ============================================================
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { sendError } from './_helpers.js';

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
    console.error('FATAL: JWT_SECRET environment variable is not set!');
}

/**
 * Verifikasi token JWT dari cookie
 * @param {object} req - Request object
 * @returns {object|null} User data jika valid, null jika tidak
 */
export function verifyToken(req) {
    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.xrpl_token;
        if (!token) return null;
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        // Token expired atau invalid
        return null;
    }
}

/**
 * Middleware: Wajib login (admin atau student)
 * Jika tidak terautentikasi, kirim 401 dan return null
 * Jika terautentikasi, return user data
 * 
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {object|null} User data atau null (sudah kirim response)
 */
export function requireAuth(req, res) {
    const user = verifyToken(req);
    if (!user) {
        sendError(res, 'Unauthorized: Silakan login terlebih dahulu', 401);
        return null;
    }
    return user;
}

/**
 * Middleware: Wajib admin
 * Jika bukan admin, kirim 403 dan return null
 * 
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {object|null} User data atau null (sudah kirim response)
 */
export function requireAdmin(req, res) {
    const user = verifyToken(req);
    if (!user) {
        sendError(res, 'Unauthorized: Silakan login terlebih dahulu', 401);
        return null;
    }
    if (user.role !== 'admin') {
        sendError(res, 'Forbidden: Hanya admin yang bisa mengakses endpoint ini', 403);
        return null;
    }
    return user;
}

/**
 * Generate JWT token baru
 * @param {object} userData - Data user untuk di-encode
 * @param {string} expiresIn - Durasi token (default 7d)
 * @returns {string} JWT token
 */
export function generateToken(userData, expiresIn = '7d') {
    return jwt.sign(userData, SECRET_KEY, { expiresIn });
}

export { SECRET_KEY };
