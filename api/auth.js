import getDB from './_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const SECRET_KEY = process.env.JWT_SECRET || 'xrpl2024-secret-key-super-rahasia';

export default async function handler(req, res) {
    const db = await getDB();
    const { method } = req;

    // Ambil token dari cookie
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.xrpl_token;
    let currentUser = null;

    if (token) {
        try { currentUser = jwt.verify(token, SECRET_KEY); } catch (e) {}
    }

    if (method === 'GET') {
        if (currentUser) {
            return res.status(200).json({ success: true, loggedIn: true, user: currentUser });
        }
        return res.status(200).json({ success: true, loggedIn: false });
    }

    if (method === 'POST') {
        const { username, password } = req.body;
        
        // Cari di tabel admin dulu, kalau tidak ada cari di murid
        let user = await db.collection('users').findOne({ username });
        let role = 'admin';
        
        if (!user) {
            user = await db.collection('students').findOne({ username });
            role = 'student';
        }

        if (user && bcrypt.compareSync(password, user.password)) {
            const userData = { id: user._id, username: user.username, full_name: user.name || user.full_name, role };
            const newToken = jwt.sign(userData, SECRET_KEY, { expiresIn: '7d' });
            
            res.setHeader('Set-Cookie', serialize('xrpl_token', newToken, { path: '/', httpOnly: true, maxAge: 604800 }));
            return res.status(200).json({ success: true, message: 'Login berhasil', user: userData });
        }
        return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    if (method === 'DELETE') {
        res.setHeader('Set-Cookie', serialize('xrpl_token', '', { path: '/', maxAge: -1 }));
        return res.status(200).json({ success: true, message: 'Logout berhasil.' });
    }

    res.status(405).json({ message: 'Method Not Allowed' });
}
