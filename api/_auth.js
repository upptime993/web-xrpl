import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const SECRET_KEY = process.env.JWT_SECRET || 'xrpl2024-secret-key-super-rahasia';

/**
 * Middleware dasar untuk memverifikasi token JWT dari Cookie.
 * Mengembalikan data user jika valid, atau mengirim respons 401 jika gagal.
 * @param {Object} req - HTTP Request API Vercel/Next
 * @param {Object} res - HTTP Response API Vercel/Next
 * @param {Array<String>} allowedRoles - Array role yang diizinkan (misal: ['admin'], ['admin', 'student'])
 * @returns {Object|null} - Mengembalikan object user jika sukses, atau null jika gagal.
 */
export function verifyAuth(req, res, allowedRoles = []) {
    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.xrpl_token;

        if (!token) {
            res.status(401).json({ success: false, message: 'Harap login terlebih dahulu' });
            return null;
        }

        const currentUser = jwt.verify(token, SECRET_KEY);

        if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
            res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.' });
            return null;
        }

        return currentUser; // Sukses!
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa. Silakan login ulang.' });
        return null;
    }
}
