import getDB from './_db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    const db = await getDB();
    const users = db.collection('users');

    // 1. Cek apakah admin sudah pernah dibuat
    const existingAdmin = await users.findOne({ username: 'admin' });
    if (existingAdmin) {
        return res.status(200).json({ message: 'Akun Admin sudah ada di database!' });
    }

    // 2. Buat password rahasia (Enkripsi)
    // Di sini kita set password bawaannya adalah: admin123
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    // 3. Masukkan ke database MongoDB
    await users.insertOne({
        username: 'admin',
        password: hashedPassword,
        full_name: 'Administrator Kelas',
        role: 'admin',
        created_at: new Date()
    });

    return res.status(200).json({ 
        success: true, 
        message: '✅ BERHASIL! Akun Admin pertama telah dibuat. Silakan login menggunakan Username: admin | Password: admin123' 
    });
}
