import multiparty from 'multiparty';
import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import { sendSuccess, sendError } from './_helpers.js';
import { requireAuth } from './_auth.js';
import { uploadToCloudinary, validateFileUpload } from './_cloudinary.js';

// Matikan parser bawaan agar multiparty bisa membaca file
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return sendError(res, 'Method Not Allowed', 405);

    // Auth required
    const user = requireAuth(req, res);
    if (!user) return;

    const form = new multiparty.Form({ maxFilesSize: 10 * 1024 * 1024 }); // 10MB limit (client sudah compress ke ~5MB)

    form.parse(req, async (err, fields, files) => {
        if (err) {
            if (err.code === 'ETOOBIG') {
                return sendError(res, 'File terlalu besar. Maksimal 10MB.', 400);
            }
            return sendError(res, 'Gagal membaca file: ' + err.message, 400);
        }

        if (!files.photo || !files.photo[0]) {
            return sendError(res, 'File foto tidak ditemukan', 400);
        }

        const type = fields.type ? fields.type[0] : null;
        const entityId = fields.id ? fields.id[0] : null;
        const file = files.photo[0];

        // Validasi file
        const validation = validateFileUpload(file);
        if (!validation.valid) {
            return sendError(res, validation.message, 400);
        }

        try {
            const db = await getDB();

            // Baca file dan convert ke base64 untuk Cloudinary
            const fileData = fs.readFileSync(file.path);
            const base64Image = `data:${file.headers['content-type']};base64,${fileData.toString('base64')}`;

            // Upload ke Cloudinary
            const folder = `xrpl/${type || 'uploads'}`;
            const uploadResult = await uploadToCloudinary(base64Image, folder);

            if (!uploadResult.success) {
                return sendError(res, uploadResult.message || 'Gagal upload gambar', 500);
            }

            const imageUrl = uploadResult.url;

            if (entityId && entityId !== '0') {
                // Update foto di database
                await db.collection(type).updateOne(
                    { _id: new ObjectId(entityId) },
                    { $set: { photo: imageUrl, image_url: imageUrl, updated_at: new Date() } }
                );
            } else if (type === 'snapshots') {
                // Insert snapshot baru
                await db.collection('snapshots').insertOne({
                    student_id: fields.student_id ? fields.student_id[0] : null,
                    caption: fields.caption ? fields.caption[0] : '',
                    image_url: imageUrl,
                    likes: [],
                    comments: [],
                    created_at: new Date()
                });
            }

            // Cleanup temp file
            try { fs.unlinkSync(file.path); } catch { /* ignore */ }

            return sendSuccess(res, {
                message: 'File berhasil diupload',
                photo_url: imageUrl
            });
        } catch (error) {
            console.error('Upload error:', error);
            return sendError(res, 'Server Error: ' + error.message);
        }
    });
}
