import getDB from './_db.js';
import { ObjectId } from 'mongodb';

// API untuk Struktur Kelas — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('struktur');

    // --- GET ---
    if (req.method === 'GET') {
        try {
            const data = await collection.find({}).sort({ level: 1, sort_order: 1 }).toArray();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // --- POST: Tambah jabatan baru ---
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { name, jabatan, level, color, sort_order } = body;
            if (!name || !jabatan) return res.status(400).json({ success: false, message: 'Nama dan jabatan wajib diisi' });

            const newItem = {
                name: name.trim(),
                jabatan: jabatan.trim(),
                level: parseFloat(level) || 2,
                color: color || '00d4ff',
                sort_order: parseInt(sort_order) || 99,
                photo: null,
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return res.status(201).json({ success: true, message: 'Jabatan berhasil ditambahkan', id: result.insertedId.toString() });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // --- PUT: Update jabatan ---
    if (req.method === 'PUT') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const id = req.query.id || body.id;
            if (!id) return res.status(400).json({ success: false, message: 'ID diperlukan' });

            const { name, jabatan, level, color } = body;
            const updateFields = { updated_at: new Date() };
            if (name !== undefined) updateFields.name = name;
            if (jabatan !== undefined) updateFields.jabatan = jabatan;
            if (level !== undefined) updateFields.level = parseFloat(level);
            if (color !== undefined) updateFields.color = color;
            if (body.photo !== undefined) updateFields.photo = body.photo;

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return res.status(200).json({ success: true, message: 'Jabatan berhasil diperbarui' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // --- DELETE ---
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'ID diperlukan' });
        try {
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Jabatan berhasil dihapus' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
