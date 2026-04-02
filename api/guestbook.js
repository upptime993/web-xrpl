import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { sendSuccess, sendError, parseBody, isValidObjectId, getPagination } from './_helpers.js';
import { requireAdmin } from './_auth.js';
import { rateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('guestbook');

    // --- GET: Ambil semua pesan (public, dengan pagination) ---
    if (req.method === 'GET') {
        try {
            const pagination = getPagination(req.query);
            const [messages, total] = await Promise.all([
                collection.find({}).sort({ created_at: -1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
                collection.countDocuments({})
            ]);

            const formatted = messages.map(m => ({
                ...m,
                id: m._id.toString(),
                date: m.created_at
                    ? new Date(m.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                        timeZone: 'Asia/Jakarta'
                    })
                    : '-'
            }));

            return sendSuccess(res, {
                data: formatted,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                    totalPages: Math.ceil(total / pagination.limit)
                }
            });
        } catch (error) {
            console.error('Guestbook GET error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- POST: Kirim pesan baru (public, rate limited) ---
    if (req.method === 'POST') {
        // Rate limit: max 5 messages per minute
        const allowed = await rateLimit(req, res, 'guestbook-post', 5, 60000);
        if (!allowed) return;

        try {
            const body = parseBody(req);
            const { name, text } = body;

            if (!name || !name.trim()) {
                return sendError(res, 'Nama wajib diisi', 400);
            }
            if (!text || !text.trim()) {
                return sendError(res, 'Pesan wajib diisi', 400);
            }
            if (text.length > 500) {
                return sendError(res, 'Pesan terlalu panjang (maks 500 karakter)', 400);
            }
            if (name.length > 80) {
                return sendError(res, 'Nama terlalu panjang (maks 80 karakter)', 400);
            }

            const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.socket?.remoteAddress || 'unknown';

            // Cek jumlah pesan dari IP ini (maks 5 per device)
            const ipCount = await collection.countDocuments({ ip: userIp });
            if (ipCount >= 5) {
                return sendError(res, 'Batas maksimal 5 pesan per perangkat telah tercapai. Terima kasih partisipasinya!', 429);
            }

            const newMsg = {
                name: name.substring(0, 80).trim(),
                text: text.substring(0, 500).trim(),
                ip: userIp,
                created_at: new Date()
            };

            const result = await collection.insertOne(newMsg);
            return sendSuccess(res, {
                message: 'Pesan berhasil dikirim!',
                id: result.insertedId.toString()
            }, 201);
        } catch (error) {
            console.error('Guestbook POST error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- DELETE: Hapus pesan (Admin Only) ---
    if (req.method === 'DELETE') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        const { id, all } = req.query;
        try {
            if (all === 'true') {
                await collection.deleteMany({});
                return sendSuccess(res, { message: 'Semua pesan berhasil dihapus' });
            }
            if (!id) return sendError(res, 'ID pesan diperlukan', 400);
            if (!isValidObjectId(id)) return sendError(res, 'ID tidak valid', 400);

            await collection.deleteOne({ _id: new ObjectId(id) });
            return sendSuccess(res, { message: 'Pesan berhasil dihapus' });
        } catch (error) {
            console.error('Guestbook DELETE error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    return sendError(res, 'Method Not Allowed', 405);
}
