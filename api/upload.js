import multiparty from 'multiparty';
import getDB from './_db.js';
import { ObjectId } from 'mongodb';
import fs from 'fs';

// Matikan parser bawaan Next.js/Vercel agar multiparty bisa membaca file
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const form = new multiparty.Form();
    const db = await getDB();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.photo) return res.status(500).json({ success: false, message: 'Gagal membaca file' });

        const type = fields.type[0]; // students, gallery, dll
        const entityId = fields.id ? fields.id[0] : null;
        const file = files.photo[0];

        // Ubah file fisik menjadi teks Base64
        const fileData = fs.readFileSync(file.path);
        const base64Image = `data:${file.headers['content-type']};base64,${fileData.toString('base64')}`;

        if (entityId && entityId !== '0') {
            // Update foto di database
            await db.collection(type).updateOne(
                { _id: new ObjectId(entityId) },
                { $set: { photo: base64Image, image_url: base64Image } }
            );
        } else if (type === 'snapshots') {
            // Insert snapshot baru
            await db.collection('snapshots').insertOne({
                student_id: fields.student_id[0],
                caption: fields.caption ? fields.caption[0] : '',
                image_url: base64Image,
                created_at: new Date()
            });
        }

        return res.status(200).json({ success: true, message: 'File berhasil diupload', photo_url: base64Image });
    });
}
