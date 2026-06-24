import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { makeSlug } from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_PATH = join(__dirname, '../../docs');

let tesseractWorker = null;

export async function initWorker() {
  tesseractWorker = await Tesseract.createWorker('eng', 1, {
    logger: () => {},
  });
}

export async function terminateWorker() {
  if (tesseractWorker) await tesseractWorker.terminate();
}

export async function processImage(buffer, originalName, categorySlug, skipOcr = false) {
  const id = nanoid(8);
  const slug = makeSlug(originalName);
  const filenameBase = `${slug}-${id}`;
  const categoryDir = join(DOCS_PATH, 'images', categorySlug);

  await mkdir(categoryDir, { recursive: true });

  const thumbFile = `thumb_${filenameBase}.webp`;
  const fullFile = `full_${filenameBase}.webp`;
  const thumbPath = `images/${categorySlug}/${thumbFile}`;
  const fullPath = `images/${categorySlug}/${fullFile}`;

  const [thumbMeta] = await Promise.all([
    sharp(buffer)
      .resize(800, null, { withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(join(categoryDir, thumbFile))
      .then(meta => meta),
    sharp(buffer)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(join(categoryDir, fullFile)),
  ]);

  let ocrText = '';
  let ocrConfidence = 0;
  if (!skipOcr) {
    const { data } = await tesseractWorker.recognize(buffer);
    ocrText = data.text.trim();
    ocrConfidence = Math.round(data.confidence * 10) / 10;
  }

  return {
    id,
    originalName,
    slug,
    category: categorySlug,
    uploadedAt: new Date().toISOString(),
    thumbPath,
    fullPath,
    thumbWidth: thumbMeta.width,
    thumbHeight: thumbMeta.height,
    ocrText,
    ocrConfidence,
  };
}

export async function processBatch(files, categorySlug, skipOcr = false) {
  return Promise.all(
    files.map(f => processImage(f.buffer, f.originalname, categorySlug, skipOcr))
  );
}
