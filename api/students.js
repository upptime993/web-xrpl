import { MongoClient } from 'mongodb';

// Vercel otomatis mengambil URL dari Environment Variables yang kita set di Langkah 1
const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Tolong tambahkan MONGODB_URI di Vercel Environment Variables');
}

// Optimasi koneksi database untuk serverless Vercel
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('xrpl_db'); // Nama database otomatis dibuat
  const collection = db.collection('students'); // Nama tabel (collection)

  // JIKA FRONTEND MINTA DATA (GET)
  if (req.method === 'GET') {
    try {
      // Ambil semua murid yang is_active nya tidak sama dengan 0
      const students = await collection.find({ is_active: { $ne: 0 } }).toArray();
      return res.status(200).json({ success: true, data: students });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Database Error' });
    }
  }

  // JIKA FRONTEND KIRIM DATA MURID BARU (POST)
  if (req.method === 'POST') {
    try {
      const dataBaru = req.body; // Data dari dashboard.js
      dataBaru.is_active = 1;
      dataBaru.created_at = new Date();
      
      const result = await collection.insertOne(dataBaru);
      return res.status(201).json({ success: true, message: 'Murid berhasil ditambahkan!', id: result.insertedId });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Gagal menambah murid' });
    }
  }

  // Jika method tidak dikenali
  return res.status(405).json({ message: 'Method Not Allowed' });
}
