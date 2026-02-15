// Firebase Storage utilities for image upload
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Maximum icon size in pixels
 */
const ICON_SIZE = 100;

/**
 * Maximum file size in bytes (1MB)
 */
const MAX_FILE_SIZE = 1 * 1024 * 1024;

/**
 * Compress and resize an image to a square icon
 * @param file - The image file to process
 * @param size - Target size in pixels (default: 150)
 * @returns Promise<Blob> - Compressed JPEG blob
 */
export async function compressAndResizeImage(file: File, size: number = ICON_SIZE): Promise<Blob> {
    return new Promise((resolve, reject) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('Invalid file type. Please select an image.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                // Calculate crop dimensions (center crop to square)
                const minDimension = Math.min(img.width, img.height);
                const sx = (img.width - minDimension) / 2;
                const sy = (img.height - minDimension) / 2;

                // Draw resized image
                ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create image blob'));
                        }
                    },
                    'image/jpeg',
                    0.85 // Quality
                );
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Upload an icon image to Firebase Storage
 * @param uid - User ID (used for storage path)
 * @param file - The image file to upload
 * @returns Promise<string> - Download URL for the uploaded image
 */
export async function uploadIcon(uid: string, file: File): Promise<string> {
    if (!storage) {
        throw new Error('Firebase Storage is not initialized');
    }

    // Compress and resize
    const compressedBlob = await compressAndResizeImage(file, ICON_SIZE);

    // Check file size
    if (compressedBlob.size > MAX_FILE_SIZE) {
        throw new Error('Image is too large. Maximum size is 1MB.');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_icon.jpg`;
    const storagePath = `icons/${uid}/${filename}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressedBlob, {
        contentType: 'image/jpeg',
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}

/**
 * Delete an icon from Firebase Storage
 * @param url - The download URL of the icon to delete
 * @returns Promise<void>
 */
export async function deleteIcon(url: string): Promise<void> {
    if (!storage) {
        throw new Error('Firebase Storage is not initialized');
    }

    // Only delete if it's a Firebase Storage URL
    if (!url.includes('firebasestorage.googleapis.com') && !url.startsWith('gs://')) {
        console.log('Not a Firebase Storage URL, skipping delete:', url);
        return;
    }

    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch (error: any) {
        // Ignore 'object-not-found' errors
        if (error.code !== 'storage/object-not-found') {
            throw error;
        }
    }
}

/**
 * Check if a URL is a Firebase Storage URL
 * @param url - URL to check
 * @returns boolean
 */
export function isStorageUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('firebasestorage.googleapis.com') || url.startsWith('gs://');
}

/**
 * Check if a URL is a Base64 data URL
 * @param url - URL to check
 * @returns boolean
 */
export function isBase64Url(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.startsWith('data:image/');
}
