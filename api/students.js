import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { verifyAuth } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('students');

    // --- GET (Public): Ambil semua/satu murid ---
    if (req.method === 'GET') {
        const { id } = req.query;
        if (id) {
            try {
                const student = await collection.findOne({ _id: new ObjectId(id), is_active: { $ne: 0 } });
                return student
                    ? res.status(200).json({ success: true, data: student })
                    : res.status(404).json({ success: false, error: 'Murid tidak ditemukan' });
            } catch (e) {
                return res.status(400).json({ success: false, error: 'ID tidak valid' });
            }
        }
        try {
            const students = await collection.find({ is_active: { $ne: 0 } }).sort({ sort_order: 1 }).toArray();
            return res.status(200).json({ success: true, data: students });
        } catch (error) {
            console.error("GET /api/students error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- POST: Tambah murid baru (Admin Only) ---
    if (req.method === 'POST') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { name, username, quote, motto, dream, color, photo, sort_order } = body;

            if (!name) return res.status(400).json({ success: false, error: 'Nama murid wajib diisi' });

            const generatedUsername = username || name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
            const existingUser = await collection.findOne({ username: generatedUsername });
            if (existingUser) return res.status(409).json({ success: false, error: `Username '${generatedUsername}' sudah ada. Gunakan nama yang berbeda.` });

            let imageUrl = null;
            if (photo && photo.startsWith('data:image')) {
                if (photo.length > 5 * 1024 * 1024 * 1.33) return res.status(400).json({ success: false, error: 'Foto melebihi 5MB' });
                const uploadResult = await uploadToCloudinary(photo, 'xrpl_students');
                imageUrl = uploadResult.secure_url;
            } else if (photo === null || (photo && photo.startsWith('http'))) {
                imageUrl = photo;
            }

            const hashedPassword = bcrypt.hashSync('murid123', 10);
            const lastStudent = await collection.findOne({}, { sort: { sort_order: -1 } });
            const nextSortOrder = sort_order || (lastStudent ? (lastStudent.sort_order || 0) + 1 : 1);

            const newStudent = {
                name: name.trim().replace(/</g, "&lt;"),
                username: generatedUsername,
                password: hashedPassword,
                quote: quote ? quote.trim().replace(/</g, "&lt;") : '',
                motto: motto ? motto.trim().replace(/</g, "&lt;") : '',
                dream: dream ? dream.trim().replace(/</g, "&lt;") : '',
                color: color || '00d4ff',
                photo: imageUrl,
                sort_order: nextSortOrder,
                is_active: 1,
                created_at: new Date()
            };

            const result = await collection.insertOne(newStudent);
            return res.status(201).json({
                success: true,
                message: `Murid ${name} berhasil ditambahkan. Username: ${generatedUsername} | Password: murid123`,
                data: { id: result.insertedId.toString(), username: generatedUsername }
            });
        } catch (error) {
            console.error("POST /api/students error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- PUT: Update data murid (Admin Atau Murid Pribadi) ---
    if (req.method === 'PUT') {
        const user = verifyAuth(req, res, ['admin', 'student']);
        if (!user) return;

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const idStr = req.query.id || body.id;
            if (!idStr) return res.status(400).json({ success: false, error: 'ID murid diperlukan' });
            
            // Student can only update their own profile
            if (user.role === 'student' && user.id !== idStr) {
                return res.status(403).json({ success: false, error: 'Anda hanya bisa mengubah profil Anda sendiri' });
            }

            const { name, quote, motto, dream, color, photo } = body;

            let updateFields = { updated_at: new Date() };
            if (name !== undefined) updateFields.name = name.trim().replace(/</g, "&lt;");
            if (quote !== undefined) updateFields.quote = quote.trim().replace(/</g, "&lt;");
            if (motto !== undefined) updateFields.motto = motto.trim().replace(/</g, "&lt;");
            if (dream !== undefined) updateFields.dream = dream.trim().replace(/</g, "&lt;");
            if (color !== undefined) updateFields.color = color;
            
            if (photo && photo.startsWith('data:image')) {
                if (photo.length > 5 * 1024 * 1024 * 1.33) return res.status(400).json({ success: false, error: 'Foto melebihi 5MB' });
                const uploadResult = await uploadToCloudinary(photo, 'xrpl_students');
                updateFields.photo = uploadResult.secure_url;
            } else if (photo === null || (photo && photo.startsWith('http'))) {
                updateFields.photo = photo;
            }

            try {
                await collection.updateOne({ _id: new ObjectId(idStr) }, { $set: updateFields });
            } catch (e) {
                await collection.updateOne({ sort_order: parseInt(idStr) }, { $set: updateFields });
            }

            return res.status(200).json({ success: true, message: 'Data murid berhasil diperbarui' });
        } catch (error) {
            console.error("PUT /api/students error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE: Soft delete murid (Admin Only) ---
    if (req.method === 'DELETE') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, error: 'ID murid diperlukan' });

        try {
            try {
                await collection.updateOne({ _id: new ObjectId(id) }, { $set: { is_active: 0, deleted_at: new Date() } });
            } catch (e) {
                await collection.updateOne({ sort_order: parseInt(id) }, { $set: { is_active: 0, deleted_at: new Date() } });
            }
            return res.status(200).json({ success: true, message: 'Murid berhasil dihapus' });
        } catch (error) {
            console.error("DELETE /api/students error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
