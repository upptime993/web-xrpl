import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { sendSuccess, sendError, parseBody, isValidObjectId, getPagination } from './_helpers.js';
import { requireAuth } from './_auth.js';
import { rateLimit } from './_rateLimit.js';
import { uploadToCloudinary } from './_cloudinary.js';

// Matikan body parser bawaan agar bisa baca FormData
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('snapshots');

    // --- GET: Ambil snapshot (public, per student atau semua) ---
    if (req.method === 'GET') {
        try {
            const { student_id } = req.query;
            const pagination = getPagination(req.query);
            const query = student_id ? { student_id } : {};

            const [snapshots, total] = await Promise.all([
                collection.find(query).sort({ created_at: -1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
                collection.countDocuments(query)
            ]);

            const formatted = snapshots.map(s => ({
                ...s,
                id: s._id.toString(),
                likesCount: s.likes ? s.likes.length : (s.likesCount || 0),
                comments: s.comments || []
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
            console.error('Snapshots GET error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- POST: Upload snapshot / like / comment ---
    if (req.method === 'POST') {
        const { action } = req.query;

        // Handle like
        if (action === 'like') {
            const allowed = await rateLimit(req, res, 'snapshot-like', 30, 60000);
            if (!allowed) return;

            try {
                let body = req.body;
                if (typeof body === 'string') body = JSON.parse(body);
                const { snapshot_id } = body || {};

                if (!snapshot_id || !isValidObjectId(snapshot_id)) {
                    return sendError(res, 'snapshot_id tidak valid', 400);
                }

                const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
                const snap = await collection.findOne({ _id: new ObjectId(snapshot_id) });
                if (!snap) return sendError(res, 'Snapshot tidak ditemukan', 404);

                const likes = snap.likes || [];
                const alreadyLiked = likes.includes(userIp);

                if (alreadyLiked) {
                    await collection.updateOne({ _id: new ObjectId(snapshot_id) }, { $pull: { likes: userIp } });
                    return sendSuccess(res, { action: 'unliked', likesCount: likes.length - 1 });
                } else {
                    await collection.updateOne({ _id: new ObjectId(snapshot_id) }, { $push: { likes: userIp } });
                    return sendSuccess(res, { action: 'liked', likesCount: likes.length + 1 });
                }
            } catch (error) {
                console.error('Snapshot like error:', error);
                return sendError(res, 'Server Error: ' + error.message);
            }
        }

        // Handle comment
        if (action === 'comment') {
            const allowed = await rateLimit(req, res, 'snapshot-comment', 10, 60000);
            if (!allowed) return;

            try {
                let body = req.body;
                if (typeof body === 'string') body = JSON.parse(body);
                const { snapshot_id, name, text } = body || {};

                if (!snapshot_id || !isValidObjectId(snapshot_id)) {
                    return sendError(res, 'snapshot_id tidak valid', 400);
                }
                if (!name || !text) return sendError(res, 'Nama dan komentar wajib diisi', 400);
                if (text.length > 200) return sendError(res, 'Komentar terlalu panjang (maks 200 karakter)', 400);

                const newComment = {
                    name: name.substring(0, 50),
                    text: text.substring(0, 200),
                    date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                };

                await collection.updateOne(
                    { _id: new ObjectId(snapshot_id) },
                    { $push: { comments: newComment } }
                );

                return sendSuccess(res, { message: 'Komentar berhasil ditambahkan', comment: newComment });
            } catch (error) {
                console.error('Snapshot comment error:', error);
                return sendError(res, 'Server Error: ' + error.message);
            }
        }

        // Handle upload snapshot baru (requires auth)
        const user = requireAuth(req, res);
        if (!user) return;

        try {
            // Parse multipart form data
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            // Check size limit (5MB)
            if (buffer.length > 5 * 1024 * 1024) {
                return sendError(res, 'File terlalu besar. Maksimal 5MB.', 400);
            }

            const contentType = req.headers['content-type'] || '';
            const boundaryMatch = contentType.match(/boundary=(.+)$/);
            if (!boundaryMatch) {
                return sendError(res, 'Request bukan multipart/form-data', 400);
            }

            const boundary = boundaryMatch[1];
            const parts = parseMultipart(buffer, boundary);

            let studentId = null;
            let caption = '';
            let imageBase64 = null;

            for (const part of parts) {
                const dispositionMatch = part.headers['content-disposition'] || '';
                const nameMatch = dispositionMatch.match(/name="([^"]+)"/);
                const partName = nameMatch ? nameMatch[1] : '';

                if (partName === 'caption') {
                    caption = part.body.toString('utf-8').trim();
                } else if (partName === 'student_id') {
                    studentId = part.body.toString('utf-8').trim();
                } else if (partName === 'image') {
                    const imageMimeType = part.headers['content-type'] || 'image/jpeg';
                    imageBase64 = `data:${imageMimeType};base64,${part.body.toString('base64')}`;
                }
            }

            if (!imageBase64) {
                return sendError(res, 'File gambar tidak ditemukan', 400);
            }
            if (!studentId) {
                return sendError(res, 'student_id diperlukan', 400);
            }

            // Upload ke Cloudinary
            const uploadResult = await uploadToCloudinary(imageBase64, 'xrpl/snapshots');
            if (!uploadResult.success) {
                return sendError(res, uploadResult.message || 'Gagal upload gambar', 500);
            }

            const newSnapshot = {
                student_id: studentId,
                caption: caption || 'Snapshot',
                image_url: uploadResult.url,
                likes: [],
                comments: [],
                created_at: new Date()
            };

            const result = await collection.insertOne(newSnapshot);
            return sendSuccess(res, {
                message: 'Snapshot berhasil diunggah',
                id: result.insertedId.toString()
            }, 201);
        } catch (error) {
            console.error('Snapshot upload error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- DELETE: Hapus snapshot (auth required, ownership check) ---
    if (req.method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;

        const { id } = req.query;
        if (!id) return sendError(res, 'ID snapshot diperlukan', 400);
        if (!isValidObjectId(id)) return sendError(res, 'ID tidak valid', 400);

        try {
            // Check ownership (student can only delete their own)
            if (user.role === 'student') {
                const snap = await collection.findOne({ _id: new ObjectId(id) });
                if (!snap) return sendError(res, 'Snapshot tidak ditemukan', 404);
                if (snap.student_id !== user.id) {
                    return sendError(res, 'Forbidden: Kamu hanya bisa menghapus snapshot sendiri', 403);
                }
            }

            await collection.deleteOne({ _id: new ObjectId(id) });
            return sendSuccess(res, { message: 'Snapshot berhasil dihapus' });
        } catch (error) {
            console.error('Snapshot DELETE error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    return sendError(res, 'Method Not Allowed', 405);
}

// Helper: parse manual multipart/form-data
function parseMultipart(buffer, boundary) {
    const parts = [];
    const boundaryBuf = Buffer.from('--' + boundary);

    let start = 0;
    while (start < buffer.length) {
        const boundaryIdx = buffer.indexOf(boundaryBuf, start);
        if (boundaryIdx === -1) break;

        const afterBoundary = boundaryIdx + boundaryBuf.length;
        if (buffer.slice(afterBoundary, afterBoundary + 2).toString() === '--') break;

        const headerStart = afterBoundary + 2;
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
        const nextBoundaryIdx = buffer.indexOf(boundaryBuf, bodyStart);
        const bodyEnd = nextBoundaryIdx === -1 ? buffer.length : nextBoundaryIdx - 2;

        parts.push({ headers, body: buffer.slice(bodyStart, bodyEnd) });
        start = nextBoundaryIdx === -1 ? buffer.length : nextBoundaryIdx;
    }

    return parts;
}
