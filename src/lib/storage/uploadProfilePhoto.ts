"use client";

/**
 * Converts a profile photo (as a File) to a Base64 string.
 * Resizes client-side first to keep payloads small so it can be stored directly 
 * in the database without needing Firebase Storage (which requires a paid plan).
 */
export async function uploadProfilePhoto(email: string, file: File): Promise<string> {
  const dataUrl = await resizeAndConvertToDataUrl(file, 320, 320);
  return dataUrl;
}

/** Downscale + crop to square via canvas; returns a JPEG Data URL string. */
function resizeAndConvertToDataUrl(file: File, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas unsupported"));
      ctx.drawImage(img, sx, sy, size, size, 0, 0, w, h);
      
      // Convert directly to a base64 string
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
