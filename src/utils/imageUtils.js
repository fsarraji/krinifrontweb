const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de lire l'image"));
    img.src = src;
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

/**
 * Redimensionne et re-compresse une image côté navigateur avant upload.
 * - PNG : conservé en PNG (transparence préservée pour logos/cachets).
 * - JPG/autres : ré-encodé en JPEG.
 * - Non-image (PDF, SVG, GIF...) : renvoyé tel quel.
 */
export async function optimizeImageFile(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  try {
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);
    const isPng = file.type === 'image/png';
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const outW = Math.max(1, Math.round(img.width * scale));
    const outH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!isPng) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
    } else {
      ctx.clearRect(0, 0, outW, outH);
    }
    ctx.drawImage(img, 0, 0, outW, outH);

    const mime = isPng ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, mime, isPng ? undefined : quality);
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'document';
    return new File([blob], `${baseName}${isPng ? '.png' : '.jpg'}`, { type: mime });
  } catch (err) {
    console.error("Optimisation d'image ignorée :", err);
    return file;
  }
}
