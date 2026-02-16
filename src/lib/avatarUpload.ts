import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { updateAvatarUrl } from './db';

const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.8;

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = MAX_DIMENSION;
      canvas.height = MAX_DIMENSION;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_DIMENSION, MAX_DIMENSION);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadAvatar(userName: string, file: File): Promise<string> {
  const resizedBlob = await resizeImage(file);

  const storageRef = ref(storage, `avatars/${userName.toLowerCase()}.jpg`);
  await uploadBytes(storageRef, resizedBlob, { contentType: 'image/jpeg' });

  const downloadUrl = await getDownloadURL(storageRef);
  await updateAvatarUrl(userName, downloadUrl);

  return downloadUrl;
}

export async function removeAvatar(userName: string): Promise<void> {
  await updateAvatarUrl(userName, '');
}
