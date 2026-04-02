import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload gambar berformat Base64 ke Cloudinary
 * @param {String} base64Image - String base64 gambar
 * @param {String} folderName - Nama folder tujuan di Cloudinary (misal: 'xrpl_snapshots')
 * @returns {Promise<Object>} - Mengembalikan object response Cloudinary (termasuk .secure_url)
 */
export async function uploadToCloudinary(base64Image, folderName = 'xrpl_web') {
    return new Promise((resolve, reject) => {
        // Karena input kemungkinan memiliki prefix data:image/png;base64, ...
        // Cloudinary secara otomatis mendukung data URI string
        cloudinary.uploader.upload(base64Image, {
            folder: folderName,
            resource_type: 'image',
            format: 'webp', // Kompresi performa terbaik
            quality: 'auto'
        }, (error, result) => {
            if (error) {
                console.error("Cloudinary Upload Error:", error);
                return reject(error);
            }
            resolve(result);
        });
    });
}
