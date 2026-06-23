"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Uploads a profile photo (as a File) to Firebase Storage and returns the
 * download URL. Stored under avatars/{email}. Resizes client-side first to
 * keep payloads small.
 */
export async function uploadProfilePhoto(email: string, file: File): Promise<string> {
  if (!storage) throw new Error("Storage not configured");
  const resized = await resizeImage(file, 320, 320);
  const r = ref(storage, `avatars/${email}.jpg`);
  await uploadBytes(r, resized, { contentType: "image/jpeg" });
  return getDownloadURL(r);
}

/** Downscale + crop to square via canvas; returns a JPEG Blob. */
function resizeImage(file: File, w: number, h: number): Promise<Blob> {
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
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
