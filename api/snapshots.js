import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { verifyAuth } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

// Matikan body parser bawaan agar bisa baca FormData
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('snapshots');

    // --- GET: Ambil snapshot (semua atau per student, dengan pagination) ---
    if (req.method === 'GET') {
        try {
            const { student_id } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20; // 20 per halaman
            const skip = (page - 1) * limit;

            const query = student_id ? { student_id: student_id } : {};
            const snapshots = await collection.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
            const total = await collection.countDocuments(query);

            // Format data agar konsisten
            const formatted = snapshots.map(s => ({
                ...s,
                id: s._id.toString(),
                likesCount: s.likes ? s.likes.length : (s.likesCount || 0),
                comments: s.comments || []
            }));

            return res.status(200).json({ 
                success: true, 
                data: formatted,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        } catch (error) {
            console.error("GET /api/snapshots error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- POST: Upload snapshot baru ATAU aksi like/comment ---
    if (req.method === 'POST') {
        const { action } = req.query;

        // Handle like/unlike (Public)
        if (action === 'like') {
            try {
                let body = req.body;
                if (typeof body === 'string') body = JSON.parse(body);
                const { snapshot_id } = body;

                // Gunakan IP
                const userIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

                const snap = await collection.findOne({ _id: new ObjectId(snapshot_id) });
                if (!snap) return res.status(404).json({ success: false, error: 'Snapshot tidak ditemukan' });

                const likes = snap.likes || [];
                const alreadyLiked = likes.includes(userIp);

                if (alreadyLiked) {
                    await collection.updateOne({ _id: new ObjectId(snapshot_id) }, { $pull: { likes: userIp } });
                    return res.status(200).json({ success: true, action: 'unliked', likesCount: likes.length - 1 });
                } else {
                    await collection.updateOne({ _id: new ObjectId(snapshot_id) }, { $push: { likes: userIp } });
                    return res.status(200).json({ success: true, action: 'liked', likesCount: likes.length + 1 });
                }
            } catch (error) {
                console.error("LIKE error:", error);
                return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
            }
        }

        // Handle komentar (Public with basic spam protection)
        if (action === 'comment') {
            try {
                let body = req.body;
                if (typeof body === 'string') body = JSON.parse(body);
                const { snapshot_id, name, text } = body;

                if (!name || !text) return res.status(400).json({ success: false, error: 'Nama dan komentar wajib diisi' });
                if (text.length > 200) return res.status(400).json({ success: false, error: 'Komentar terlalu panjang (maks 200 karakter)' });

                const cleanName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 50);
                const cleanText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 200);

                const newComment = {
                    name: cleanName,
                    text: cleanText,
                    date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                };

                await collection.updateOne(
                    { _id: new ObjectId(snapshot_id) },
                    { $push: { comments: newComment } }
                );

                return res.status(200).json({ success: true, message: 'Komentar berhasil ditambahkan', data: newComment });
            } catch (error) {
                console.error("COMMENT error:", error);
                return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
            }
        }

        // Handle upload snapshot baru (FormData dengan foto)
        // Handle upload snapshot baru (Auth admin & student)
        const user = verifyAuth(req, res, ['admin', 'student']);
        if (!user) return;

        try {
            // Parse multipart form data
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || '';

            // Ambil boundary dari content-type
            const boundaryMatch = contentType.match(/boundary=(.+)$/);
            if (!boundaryMatch) {
                return res.status(400).json({ success: false, error: 'Request bukan multipart/form-data' });
            }

            const boundary = boundaryMatch[1];
            const parts = parseMultipart(buffer, boundary);

            let studentId = null;
            let caption = '';
            let imageBase64 = null;
            let imageMimeType = 'image/jpeg';

            for (const part of parts) {
                const dispositionMatch = part.headers['content-disposition'] || '';
                const nameMatch = dispositionMatch.match(/name="([^"]+)"/);
                const partName = nameMatch ? nameMatch[1] : '';

                if (partName === 'caption') {
                    caption = part.body.toString('utf-8').trim();
                } else if (partName === 'student_id') {
                    studentId = part.body.toString('utf-8').trim();
                } else if (partName === 'image') {
                    imageMimeType = part.headers['content-type'] || 'image/jpeg';
                    const base64Str = part.body.toString('base64');
                    if (base64Str.length > 5 * 1024 * 1024 * 1.33) {
                       return res.status(400).json({ success: false, error: 'Foto melebihi batas 5MB' });
                    }
                    imageBase64 = `data:${imageMimeType};base64,${base64Str}`;
                }
            }

            if (!imageBase64) return res.status(400).json({ success: false, error: 'File gambar tidak ditemukan' });
            if (!studentId) return res.status(400).json({ success: false, error: 'student_id diperlukan' });

            // Upload ke Cloudinary
            const uploadResult = await uploadToCloudinary(imageBase64, 'xrpl_snapshots');

            const newSnapshot = {
                student_id: studentId,
                caption: caption.replace(/</g, "&lt;").replace(/>/g, "&gt;") || 'Snapshot',
                image_url: uploadResult.secure_url,
                likes: [],
                comments: [],
                created_at: new Date()
            };

            const result = await collection.insertOne(newSnapshot);
            return res.status(201).json({
                success: true,
                message: 'Snapshot berhasil diunggah',
                data: { id: result.insertedId.toString(), ...newSnapshot }
            });
        } catch (error) {
            console.error("UPLOAD SNAPSHOT error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE: Hapus snapshot (Admin & Student) ---
    if (req.method === 'DELETE') {
        const user = verifyAuth(req, res, ['admin', 'student']);
        if (!user) return;

        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, error: 'ID snapshot diperlukan' });

        try {
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Snapshot berhasil dihapus' });
        } catch (error) {
            console.error("DELETE SNAPSHOT error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    res.status(405).json({ success: false, error: 'Method Not Allowed' });
}

// Helper: parse manual multipart/form-data
function parseMultipart(buffer, boundary) {
    const parts = [];
    const boundaryBuf = Buffer.from('--' + boundary);
    const endBoundaryBuf = Buffer.from('--' + boundary + '--');

    let start = 0;
    while (start < buffer.length) {
        const boundaryIdx = buffer.indexOf(boundaryBuf, start);
        if (boundaryIdx === -1) break;

        // Cek apakah ini boundary akhir
        const afterBoundary = boundaryIdx + boundaryBuf.length;
        if (buffer.slice(afterBoundary, afterBoundary + 2).toString() === '--') break;

        // Skip \r\n setelah boundary
        const headerStart = afterBoundary + 2;

        // Cari akhir headers (dua \r\n berturut-turut)
        const headerEndIdx = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
        if (headerEndIdx === -1) break;

        const headersRaw = buffer.slice(headerStart, headerEndIdx).toString('utf-8');
        const headers = {};
        headersRaw.split('\r\n').forEach(line => {
            const colonIdx = line.indexOf(':');
            if (colonIdx > -1) {
                const key = line.slice(0, colonIdx).trim().toLowerCase();
                headers[key] = line.slice(colonIdx + 1).trim();
            }
        });

        const bodyStart = headerEndIdx + 4;

        // Cari boundary berikutnya
        const nextBoundaryIdx = buffer.indexOf(boundaryBuf, bodyStart);
        const bodyEnd = nextBoundaryIdx === -1 ? buffer.length : nextBoundaryIdx - 2;

        parts.push({ headers, body: buffer.slice(bodyStart, bodyEnd) });
        start = nextBoundaryIdx === -1 ? buffer.length : nextBoundaryIdx;
    }

    return parts;
}
