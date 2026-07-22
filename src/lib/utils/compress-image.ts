export interface CompressedImage {
  base64: string; // Data URL or base64 string
  fileName: string;
  mimeType: string;
}

/**
 * Compresses an image file on the client side using HTML Canvas.
 * Resizes the image to a maximum width of 1920px while preserving aspect ratio.
 */
export async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("無法讀取圖片檔案"));
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("載入圖片失敗"));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("無法建立畫布處理圖片"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);

        resolve({
          base64: dataUrl,
          fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          mimeType,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
