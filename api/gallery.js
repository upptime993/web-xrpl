import getDB from './_db.js';
import { ObjectId } from 'mongodb';

// API untuk Gallery — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('gallery');

    // --- GET ---
    if (req.method === 'GET') {
        try {
            const items = await collection.find({}).sort({ created_at: -1 }).toArray();
            return res.status(200).json({ success: true, data: items });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // --- POST: Tambah foto baru ---
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { title, category, image, color } = body;
            if (!title) return res.status(400).json({ success: false, message: 'Judul foto wajib diisi' });

            const catColors = { belajar: '00d4ff', keseruan: '00ff88', event: '7b2ff7', candid: 'ffae00' };

            const newItem = {
                title: title.trim(),
                category: category || 'event',
                color: color || catColors[category] || '7b2ff7',
                image: image || null,
                span: 'col-span-1',
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return res.status(201).json({ success: true, message: 'Foto berhasil ditambahkan', id: result.insertedId.toString() });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // --- PUT: Update foto ---
    if (req.method === 'PUT') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const id = req.query.id || body.id;
            if (!id) return res.status(400).json({ success: false, message: 'ID diperlukan' });

            const { title, category, image, color } = body;
            const updateFields = { updated_at: new Date() };
            if (title !== undefined) updateFields.title = title;
            if (category !== undefined) updateFields.category = category;
            if (image !== undefined) updateFields.image = image;
            if (color !== undefined) updateFields.color = color;

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return res.status(200).json({ success: true, message: 'Foto berhasil diperbarui' });
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
            return res.status(200).json({ success: true, message: 'Foto berhasil dihapus' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
