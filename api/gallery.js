import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { sendSuccess, sendError, parseBody, isValidObjectId, getPagination } from './_helpers.js';
import { requireAdmin } from './_auth.js';
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

    // --- POST: Tambah foto baru (Admin Only) ---
    if (req.method === 'POST') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        try {
            const body = parseBody(req);
            const { title, category, image, color } = body;
            if (!title || !title.trim()) {
                return sendError(res, 'Judul foto wajib diisi', 400);
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

    // --- DELETE (Admin Only) ---
    if (req.method === 'DELETE') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        const { id } = req.query;
        if (!id) return sendError(res, 'ID diperlukan', 400);
        if (!isValidObjectId(id)) return sendError(res, 'ID tidak valid', 400);

        try {
            await collection.deleteOne({ _id: new ObjectId(id) });
            return sendSuccess(res, { message: 'Foto berhasil dihapus' });
        } catch (error) {
            console.error('Gallery DELETE error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    return sendError(res, 'Method Not Allowed', 405);
}
