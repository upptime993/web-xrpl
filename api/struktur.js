import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { sendSuccess, sendError, parseBody, isValidObjectId } from './_helpers.js';
import { requireAdmin } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('struktur');

    // --- GET (public) ---
    if (req.method === 'GET') {
        try {
            const data = await collection.find({}).sort({ level: 1, sort_order: 1 }).toArray();
            return sendSuccess(res, { data });
        } catch (error) {
            console.error('Struktur GET error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- POST: Tambah jabatan baru (Admin Only) ---
    if (req.method === 'POST') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        try {
            const body = parseBody(req);
            const { name, jabatan, level, color, sort_order, photo } = body;
            if (!name || !jabatan) {
                return sendError(res, 'Nama dan jabatan wajib diisi', 400);
            }

            // Upload foto ke Cloudinary
            let photoUrl = null;
            if (photo && photo.startsWith('data:image')) {
                const uploadResult = await uploadToCloudinary(photo, 'xrpl/struktur');
                if (uploadResult.success) photoUrl = uploadResult.url;
            } else if (photo) {
                photoUrl = photo;
            }

            const newItem = {
                name: name.trim(),
                jabatan: jabatan.trim(),
                level: parseFloat(level) || 2,
                color: color || '00d4ff',
                sort_order: parseInt(sort_order) || 99,
                photo: photoUrl,
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return sendSuccess(res, {
                message: 'Jabatan berhasil ditambahkan',
                id: result.insertedId.toString()
            }, 201);
        } catch (error) {
            console.error('Struktur POST error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- PUT: Update jabatan (Admin Only) ---
    if (req.method === 'PUT') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        try {
            const body = parseBody(req);
            const id = req.query.id || body.id;
            if (!id) return sendError(res, 'ID diperlukan', 400);
            if (!isValidObjectId(id)) return sendError(res, 'ID tidak valid', 400);

            const { name, jabatan, level, color, photo } = body;
            const updateFields = { updated_at: new Date() };
            if (name !== undefined) updateFields.name = name;
            if (jabatan !== undefined) updateFields.jabatan = jabatan;
            if (level !== undefined) updateFields.level = parseFloat(level);
            if (color !== undefined) updateFields.color = color;

            if (photo !== undefined) {
                if (photo && photo.startsWith('data:image')) {
                    const uploadResult = await uploadToCloudinary(photo, 'xrpl/struktur');
                    if (uploadResult.success) updateFields.photo = uploadResult.url;
                } else {
                    updateFields.photo = photo;
                }
            }

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return sendSuccess(res, { message: 'Jabatan berhasil diperbarui' });
        } catch (error) {
            console.error('Struktur PUT error:', error);
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
            return sendSuccess(res, { message: 'Jabatan berhasil dihapus' });
        } catch (error) {
            console.error('Struktur DELETE error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    return sendError(res, 'Method Not Allowed', 405);
}
