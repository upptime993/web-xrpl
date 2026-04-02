import getDB from './_db.js';
import bcrypt from 'bcryptjs';
import { sendSuccess, sendError } from './_helpers.js';
import { setupRateLimitIndex } from './_rateLimit.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return sendError(res, 'Method Not Allowed', 405);
    }

    try {
        const db = await getDB();
        const users = db.collection('users');

        // 1. Cek apakah admin sudah pernah dibuat
        const existingAdmin = await users.findOne({ username: 'admin' });
        if (existingAdmin) {
            return sendSuccess(res, { message: 'Akun Admin sudah ada di database!' });
        }

        // 2. Buat admin pertama
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await users.insertOne({
            username: 'admin',
            password: hashedPassword,
            full_name: 'Administrator Kelas',
            role: 'admin',
            created_at: new Date()
        });

        // 3. Setup MongoDB indexes untuk performa
        await Promise.allSettled([
            // Index untuk students
            db.collection('students').createIndex({ username: 1 }, { unique: true, sparse: true }),
            db.collection('students').createIndex({ sort_order: 1 }),
            db.collection('students').createIndex({ is_active: 1 }),

            // Index untuk gallery
            db.collection('gallery').createIndex({ created_at: -1 }),
            db.collection('gallery').createIndex({ category: 1 }),

            // Index untuk guestbook
            db.collection('guestbook').createIndex({ created_at: -1 }),
            db.collection('guestbook').createIndex({ ip: 1 }),

            // Index untuk projects
            db.collection('projects').createIndex({ created_at: -1 }),

            // Index untuk snapshots
            db.collection('snapshots').createIndex({ student_id: 1 }),
            db.collection('snapshots').createIndex({ created_at: -1 }),

            // Index untuk struktur
            db.collection('struktur').createIndex({ level: 1, sort_order: 1 }),

            // TTL index untuk rate limits
            setupRateLimitIndex()
        ]);

        return sendSuccess(res, {
            message: '✅ BERHASIL! Akun Admin pertama telah dibuat. Username: admin | Password: admin123. Database indexes telah dibuat.'
        });

    } catch (error) {
        console.error('Setup error:', error);
        return sendError(res, 'Server Error: ' + error.message);
    }
}
