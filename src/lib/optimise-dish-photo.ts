/** Resize and recompress dish photos before storing them. Preserve the full composition. */
export async function optimiseDishPhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Please choose a JPG, PNG or WebP image.");
  }
  const bitmap = await createImageBitmap(file, {imageOrientation:"from-image"});
  try {
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to process this image.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(result => result ? resolve(result) : reject(new Error("Photo processing failed.")), "image/webp", 0.86));
    if (blob.size > 5242880) throw new Error("Optimised image is still over 5 MB.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {type:"image/webp"});
  } finally {
    bitmap.close();
  }
}
