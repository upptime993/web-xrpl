import getDB from './_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const SECRET_KEY = process.env.JWT_SECRET || 'xrpl2024-secret-key-super-rahasia';

export default async function handler(req, res) {
    const { method } = req;

    // --- GET: CEK STATUS LOGIN ---
    if (method === 'GET') {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.xrpl_token;
        if (token) {
            try { 
                const currentUser = jwt.verify(token, SECRET_KEY);
                return res.status(200).json({ success: true, loggedIn: true, user: currentUser });
            } catch (e) {}
        }
        return res.status(200).json({ success: true, loggedIn: false });
    }

    // --- POST: PROSES LOGIN ---
    if (method === 'POST') {
        try {
            // 1. Tangkap data dengan sangat hati-hati (Vercel Fix)
            let body = req.body;
            if (typeof body === 'string') {
                body = JSON.parse(body); // Ubah teks jadi JSON jika Vercel salah baca
            }
            
            const username = body.username;
            const password = body.password;

            // Jika form tidak mengirim apa-apa
            if (!username || !password) {
                return res.status(400).json({ success: false, message: 'System: Username atau Password kosong terbaca di server!' });
            }

            const db = await getDB();
            
            // 2. Cari Admin dulu
            let user = await db.collection('users').findOne({ username: username });
            let role = 'admin';
            
            // 3. Kalau bukan admin, cari di murid
            if (!user) {
                user = await db.collection('students').findOne({ username: username });
                role = 'student';
            }

            // 4. Jika user ditemukan
            if (user) {
                const isPasswordValid = bcrypt.compareSync(password, user.password);
                if (isPasswordValid) {
                    // Login Sukses!
                    const userData = { id: user._id, username: user.username, full_name: user.full_name || user.name, role };
                    const newToken = jwt.sign(userData, SECRET_KEY, { expiresIn: '7d' });
                    
                    res.setHeader('Set-Cookie', serialize('xrpl_token', newToken, { path: '/', httpOnly: true, maxAge: 604800 }));
                    return res.status(200).json({ success: true, message: 'Login berhasil', user: userData });
                } else {
                    return res.status(401).json({ success: false, message: 'System: Password yang kamu masukkan salah!' });
                }
            } else {
                return res.status(404).json({ success: false, message: `System: Username '${username}' tidak ditemukan di database MongoDB!` });
            }

        } catch (error) {
            // Menangkap jika ada error kodingan
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE: LOGOUT ---
    if (method === 'DELETE') {
        res.setHeader('Set-Cookie', serialize('xrpl_token', '', { path: '/', maxAge: -1 }));
        return res.status(200).json({ success: true, message: 'Logout berhasil.' });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
