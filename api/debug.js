import getDB from './_db.js';

export default async function handler(req, res) {
    try {
        const db = await getDB();
        // Mengintip daftar username yang ada di tabel users
        const userList = await db.collection('users').find({}, { projection: { username: 1, _id: 0 } }).toArray();
        
        res.status(200).json({ 
            success: true, 
            database_connected: true,
            registered_usernames: userList 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
