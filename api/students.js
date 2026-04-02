import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('students');

    // --- GET: Ambil semua/satu murid ---
    if (req.method === 'GET') {
        const { id } = req.query;
        if (id) {
            try {
                const student = await collection.findOne({ _id: new ObjectId(id), is_active: { $ne: 0 } });
                return student
                    ? res.status(200).json({ success: true, data: student })
                    : res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
            } catch (e) {
                return res.status(400).json({ success: false, message: 'ID tidak valid' });
            }
        }
        const students = await collection.find({ is_active: { $ne: 0 } }).sort({ sort_order: 1 }).toArray();
        return res.status(200).json({ success: true, data: students });
    }

    // --- POST: Tambah murid baru ---
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { name, username, quote, motto, dream, color, photo, sort_order } = body;

            if (!name) {
                return res.status(400).json({ success: false, message: 'Nama murid wajib diisi' });
            }

            // Buat username otomatis dari nama jika tidak disediakan
            const generatedUsername = username || name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');

            // Cek apakah username sudah ada
            const existingUser = await collection.findOne({ username: generatedUsername });
            if (existingUser) {
                return res.status(409).json({ success: false, message: `Username '${generatedUsername}' sudah ada. Gunakan nama yang berbeda.` });
            }

            // Password default murid: murid123
            const hashedPassword = bcrypt.hashSync('murid123', 10);

            // Hitung sort_order otomatis jika tidak disediakan
            const lastStudent = await collection.findOne({}, { sort: { sort_order: -1 } });
            const nextSortOrder = sort_order || (lastStudent ? (lastStudent.sort_order || 0) + 1 : 1);

            const newStudent = {
                name,
                username: generatedUsername,
                password: hashedPassword,
                quote: quote || '',
                motto: motto || '',
                dream: dream || '',
                color: color || '00d4ff',
                photo: photo || null,
                sort_order: nextSortOrder,
                is_active: 1,
                created_at: new Date()
            };

            const result = await collection.insertOne(newStudent);
            return res.status(201).json({
                success: true,
                message: `Murid ${name} berhasil ditambahkan. Username: ${generatedUsername} | Password: murid123`,
                id: result.insertedId,
                username: generatedUsername
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- PUT: Update data murid ---
    if (req.method === 'PUT') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const idStr = req.query.id || body.id;
            if (!idStr) return res.status(400).json({ success: false, message: 'ID murid diperlukan' });

            const { name, quote, motto, dream, color, photo } = body;

            let updateFields = { updated_at: new Date() };
            if (name  !== undefined) updateFields.name  = name;
            if (quote !== undefined) updateFields.quote = quote;
            if (motto !== undefined) updateFields.motto = motto;
            if (dream !== undefined) updateFields.dream = dream;
            if (color !== undefined) updateFields.color = color;
            if (photo !== undefined) updateFields.photo = photo;

            try {
                await collection.updateOne(
                    { _id: new ObjectId(idStr) },
                    { $set: updateFields }
                );
            } catch (e) {
                // Fallback: cari berdasarkan sort_order jika bukan ObjectId valid
                await collection.updateOne(
                    { sort_order: parseInt(idStr) },
                    { $set: updateFields }
                );
            }

            return res.status(200).json({ success: true, message: 'Data murid berhasil diperbarui' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE: Soft delete murid (set is_active = 0) ---
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'ID murid diperlukan' });

        try {
            try {
                await collection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { is_active: 0, deleted_at: new Date() } }
                );
            } catch (e) {
                // Fallback jika bukan ObjectId valid
                await collection.updateOne(
                    { sort_order: parseInt(id) },
                    { $set: { is_active: 0, deleted_at: new Date() } }
                );
            }
            return res.status(200).json({ success: true, message: 'Murid berhasil dihapus' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    res.status(405).json({ message: 'Method Not Allowed' });
}
