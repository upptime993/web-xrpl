import getDB from './_db.js';
import { ObjectId } from 'mongodb';

// Matikan body parser bawaan agar bisa baca FormData
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('snapshots');

    // --- GET: Ambil snapshot (semua atau per student) ---
    if (req.method === 'GET') {
        const { student_id, action } = req.query;
        const query = student_id ? { student_id: student_id } : {};
        const snapshots = await collection.find(query).sort({ created_at: -1 }).toArray();

        // Format data agar konsisten
        const formatted = snapshots.map(s => ({
            ...s,
            id: s._id.toString(),
            likesCount: s.likes ? s.likes.length : (s.likesCount || 0),
            comments: s.comments || []
        }));

        return res.status(200).json({ success: true, data: formatted });
    }

    // --- POST: Upload snapshot baru ATAU aksi like/comment ---
    if (req.method === 'POST') {
        const { action } = req.query;

        // Handle like/unlike
        if (action === 'like') {
            try {
                let body = req.body;
                if (typeof body === 'string') body = JSON.parse(body);
                const { snapshot_id } = body;

                // Gunakan IP atau session sederhana untuk identifikasi user
                const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

                const snap = await collection.findOne({ _id: new ObjectId(snapshot_id) });
                if (!snap) return res.status(404).json({ success: false, message: 'Snapshot tidak ditemukan' });

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
                return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
            }
        }

        // Handle komentar
        if (action === 'comment') {
            try {
                let body = req.body;
                if (typeof body === 'string') body = JSON.parse(body);
                const { snapshot_id, name, text } = body;

                if (!name || !text) return res.status(400).json({ success: false, message: 'Nama dan komentar wajib diisi' });
                if (text.length > 200) return res.status(400).json({ success: false, message: 'Komentar terlalu panjang (maks 200 karakter)' });

                const newComment = {
                    name: name.substring(0, 50),
                    text: text.substring(0, 200),
                    date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                };

                await collection.updateOne(
                    { _id: new ObjectId(snapshot_id) },
                    { $push: { comments: newComment } }
                );

                return res.status(200).json({ success: true, message: 'Komentar berhasil ditambahkan', comment: newComment });
            } catch (error) {
                return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
            }
        }

        // Handle upload snapshot baru (FormData dengan foto)
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
                return res.status(400).json({ success: false, message: 'Request bukan multipart/form-data' });
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
                    imageBase64 = `data:${imageMimeType};base64,${part.body.toString('base64')}`;
                }
            }

            if (!imageBase64) {
                return res.status(400).json({ success: false, message: 'File gambar tidak ditemukan' });
            }

            if (!studentId) {
                return res.status(400).json({ success: false, message: 'student_id diperlukan' });
            }

            const newSnapshot = {
                student_id: studentId,
                caption: caption || 'Snapshot',
                image_url: imageBase64,
                likes: [],
                comments: [],
                created_at: new Date()
            };

            const result = await collection.insertOne(newSnapshot);
            return res.status(201).json({
                success: true,
                message: 'Snapshot berhasil diunggah',
                id: result.insertedId.toString()
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE: Hapus snapshot ---
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'ID snapshot diperlukan' });

        try {
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Snapshot berhasil dihapus' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    res.status(405).json({ message: 'Method Not Allowed' });
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
