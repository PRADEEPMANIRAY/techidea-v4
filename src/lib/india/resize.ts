import { inspectImage, MAX_IMAGE_BYTES, validateDimensions, type ImageFormat } from '../utilities/image.ts';
export type ResizeMode = 'fit' | 'crop';
export function resizeGeometry(sourceWidth: number, sourceHeight: number, width: number, height: number, mode: ResizeMode) {
  validateDimensions(sourceWidth, sourceHeight); validateDimensions(width, height);
  if (mode !== 'fit' && mode !== 'crop') throw new Error('Choose fit or crop.');
  const scale = mode === 'fit' ? Math.min(width / sourceWidth, height / sourceHeight) : Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale, drawHeight = sourceHeight * scale;
  return { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight };
}
export function validateTarget(width: number, height: number, kb: number) {
  validateDimensions(width, height);
  if (!Number.isFinite(kb) || kb < 1 || kb > 10240) throw new Error('Target size must be from 1 to 10,240 KB (1 KB = 1,024 bytes).');
  return Math.floor(kb * 1024);
}
export async function encodeTarget(encode: (quality: number) => Promise<Blob>, format: ImageFormat, maxBytes: number) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(format)) throw new Error('Choose JPEG, PNG or WebP.');
  let smallest: Blob | undefined;
  // A bounded descending search does not assume file size is monotonic with quality.
  for (let step = 20; step >= 1; step--) {
    const blob = await encode(step / 20);
    if (!blob.size || blob.type !== format) throw new Error('The browser cannot encode the selected format. Try JPEG or PNG.');
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= maxBytes) return { blob, achieved: true, quality: step / 20 };
    if (format === 'image/png') break;
  }
  return { blob: smallest!, achieved: false, quality: null };
}
export async function resizeImage(file: File, width: number, height: number, kb: number, mode: ResizeMode, format: ImageFormat) {
  const limit = validateTarget(width, height, kb);
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image of at most 10 MiB.');
  inspectImage(new Uint8Array(await file.arrayBuffer()), file.type);
  const url = URL.createObjectURL(file), source = new Image(), canvas = document.createElement('canvas');
  try {
    source.src = url;
    await source.decode().catch(() => { throw new Error('This image could not be decoded. Choose a valid still image.'); });
    const geometry = resizeGeometry(source.naturalWidth, source.naturalHeight, width, height, mode);
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable in this browser.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, geometry.x, geometry.y, geometry.width, geometry.height);
    const result = await encodeTarget(quality => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Encoding failed. Try smaller dimensions.')), format, quality)), format, limit);
    return { ...result, width, height, limit };
  } finally { canvas.width = 0; canvas.height = 0; source.src = ''; URL.revokeObjectURL(url); }
}
