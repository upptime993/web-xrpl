import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { sendSuccess, sendError, parseBody, isValidObjectId, getPagination } from './_helpers.js';
import { requireAdmin } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('projects');

    // --- GET: Ambil semua projek (public, dengan pagination) ---
    if (req.method === 'GET') {
        try {
            const pagination = getPagination(req.query);
            const [items, total] = await Promise.all([
                collection.find({}).sort({ created_at: -1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
                collection.countDocuments({})
            ]);

            const formatted = items.map(p => ({
                ...p,
                id: p._id.toString(),
                tags: p.tags || [],
                color: p.color || '00d4ff'
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
            console.error('Projects GET error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- POST: Tambah projek baru (Admin Only) ---
    if (req.method === 'POST') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        try {
            const body = parseBody(req);
            const { title, description, tags, link, image, color } = body;
            if (!title || !title.trim()) {
                return sendError(res, 'Judul projek wajib diisi', 400);
            }

            // Upload gambar ke Cloudinary
            let imageUrl = null;
            if (image && image.startsWith('data:image')) {
                const uploadResult = await uploadToCloudinary(image, 'xrpl/projects');
                if (uploadResult.success) imageUrl = uploadResult.url;
            } else if (image) {
                imageUrl = image;
            }

            const newItem = {
                title: title.trim(),
                description: (description || '').trim(),
                tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
                link: (link || '').trim(),
                image: imageUrl,
                color: color || '00d4ff',
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return sendSuccess(res, {
                message: 'Projek berhasil ditambahkan',
                id: result.insertedId.toString()
            }, 201);
        } catch (error) {
            console.error('Projects POST error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- PUT: Update projek (Admin Only) ---
    if (req.method === 'PUT') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        try {
            const body = parseBody(req);
            const id = req.query.id || body.id;
            if (!id) return sendError(res, 'ID diperlukan', 400);
            if (!isValidObjectId(id)) return sendError(res, 'ID tidak valid', 400);

            const { title, description, tags, link, image, color } = body;
            const updateFields = { updated_at: new Date() };
            if (title !== undefined) updateFields.title = title;
            if (description !== undefined) updateFields.description = description;
            if (tags !== undefined) updateFields.tags = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);
            if (link !== undefined) updateFields.link = link;
            if (color !== undefined) updateFields.color = color;

            if (image !== undefined) {
                if (image && image.startsWith('data:image')) {
                    const uploadResult = await uploadToCloudinary(image, 'xrpl/projects');
                    if (uploadResult.success) updateFields.image = uploadResult.url;
                } else {
                    updateFields.image = image;
                }
            }

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return sendSuccess(res, { message: 'Projek berhasil diperbarui' });
        } catch (error) {
            console.error('Projects PUT error:', error);
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
            return sendSuccess(res, { message: 'Projek berhasil dihapus' });
        } catch (error) {
            console.error('Projects DELETE error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    return sendError(res, 'Method Not Allowed', 405);
}
