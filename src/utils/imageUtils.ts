
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
    
    // Set a timeout for image loading
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

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

      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = initialQuality;
      let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      const MAX_BYTE_SIZE = 1024 * 1024;
      
      // Limit iterations to prevent infinite loop or long hangs
      let iterations = 0;
      while (compressedDataUrl.length * 0.75 > MAX_BYTE_SIZE && quality > 0.1 && iterations < 5) {
        quality -= 0.15;
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        iterations++;
      }
      
      resolve(compressedDataUrl);
    };
    img.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };
    img.src = base64Str;
  });
};

/**
 * Compresses an image specifically for chat (smaller size, faster upload)
 */
export const compressForChat = async (base64Str: string): Promise<string> => {
  // 600px max width/height, 0.5 quality is very small and fast to upload
  return compressImage(base64Str, 600, 600, 0.5);
};

/**
 * Converts a base64 Data URL to a Blob object.
 */
export const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

/**
 * Compresses an image and returns it as a Blob.
 */
export const compressImageToBlob = async (
  base64Str: string,
  maxWidth = 1280,
  maxHeight = 1280,
  initialQuality = 0.8
): Promise<Blob> => {
  const compressedBase64 = await compressImage(base64Str, maxWidth, maxHeight, initialQuality);
  return base64ToBlob(compressedBase64);
};
