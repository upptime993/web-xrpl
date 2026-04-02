import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import { verifyAuth } from './_auth.js';
import { uploadToCloudinary } from './_cloudinary.js';

// API untuk Gallery — MONGODB based
export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('gallery');

    // --- GET (Public) ---
    if (req.method === 'GET') {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50; // max 50 defaultnya
            const skip = (page - 1) * limit;

            const items = await collection.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
            const total = await collection.countDocuments({});

            return res.status(200).json({ 
                success: true, 
                data: items,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        } catch (error) {
            console.error("GET /api/gallery error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- POST: Tambah foto baru (Admin Only) ---
    if (req.method === 'POST') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return; // verifyAuth sudah mengirim response error

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const { title, category, image, color } = body;
            if (!title) return res.status(400).json({ success: false, error: 'Judul foto wajib diisi' });

            let imageUrl = null;
            if (image && image.startsWith('data:image')) {
                // Check mime type & size from base64 approx
                if (image.length > 5 * 1024 * 1024 * 1.33) {
                    return res.status(400).json({ success: false, error: 'Ukuran file melebihi 5MB' });
                }
                const uploadResult = await uploadToCloudinary(image, 'xrpl_gallery');
                imageUrl = uploadResult.secure_url;
            } else if (image && image.startsWith('http')) {
                imageUrl = image; // allow direct url
            }

            const catColors = { belajar: '00d4ff', keseruan: '00ff88', event: '7b2ff7', candid: 'ffae00' };

            const newItem = {
                title: title.trim(),
                category: category || 'event',
                color: color || catColors[category] || '7b2ff7',
                image: imageUrl,
                span: 'col-span-1',
                created_at: new Date()
            };

            const result = await collection.insertOne(newItem);
            return res.status(201).json({ success: true, message: 'Foto berhasil ditambahkan', data: { id: result.insertedId.toString(), ...newItem } });
        } catch (error) {
            console.error("POST /api/gallery error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- PUT: Update foto (Admin Only) ---
    if (req.method === 'PUT') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        try {
            let body = req.body;
            if (typeof body === 'string') body = JSON.parse(body);

            const id = req.query.id || body.id;
            if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });

            const { title, category, image, color } = body;
            const updateFields = { updated_at: new Date() };

            if (title !== undefined) updateFields.title = title.trim();
            if (category !== undefined) updateFields.category = category;
            if (color !== undefined) updateFields.color = color;

            if (image && image.startsWith('data:image')) {
                if (image.length > 5 * 1024 * 1024 * 1.33) {
                    return res.status(400).json({ success: false, error: 'Ukuran file melebihi 5MB' });
                }
                const uploadResult = await uploadToCloudinary(image, 'xrpl_gallery');
                updateFields.image = uploadResult.secure_url;
            } else if (image && image.startsWith('http')) {
                updateFields.image = image;
            }

            await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
            return res.status(200).json({ success: true, message: 'Foto berhasil diperbarui' });
        } catch (error) {
            console.error("PUT /api/gallery error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    // --- DELETE (Admin Only) ---
    if (req.method === 'DELETE') {
        const user = verifyAuth(req, res, ['admin']);
        if (!user) return;

        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });
        
        try {
            await collection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ success: true, message: 'Foto berhasil dihapus' });
        } catch (error) {
            console.error("DELETE /api/gallery error:", error);
            return res.status(500).json({ success: false, error: 'Server Error: ' + error.message });
        }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
