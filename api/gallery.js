import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { sendSuccess, sendError, parseBody, isValidObjectId, getPagination } from './_helpers.js';
import { requireAdmin, requireAuth } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('gallery');

    // --- GET: Ambil gallery (public, dengan pagination) ---
    if (req.method === 'GET') {
        try {
            const pagination = getPagination(req.query);
            const [items, total] = await Promise.all([
                collection.find({}).sort({ created_at: -1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
                collection.countDocuments({})
            ]);
            return sendSuccess(res, {
                data: items,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                    totalPages: Math.ceil(total / pagination.limit)
                }
            });
        } catch (error) {
            console.error('Gallery GET error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- POST: Tambah foto baru (Admin atau Student, student max 5/hari) ---
    if (req.method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;

        try {
            const body = parseBody(req);
            const { title, category, image, color } = body;
            if (!title || !title.trim()) {
                return sendError(res, 'Judul foto wajib diisi', 400);
            }

            // Daily limit untuk student: max 5 per hari
            if (user.role === 'student') {
                const now = new Date();
                const startOfDay = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(startOfDay);
                endOfDay.setHours(23, 59, 59, 999);

                const todayCount = await collection.countDocuments({
                    uploaded_by: user.id,
                    created_at: { $gte: startOfDay, $lte: endOfDay }
                });

                if (todayCount >= 5) {
                    return sendError(res, 'Batas upload harian tercapai (maksimal 5 foto per hari). Coba lagi besok!', 429);
                }
            }

            const catColors = { belajar: '00d4ff', keseruan: '00ff88', event: '7b2ff7', candid: 'ffae00' };

            // Upload gambar ke Cloudinary jika base64
            let imageUrl = null;
            if (image && image.startsWith('data:image')) {
                const uploadResult = await uploadToCloudinary(image, 'xrpl/gallery');
                if (uploadResult.success) {
                    imageUrl = uploadResult.url;
                } else {
                    return sendError(res, uploadResult.message || 'Gagal upload gambar', 400);
                }
            } else if (image) {
                imageUrl = image;
            }

            const newItem = {
                title: title.trim(),
                category: category || 'event',
                color: color || catColors[category] || '7b2ff7',
                image: imageUrl,
                span: 'col-span-1',
                uploaded_by: user.id || null,
                uploader_name: user.full_name || user.username || 'Unknown',
                uploader_username: user.username || null,
                uploader_role: user.role || 'admin',
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return sendSuccess(res, {
                message: 'Foto berhasil ditambahkan',
                id: result.insertedId.toString()
            }, 201);
        } catch (error) {
            console.error('Gallery POST error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- PUT: Update foto (Admin Only) ---
    if (req.method === 'PUT') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        try {
            const body = parseBody(req);
            const id = req.query.id || body.id;
            if (!id) return sendError(res, 'ID diperlukan', 400);
            if (!isValidObjectId(id)) return sendError(res, 'ID tidak valid', 400);

            const { title, category, image, color } = body;
            const updateFields = { updated_at: new Date() };
            if (title !== undefined) updateFields.title = title;
            if (category !== undefined) updateFields.category = category;
            if (color !== undefined) updateFields.color = color;

            // Upload gambar ke Cloudinary jika base64 baru
            if (image !== undefined) {
                if (image && image.startsWith('data:image')) {
                    const uploadResult = await uploadToCloudinary(image, 'xrpl/gallery');
                    if (uploadResult.success) {
                        updateFields.image = uploadResult.url;
                    } else {
                        return sendError(res, uploadResult.message || 'Gagal upload gambar', 400);
                    }
                } else {
                    updateFields.image = image;
                }
            }

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return sendSuccess(res, { message: 'Foto berhasil diperbarui' });
        } catch (error) {
            console.error('Gallery PUT error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- DELETE (Admin atau pemilik foto) ---
    if (req.method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;

        const { id } = req.query;
        if (!id) return sendError(res, 'ID diperlukan', 400);
        if (!isValidObjectId(id)) return sendError(res, 'ID tidak valid', 400);

        try {
            // Student hanya bisa menghapus foto sendiri
            if (user.role === 'student') {
                const photo = await collection.findOne({ _id: new ObjectId(id) });
                if (!photo) return sendError(res, 'Foto tidak ditemukan', 404);
                if (photo.uploaded_by !== user.id) {
                    return sendError(res, 'Forbidden: Kamu hanya bisa menghapus foto yang kamu upload', 403);
                }
            }

            await collection.deleteOne({ _id: new ObjectId(id) });
            return sendSuccess(res, { message: 'Foto berhasil dihapus' });
        } catch (error) {
            console.error('Gallery DELETE error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    return sendError(res, 'Method Not Allowed', 405);
}
