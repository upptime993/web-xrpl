import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { sendSuccess, sendError, parseBody, isValidObjectId, getPagination } from './_helpers.js';
import { requireAdmin, requireAuth } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('students');

    // --- GET: Ambil semua/satu murid (public) ---
    if (req.method === 'GET') {
        try {
            const { id, page, limit } = req.query;

            // Get single student by id
            if (id) {
                if (!isValidObjectId(id)) {
                    return sendError(res, 'ID tidak valid', 400);
                }
                const student = await collection.findOne({
                    _id: new ObjectId(id),
                    is_active: { $ne: 0 }
                });
                return student
                    ? sendSuccess(res, { data: student })
                    : sendError(res, 'Murid tidak ditemukan', 404);
            }

            // Get all with pagination
            const pagination = getPagination(req.query);
            const filter = { is_active: { $ne: 0 } };
            const [students, total] = await Promise.all([
                collection.find(filter).sort({ sort_order: 1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
                collection.countDocuments(filter)
            ]);

            return sendSuccess(res, {
                data: students,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                    totalPages: Math.ceil(total / pagination.limit)
                }
            });
        } catch (error) {
            console.error('Students GET error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- POST: Tambah murid baru / Reindex (Admin Only) ---
    if (req.method === 'POST') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        // Handle reindex action
        if (req.query.action === 'reindex') {
            try {
                const allActive = await collection.find({ is_active: { $ne: 0 } }).sort({ name: 1 }).toArray();
                const bulkOps = allActive.map((s, i) => ({
                    updateOne: {
                        filter: { _id: s._id },
                        update: { $set: { sort_order: i + 1 } }
                    }
                }));
                if (bulkOps.length > 0) {
                    await collection.bulkWrite(bulkOps);
                }
                return sendSuccess(res, {
                    message: `Berhasil re-index ${bulkOps.length} murid (urut alfabet A-Z).`
                });
            } catch (error) {
                console.error('Students reindex error:', error);
                return sendError(res, 'Server Error: ' + error.message);
            }
        }

        try {
            const body = parseBody(req);
            const { name, username, quote, motto, dream, color, photo, sort_order } = body;

            if (!name || !name.trim()) {
                return sendError(res, 'Nama murid wajib diisi', 400);
            }

            // Generate username dari nama jika tidak disediakan
            const generatedUsername = username || name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');

            // Cek username duplikat
            const existingUser = await collection.findOne({ username: generatedUsername });
            if (existingUser) {
                return sendError(res, `Username '${generatedUsername}' sudah ada. Gunakan nama yang berbeda.`, 409);
            }

            // Upload foto ke Cloudinary jika ada
            let photoUrl = null;
            if (photo && photo.startsWith('data:image')) {
                const uploadResult = await uploadToCloudinary(photo, 'xrpl/students');
                if (uploadResult.success) photoUrl = uploadResult.url;
            } else if (photo) {
                photoUrl = photo; // Already a URL
            }

            const hashedPassword = bcrypt.hashSync('murid123', 10);
            // Only count active students for sort_order to avoid gaps from deleted ones
            const lastStudent = await collection.findOne(
                { is_active: { $ne: 0 } },
                { sort: { sort_order: -1 } }
            );
            const nextSortOrder = sort_order || (lastStudent ? (lastStudent.sort_order || 0) + 1 : 1);

            const newStudent = {
                name: name.trim(),
                username: generatedUsername,
                password: hashedPassword,
                quote: (quote || '').trim(),
                motto: (motto || '').trim(),
                dream: (dream || '').trim(),
                color: color || '00d4ff',
                photo: photoUrl,
                sort_order: nextSortOrder,
                is_active: 1,
                created_at: new Date()
            };

            const result = await collection.insertOne(newStudent);
            return sendSuccess(res, {
                message: `Murid ${name} berhasil ditambahkan. Username: ${generatedUsername} | Password: murid123`,
                id: result.insertedId.toString(),
                username: generatedUsername
            }, 201);
        } catch (error) {
            console.error('Students POST error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- PUT: Update data murid (Admin or Self) ---
    if (req.method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;

        try {
            const body = parseBody(req);
            const idStr = req.query.id || body.id;
            if (!idStr) return sendError(res, 'ID murid diperlukan', 400);

            // Student can only edit their own profile
            if (user.role === 'student' && user.id !== idStr) {
                return sendError(res, 'Forbidden: Kamu hanya bisa mengedit profil sendiri', 403);
            }

            const { name, quote, motto, dream, color, photo } = body;
            let updateFields = { updated_at: new Date() };
            if (name !== undefined) updateFields.name = name;
            if (quote !== undefined) updateFields.quote = quote;
            if (motto !== undefined) updateFields.motto = motto;
            if (dream !== undefined) updateFields.dream = dream;
            if (color !== undefined) updateFields.color = color;

            // Upload foto ke Cloudinary jika base64 baru
            if (photo !== undefined) {
                if (photo && photo.startsWith('data:image')) {
                    const uploadResult = await uploadToCloudinary(photo, 'xrpl/students');
                    if (uploadResult.success) {
                        updateFields.photo = uploadResult.url;
                    } else {
                        return sendError(res, uploadResult.message || 'Gagal upload foto', 400);
                    }
                } else {
                    updateFields.photo = photo; // URL or null
                }
            }

            if (isValidObjectId(idStr)) {
                await collection.updateOne(
                    { _id: new ObjectId(idStr) },
                    { $set: updateFields }
                );
            } else {
                // Fallback: cari berdasarkan sort_order
                await collection.updateOne(
                    { sort_order: parseInt(idStr) },
                    { $set: updateFields }
                );
            }

            return sendSuccess(res, { message: 'Data murid berhasil diperbarui' });
        } catch (error) {
            console.error('Students PUT error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    // --- DELETE: Soft delete murid (Admin Only) ---
    if (req.method === 'DELETE') {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        const { id } = req.query;
        if (!id) return sendError(res, 'ID murid diperlukan', 400);

        try {
            const filter = isValidObjectId(id)
                ? { _id: new ObjectId(id) }
                : { sort_order: parseInt(id) };

            await collection.updateOne(filter, {
                $set: { is_active: 0, deleted_at: new Date() }
            });

            return sendSuccess(res, { message: 'Murid berhasil dihapus' });
        } catch (error) {
            console.error('Students DELETE error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    }

    return sendError(res, 'Method Not Allowed', 405);
}
