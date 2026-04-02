import getDB from './_db.js';
import { verifyAuth } from './_auth.js';
import { ObjectId } from 'mongodb';

// API untuk Guestbook/Pesan Singkat — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('guestbook');

    // --- GET (Public): Ambil semua pesan ---
    if (req.method === 'GET') {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            const messages = await collection.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
            const total = await collection.countDocuments({});

            const formatted = messages.map(m => ({
                ...m,
                id: m._id.toString(),
                date: m.created_at
                    ? new Date(m.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '-'
            }));

            return res.status(200).json({ 
                success: true, 
                data: formatted,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        } catch (error) {
            console.error("GET /api/guestbook error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- POST (Public): Kirim pesan baru ---
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { name, text } = body;
            if (!name || !text) return res.status(400).json({ success: false, error: 'Nama dan pesan wajib diisi' });
            if (text.length > 500) return res.status(400).json({ success: false, error: 'Pesan terlalu panjang (maks 500 karakter)' });

            const userIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

            // Cek jumlah pesan dari IP ini
            const ipCount = await collection.countDocuments({ ip: userIp });
            if (ipCount >= 2) {
                return res.status(429).json({ success: false, error: 'Batas maksimal 2 pesan per perangkat telah tercapai. Terimakasih partisipasinya!' });
            }

            // Sanitasi input dasar (cegah XSS injection sederhana)
            const cleanName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 80).trim();
            const cleanText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 500).trim();

            const newMsg = {
                name: cleanName,
                text: cleanText,
                ip: userIp,
                created_at: new Date()
            };

            const result = await collection.insertOne(newMsg);
            return res.status(201).json({
                success: true,
                message: 'Pesan berhasil dikirim!',
                data: { id: result.insertedId.toString(), ...newMsg }
            });
        } catch (error) {
            console.error("POST /api/guestbook error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE (Admin Only): Hapus pesan ---
    if (req.method === 'DELETE') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        const { id, all } = req.query;
        try {
            if (all === 'true') {
                await collection.deleteMany({});
                return res.status(200).json({ success: true, message: 'Semua pesan berhasil dihapus' });
            }
            if (!id) return res.status(400).json({ success: false, error: 'ID pesan diperlukan' });
            
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Pesan berhasil dihapus' });
        } catch (error) {
            console.error("DELETE /api/guestbook error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
