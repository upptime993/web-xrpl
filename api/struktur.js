import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { verifyAuth } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

// API untuk Struktur Kelas — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('struktur');

    // --- GET (Public) ---
    if (req.method === 'GET') {
        try {
            const data = await collection.find({}).sort({ level: 1, sort_order: 1 }).toArray();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("GET /api/struktur error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- POST: Tambah jabatan baru (Admin) ---
    if (req.method === 'POST') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { name, jabatan, level, color, sort_order, photo } = body;
            if (!name || !jabatan) return res.status(400).json({ success: false, error: 'Nama dan jabatan wajib diisi' });

            let imageUrl = null;
            if (photo && photo.startsWith('data:image')) {
                if (photo.length > 5 * 1024 * 1024 * 1.33) {
                    return res.status(400).json({ success: false, error: 'Foto melebihi 5MB' });
                }
                const uploadResult = await uploadToCloudinary(photo, 'xrpl_struktur');
                imageUrl = uploadResult.secure_url;
            } else if (photo && photo.startsWith('http')) {
                imageUrl = photo;
            }

            const newItem = {
                name: name.trim().replace(/</g, "&lt;"),
                jabatan: jabatan.trim().replace(/</g, "&lt;"),
                level: parseFloat(level) || 2,
                color: color || '00d4ff',
                sort_order: parseInt(sort_order) || 99,
                photo: imageUrl,
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return res.status(201).json({ success: true, message: 'Jabatan berhasil ditambahkan', data: { id: result.insertedId.toString(), ...newItem } });
        } catch (error) {
            console.error("POST /api/struktur error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- PUT: Update jabatan (Admin) ---
    if (req.method === 'PUT') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const id = req.query.id || body.id;
            if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });

            const { name, jabatan, level, color, photo } = body;
            const updateFields = { updated_at: new Date() };
            
            if (name !== undefined) updateFields.name = name.trim().replace(/</g, "&lt;");
            if (jabatan !== undefined) updateFields.jabatan = jabatan.trim().replace(/</g, "&lt;");
            if (level !== undefined) updateFields.level = parseFloat(level);
            if (color !== undefined) updateFields.color = color;

            if (photo && photo.startsWith('data:image')) {
                if (photo.length > 5 * 1024 * 1024 * 1.33) return res.status(400).json({ success: false, error: 'Foto melebihi 5MB' });
                const uploadResult = await uploadToCloudinary(photo, 'xrpl_struktur');
                updateFields.photo = uploadResult.secure_url;
            } else if (photo === null || (photo && photo.startsWith('http'))) {
                updateFields.photo = photo;
            }

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return res.status(200).json({ success: true, message: 'Jabatan berhasil diperbarui' });
        } catch (error) {
            console.error("PUT /api/struktur error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE (Admin) ---
    if (req.method === 'DELETE') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });
        
        try {
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Jabatan berhasil dihapus' });
        } catch (error) {
            console.error("DELETE /api/struktur error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
