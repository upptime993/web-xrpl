import multiparty from 'multiparty';
import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import { uploadToCloudinary } from './_cloudinary.js';
import { verifyAuth } from './_auth.js';

// Matikan parser bawaan Next.js/Vercel agar multiparty bisa membaca file
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    // Proteksi dengan auth middleware
    const user = verifyAuth(req, res, ['admin']);
    if (!user) return; // verifyAuth sudah mengirim response error

    const form = new multiparty.Form();
    const db = await getDB();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.photo) return res.status(400).json({ success: false, error: 'Gagal membaca file atau tidak ada file gambar' });

        const type = fields.type ? fields.type[0] : null; // students, gallery, dll
        const entityId = fields.id ? fields.id[0] : null;
        const file = files.photo[0];

        // Validasi tipe file
        const mimeType = file.headers['content-type'];
        if (!mimeType.startsWith('image/')) {
            return res.status(400).json({ success: false, error: 'Format file tidak didukung. Harap unggah gambar (jpg, png, webp).' });
        }

        // Limit File Size 5MB
        if (file.size > 5 * 1024 * 1024) {
             return res.status(400).json({ success: false, error: 'Ukuran foto maksimal 5MB.' });
        }

        try {
            // Ubah file fisik menjadi teks Base64 untuk dikirim ke Cloudinary
            const fileData = fs.readFileSync(file.path);
            const base64Image = `data:${mimeType};base64,${fileData.toString('base64')}`;

            // Upload ke Cloudinary
            const uploadResult = await uploadToCloudinary(base64Image, 'xrpl_uploads');
            const imageUrl = uploadResult.secure_url;

            if (entityId && entityId !== '0') {
                // Update foto di database
                await db.collection(type).updateOne(
                    { _id: new ObjectId(entityId) },
                    { $set: { photo: imageUrl, image: imageUrl, image_url: imageUrl, updated_at: new Date() } }
                );
            } else if (type === 'snapshots') {
                // Insert snapshot baru
                await db.collection('snapshots').insertOne({
                    student_id: fields.student_id ? fields.student_id[0] : null,
                    caption: fields.caption ? fields.caption[0] : '',
                    image_url: imageUrl,
                    created_at: new Date()
                });
            } else if (type === 'gallery') {
                 await db.collection('gallery').insertOne({
                    title: fields.title ? fields.title[0] : 'Untitled',
                    category: fields.category ? fields.category[0] : 'other',
                    image: imageUrl,
                    color: fields.color ? fields.color[0] : '7b2ff7',
                    created_at: new Date()
                });
            }

            return res.status(200).json({ success: true, message: 'File berhasil diupload', photo_url: imageUrl });
        } catch (error) {
            console.error("Upload API Error:", error);
            return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat mengunggah: ' + error.message });
        }
    });
}
