import getDB from './_db.js';
import bcrypt from 'bcryptjs';
import { serialize, parse } from 'cookie';
import { sendSuccess, sendError, parseBody } from './_helpers.js';
import { verifyToken, requireAdmin, generateToken } from './_auth.js';
import { rateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
    const { method } = req;

    // --- GET: CEK STATUS LOGIN ---
    if (method === 'GET') {
        const user = verifyToken(req);
        if (user) {
            return sendSuccess(res, { loggedIn: true, user });
        }
        return sendSuccess(res, { loggedIn: false });
    }

    // --- POST: PROSES LOGIN ---
    if (method === 'POST') {
        // Rate limit: max 5 login attempts per minute
        const allowed = await rateLimit(req, res, 'login', 5, 60000);
        if (!allowed) return;

        try {
            const body = parseBody(req);
            const { username, password } = body;

            if (!username || !password) {
                return sendError(res, 'Username dan password wajib diisi', 400);
            }

            const db = await getDB();

            // Cari di users (admin) dulu
            let user = await db.collection('users').findOne({ username });
            let role = 'admin';

            // Kalau bukan admin, cari di students
            if (!user) {
                user = await db.collection('students').findOne({ username });
                role = 'student';
            }

            if (!user) {
                return sendError(res, `Username '${username}' tidak ditemukan`, 404);
            }

            const isPasswordValid = bcrypt.compareSync(password, user.password);
            if (!isPasswordValid) {
                return sendError(res, 'Password yang kamu masukkan salah', 401);
            }

            // Login Sukses — generate JWT
            const userData = {
                id: user._id.toString(),
                username: user.username,
                full_name: user.full_name || user.name,
                role
            };
            const token = generateToken(userData);

            res.setHeader('Set-Cookie', serialize('xrpl_token', token, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 604800 // 7 days
            }));

            return sendSuccess(res, { message: 'Login berhasil', user: userData });

        } catch (error) {
            console.error('Login error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- PUT: RESET PASSWORD MURID (Admin Only) ---
    if (method === 'PUT') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        // Rate limit: max 10 resets per minute
        const allowed = await rateLimit(req, res, 'reset-password', 10, 60000);
        if (!allowed) return;

        try {
            const body = parseBody(req);
            const { username, newPassword } = body;

            if (!username || !newPassword) {
                return sendError(res, 'Username dan password baru wajib diisi', 400);
            }
            if (newPassword.length < 6) {
                return sendError(res, 'Password minimal 6 karakter', 400);
            }

            const db = await getDB();
            const student = await db.collection('students').findOne({ username });
            if (!student) {
                return sendError(res, `Username '${username}' tidak ditemukan`, 404);
            }

            const hashedPassword = bcrypt.hashSync(newPassword, 10);
            await db.collection('students').updateOne(
                { username },
                { $set: { password: hashedPassword, updated_at: new Date() } }
            );

            return sendSuccess(res, { message: `Password @${username} berhasil direset!` });
        } catch (error) {
            console.error('Reset password error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- DELETE: LOGOUT ---
    if (method === 'DELETE') {
        res.setHeader('Set-Cookie', serialize('xrpl_token', '', {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: -1
        }));
        return sendSuccess(res, { message: 'Logout berhasil' });
    }

    return sendError(res, 'Method Not Allowed', 405);
}
