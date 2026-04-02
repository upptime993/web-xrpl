import getDB from './_db.js';

// API untuk Guestbook/Pesan Singkat — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('guestbook');

    // --- GET: Ambil semua pesan ---
    if (req.method === 'GET') {
        try {
            const messages = await collection.find({}).sort({ created_at: -1 }).toArray();
            const formatted = messages.map(m => ({
                ...m,
                id: m._id.toString(),
                date: m.created_at
                    ? new Date(m.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '-'
            }));
            return res.status(200).json({ success: true, data: formatted });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- POST: Kirim pesan baru ---
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { name, text } = body;
            if (!name || !text) {
                return res.status(400).json({ success: false, message: 'Nama dan pesan wajib diisi' });
            }
            if (text.length > 500) {
                return res.status(400).json({ success: false, message: 'Pesan terlalu panjang (maks 500 karakter)' });
            }

            const userIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

            // Cek jumlah pesan dari IP ini
            const ipCount = await collection.countDocuments({ ip: userIp });
            if (ipCount >= 2) {
                return res.status(429).json({ success: false, message: 'Batas maksimal 2 pesan per perangkat telah tercapai. Terimakasih partisipasinya!' });
            }

            const newMsg = {
                name: name.substring(0, 80).trim(),
                text: text.substring(0, 500).trim(),
                ip: userIp,
                created_at: new Date()
            };

            const result = await collection.insertOne(newMsg);
            return res.status(201).json({
                success: true,
                message: 'Pesan berhasil dikirim!',
                id: result.insertedId.toString()
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE: Hapus satu pesan ---
    if (req.method === 'DELETE') {
        const { id, all } = req.query;
        try {
            const { ObjectId } = await import('mongodb');
            if (all === 'true') {
                await collection.deleteMany({});
                return res.status(200).json({ success: true, message: 'Semua pesan berhasil dihapus' });
            }
            if (!id) return res.status(400).json({ success: false, message: 'ID pesan diperlukan' });
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Pesan berhasil dihapus' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
