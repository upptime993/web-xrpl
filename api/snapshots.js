import getDB from './_db.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const db = await getDB();
    const collection = db.collection('snapshots');

    if (req.method === 'GET') {
        const { student_id } = req.query;
        const query = student_id ? { student_id } : {};
        const snapshots = await collection.find(query).sort({ created_at: -1 }).toArray();
        return res.status(200).json({ success: true, data: snapshots });
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        await collection.deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ success: true, message: 'Snapshot dihapus' });
    }

    res.status(405).json({ message: 'Method Not Allowed' });
}
