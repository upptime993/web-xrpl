import getDB from './_db.js';
import { ObjectId } from 'mongodb';

// API untuk Projects — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('projects');

    // --- GET: Ambil semua projek ---
    if (req.method === 'GET') {
        try {
            const items = await collection.find({}).sort({ created_at: -1 }).toArray();
            // Format data agar konsisten
            const formatted = items.map(p => ({
                ...p,
                id: p._id.toString(),
                tags: p.tags || [],
                color: p.color || '00d4ff'
            }));
            return res.status(200).json({ success: true, data: formatted });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- POST: Tambah projek baru ---
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { title, description, tags, link, image, color } = body;
            if (!title) return res.status(400).json({ success: false, message: 'Judul projek wajib diisi' });

            const newItem = {
                title: title.trim(),
                description: (description || '').trim(),
                tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
                link: (link || '').trim(),
                image: image || null,
                color: color || '00d4ff',
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return res.status(201).json({ success: true, message: 'Projek berhasil ditambahkan', id: result.insertedId.toString() });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- PUT: Update projek ---
    if (req.method === 'PUT') {
        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const id = req.query.id || body.id;
            if (!id) return res.status(400).json({ success: false, message: 'ID diperlukan' });

            const { title, description, tags, link, image, color } = body;
            const updateFields = { updated_at: new Date() };
            if (title !== undefined) updateFields.title = title;
            if (description !== undefined) updateFields.description = description;
            if (tags !== undefined) updateFields.tags = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);
            if (link !== undefined) updateFields.link = link;
            if (image !== undefined) updateFields.image = image;
            if (color !== undefined) updateFields.color = color;

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return res.status(200).json({ success: true, message: 'Projek berhasil diperbarui' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE ---
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'ID diperlukan' });
        try {
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Projek berhasil dihapus' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
