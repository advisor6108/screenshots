import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readData } from '../admin/lib/store.js';
import { generate } from '../admin/lib/generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_PATH = join(__dirname, '../docs');

const data = await readData();
await generate(data, DOCS_PATH);
console.log(`Built ${data.categories.length} category page(s) and index.html`);
