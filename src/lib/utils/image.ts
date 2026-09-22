export async function compressImage(
  imageBase64: string,
  maxWidth: number = 1024,
  quality: number = 80
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality / 100));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageBase64;
  });
}

export async function canvasToBase64(
  canvas: HTMLCanvasElement
): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      0.8
    );
  });
}

export function validateImageFile(file: File, maxSize: number = 5 * 1024 * 1024): string | null {
  if (!file.type.startsWith('image/')) {
    return '이미지 파일만 업로드 가능합니다.';
  }
  if (file.size > maxSize) {
    return `파일 크기는 ${maxSize / (1024 * 1024)}MB 이하여야 합니다.`;
  }
  return null;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
