
/**
 * Compresses a base64 image string to a target size (default < 1MB)
 * using HTML5 Canvas.
 */
export const compressImage = async (
  base64Str: string, 
  maxWidth = 1280, 
  maxHeight = 1280, 
  initialQuality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = initialQuality;
      let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Iteratively reduce quality if the image is still over 1MB (approx 1.33MB base64)
      // 1MB = 1048576 bytes. Base64 is ~33% larger.
      const MAX_BYTE_SIZE = 1024 * 1024;
      
      while (compressedDataUrl.length * 0.75 > MAX_BYTE_SIZE && quality > 0.1) {
        quality -= 0.1;
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      
      resolve(compressedDataUrl);
    };
    img.onerror = (error) => reject(error);
  });
};
