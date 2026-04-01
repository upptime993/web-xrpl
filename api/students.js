import getDB from './_db.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('students');

    if (req.method === 'GET') {
        const { id } = req.query;
        if (id) {
            const student = await collection.findOne({ _id: new ObjectId(id), is_active: 1 });
            return student ? res.status(200).json({ success: true, data: student }) : res.status(404).json({ message: 'Tidak ditemukan' });
        }
        const students = await collection.find({ is_active: 1 }).sort({ sort_order: 1 }).toArray();
        return res.status(200).json({ success: true, data: students });
    }

    if (req.method === 'PUT') {
        const { id, name, quote, motto, dream, color } = req.body;
        await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { name, quote, motto, dream, color, updated_at: new Date() } }
        );
        return res.status(200).json({ success: true, message: 'Data murid diperbarui' });
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        await collection.updateOne({ _id: new ObjectId(id) }, { $set: { is_active: 0 } });
        return res.status(200).json({ success: true, message: 'Murid dihapus' });
    }

    res.status(405).json({ message: 'Method Not Allowed' });
}
