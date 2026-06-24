import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlink } from 'fs/promises';
import { readData, addCategory, addImages, removeImage, makeCategorySlug } from './lib/store.js';
import { processBatch, initWorker, terminateWorker } from './lib/processor.js';
import { generate } from './lib/generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_PATH = join(__dirname, '../docs');
const PORT = 3000;

const app = express();
app.use(express.json());
app.use('/site', express.static(DOCS_PATH));
app.use(express.static(join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
});

// Return full data.json
app.get('/api/data', async (req, res) => {
  try {
    res.json(await readData());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a new category
app.post('/api/category', async (req, res) => {
  try {
    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'Label is required' });
    const slug = makeCategorySlug(label.trim());
    const data = await addCategory(slug, label.trim());
    await generate(data, DOCS_PATH);
    res.json({ slug, label: label.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload images: compress + OCR, return preview (does NOT write to data.json yet)
app.post('/api/upload', upload.array('images', 50), async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: 'Category is required' });
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    const results = await processBatch(req.files, category);

    // Return thumbnail as base64 for preview in admin UI
    const previews = await Promise.all(results.map(async r => {
      const { readFile } = await import('fs/promises');
      const thumbBuf = await readFile(join(DOCS_PATH, r.thumbPath));
      return { ...r, previewDataUrl: `data:image/webp;base64,${thumbBuf.toString('base64')}` };
    }));

    res.json(previews);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save confirmed images to data.json and regenerate HTML
app.post('/api/save', async (req, res) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'images array is required' });
    }
    // Strip previewDataUrl before saving
    const clean = images.map(({ previewDataUrl: _, ...rest }) => rest);
    const data = await addImages(clean);
    await generate(data, DOCS_PATH);
    res.json({ saved: clean.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete an image by id
app.delete('/api/image/:id', async (req, res) => {
  try {
    const img = await removeImage(req.params.id);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    const tryDelete = async p => {
      try { await unlink(join(DOCS_PATH, p)); } catch {}
    };
    await Promise.all([tryDelete(img.thumbPath), tryDelete(img.fullPath)]);

    const data = await readData();
    await generate(data, DOCS_PATH);
    res.json({ deleted: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Startup
console.log('Initializing Tesseract OCR worker…');
await initWorker();
console.log('OCR worker ready.');

app.listen(PORT, () => {
  console.log(`Admin server running at http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await terminateWorker();
  process.exit(0);
});
