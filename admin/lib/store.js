import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../../data/data.json');

export async function readData() {
  const raw = await readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

export async function writeData(data) {
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function addCategory(slug, label) {
  const data = await readData();
  if (data.categories.find(c => c.slug === slug)) return data;
  data.categories.push({ slug, label });
  await writeData(data);
  return data;
}

export async function addImages(newImages) {
  const data = await readData();
  data.images.push(...newImages);
  await writeData(data);
  return data;
}

export async function removeImage(id) {
  const data = await readData();
  const img = data.images.find(i => i.id === id);
  data.images = data.images.filter(i => i.id !== id);
  await writeData(data);
  return img;
}

export function makeSlug(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeCategorySlug(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
