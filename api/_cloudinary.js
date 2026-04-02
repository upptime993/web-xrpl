// ============================================================
// _cloudinary.js — Cloudinary Upload Helper
// ============================================================
import { v2 as cloudinary } from 'cloudinary';

// Konfigurasi Cloudinary dari environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tipe file yang diizinkan
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload gambar ke Cloudinary dari base64 string
 * 
 * @param {string} base64Data - Data gambar dalam format base64 (data:image/...;base64,...)
 * @param {string} folder - Folder di Cloudinary (e.g. 'xrpl/students', 'xrpl/gallery')
 * @returns {Promise<{success: boolean, url?: string, public_id?: string, message?: string}>}
 */
export async function uploadToCloudinary(base64Data, folder = 'xrpl') {
    try {
        // Cek apakah Cloudinary sudah dikonfigurasi
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
            // Fallback: kembalikan base64 langsung jika Cloudinary belum di-setup
            return {
                success: true,
                url: base64Data,
                public_id: null,
                fallback: true
            };
        }

        // Validasi format base64
        if (!base64Data || typeof base64Data !== 'string') {
            return { success: false, message: 'Data gambar tidak valid' };
        }

        // Validasi MIME type
        const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) {
            const mimeType = mimeMatch[1];
            if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
                return {
                    success: false,
                    message: `Tipe file tidak didukung: ${mimeType}. Gunakan JPEG, PNG, WebP, atau GIF.`
                };
            }
        }

        // Estimasi ukuran file dari base64 (setiap 4 char base64 = 3 bytes)
        const base64Only = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const estimatedSize = Math.ceil(base64Only.length * 0.75);
        if (estimatedSize > MAX_FILE_SIZE) {
            return {
                success: false,
                message: `File terlalu besar (${(estimatedSize / 1024 / 1024).toFixed(1)}MB). Maksimal 5MB.`
            };
        }

        // Upload ke Cloudinary
        const result = await cloudinary.uploader.upload(base64Data, {
            folder,
            resource_type: 'image',
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            // Batasi dimensi maksimal
            eager: [
                { width: 1200, height: 1200, crop: 'limit' }
            ]
        });

        return {
            success: true,
            url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error.message);
        return {
            success: false,
            message: 'Gagal upload ke Cloudinary: ' + error.message
        };
    }
}

/**
 * Hapus gambar dari Cloudinary
 * 
 * @param {string} publicId - Public ID gambar di Cloudinary
 * @returns {Promise<boolean>}
 */
export async function deleteFromCloudinary(publicId) {
    try {
        if (!publicId || !process.env.CLOUDINARY_CLOUD_NAME) return false;
        await cloudinary.uploader.destroy(publicId);
        return true;
    } catch (error) {
        console.error('Cloudinary delete error:', error.message);
        return false;
    }
}

/**
 * Validasi file upload (untuk multipart form data)
 * 
 * @param {object} file - File object dari multiparty
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateFileUpload(file) {
    if (!file) {
        return { valid: false, message: 'File tidak ditemukan' };
    }

    const contentType = file.headers?.['content-type'] || '';
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        return {
            valid: false,
            message: `Tipe file tidak didukung: ${contentType}. Gunakan JPEG, PNG, WebP, atau GIF.`
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            message: `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 5MB.`
        };
    }

    return { valid: true };
}

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
