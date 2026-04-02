import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { verifyAuth } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

// API untuk Projects — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('projects');

    // --- GET (Public) ---
    if (req.method === 'GET') {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const items = await collection.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
            const total = await collection.countDocuments({});

            const formatted = items.map(p => ({
                ...p,
                id: p._id.toString(),
                tags: p.tags || [],
                color: p.color || '00d4ff'
            }));

            return res.status(200).json({ 
                success: true, 
                data: formatted,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        } catch (error) {
            console.error("GET /api/projects error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- POST: Tambah projek baru (Admin ONLY) ---
    if (req.method === 'POST') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { title, description, tags, link, image, color } = body;
            if (!title) return res.status(400).json({ success: false, error: 'Judul projek wajib diisi' });

            let imageUrl = null;
            if (image && image.startsWith('data:image')) {
                if (image.length > 5 * 1024 * 1024 * 1.33) return res.status(400).json({ success: false, error: 'Foto melebihi batas 5MB' });
                const uploadResult = await uploadToCloudinary(image, 'xrpl_projects');
                imageUrl = uploadResult.secure_url;
            } else if (image && image.startsWith('http')) {
                imageUrl = image;
            }

            const newItem = {
                title: title.trim().replace(/</g, "&lt;"),
                description: (description || '').trim().replace(/</g, "&lt;"),
                tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim().replace(/</g, "&lt;")).filter(Boolean),
                link: (link || '').trim(),
                image: imageUrl,
                color: color || '00d4ff',
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return res.status(201).json({ success: true, message: 'Projek berhasil ditambahkan', data: { id: result.insertedId.toString(), ...newItem } });
        } catch (error) {
            console.error("POST /api/projects error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- PUT: Update projek (Admin) ---
    if (req.method === 'PUT') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const id = req.query.id || body.id;
            if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });

            const { title, description, tags, link, image, color } = body;
            const updateFields = { updated_at: new Date() };

            if (title !== undefined) updateFields.title = title.trim().replace(/</g, "&lt;");
            if (description !== undefined) updateFields.description = description.trim().replace(/</g, "&lt;");
            if (tags !== undefined) updateFields.tags = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim().replace(/</g, "&lt;")).filter(Boolean);
            if (link !== undefined) updateFields.link = link;
            if (color !== undefined) updateFields.color = color;

            if (image && image.startsWith('data:image')) {
                if (image.length > 5 * 1024 * 1024 * 1.33) return res.status(400).json({ success: false, error: 'Foto melebihi 5MB' });
                const uploadResult = await uploadToCloudinary(image, 'xrpl_projects');
                updateFields.image = uploadResult.secure_url;
            } else if (image === null || (image && image.startsWith('http'))) {
                updateFields.image = image;
            }

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return res.status(200).json({ success: true, message: 'Projek berhasil diperbarui' });
        } catch (error) {
            console.error("PUT /api/projects error:", error);
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
            return res.status(200).json({ success: true, message: 'Projek berhasil dihapus' });
        } catch (error) {
            console.error("DELETE /api/projects error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
