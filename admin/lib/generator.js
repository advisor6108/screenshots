import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len).trimEnd() + '…' : str;
}

function renderSidebar(categories, fromRoot = true) {
  const prefix = fromRoot ? 'categories/' : '';
  const items = categories.map(c =>
    `<li><a href="${prefix}${escapeHtml(c.slug)}.html">${escapeHtml(c.label)}</a></li>`
  ).join('\n        ');
  return `
    <aside class="sidebar">
      <h2>Categories</h2>
      <ul>
        ${items || '<li><em>No categories yet</em></li>'}
      </ul>
    </aside>`;
}

function renderHeader(title, backLink = null) {
  const back = backLink
    ? `<a class="back-link" href="${backLink}">← All categories</a>`
    : '';
  return `
  <header class="site-header">
    <a class="site-title" href="${backLink ? '../index.html' : 'index.html'}">Screenshots Gallery</a>
    ${back}
    <span class="site-subtitle">${escapeHtml(title)}</span>
  </header>`;
}

function renderImageCard(img, fromCategory = false) {
  const prefix = fromCategory ? '../' : '';
  const confidence = img.ocrConfidence < 30 && img.ocrText
    ? `<span class="low-confidence" title="Low OCR confidence (${img.ocrConfidence}%)">⚠ low confidence</span>`
    : '';
  return `
      <figure class="image-card">
        <a href="${prefix}${escapeHtml(img.fullPath)}" target="_blank" rel="noopener">
          <img src="${prefix}${escapeHtml(img.thumbPath)}"
               alt="${escapeHtml(truncate(img.ocrText, 120))}"
               width="${img.thumbWidth}" height="${img.thumbHeight}"
               loading="lazy">
        </a>
        <figcaption class="ocr-text">
          ${confidence}
          ${escapeHtml(img.ocrText) || '<em class="no-text">No text detected</em>'}
        </figcaption>
      </figure>`;
}

function renderPage({ title, mainContent, categories, fromRoot = true }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Screenshots Gallery</title>
  <link rel="stylesheet" href="${fromRoot ? '' : '../'}assets/site.css">
  <script defer src="${fromRoot ? '' : '../'}assets/site.js"></script>
</head>
<body>
  ${renderHeader(title, fromRoot ? null : '../index.html')}
  <div class="layout">
    <main class="content">
      ${mainContent}
    </main>
    ${renderSidebar(categories, fromRoot)}
  </div>
  <footer class="site-footer">
    <p>Screenshots Gallery</p>
  </footer>
</body>
</html>`;
}

function renderIndexMain(categories, images) {
  if (categories.length === 0) {
    return `<p class="empty-state">No images yet. Run <code>npm run serve</code> locally to upload images.</p>`;
  }
  const cards = categories.map(cat => {
    const catImages = images.filter(i => i.category === cat.slug);
    const preview = catImages[0]
      ? `<img src="${escapeHtml(catImages[0].thumbPath)}" alt="" loading="lazy">`
      : `<div class="cat-placeholder"></div>`;
    return `
    <a class="category-card" href="categories/${escapeHtml(cat.slug)}.html">
      ${preview}
      <div class="cat-info">
        <strong>${escapeHtml(cat.label)}</strong>
        <span>${catImages.length} image${catImages.length !== 1 ? 's' : ''}</span>
      </div>
    </a>`;
  }).join('\n');
  return `<h1>All Categories</h1>\n<div class="category-grid">${cards}\n</div>`;
}

function renderCategoryMain(category, images) {
  if (images.length === 0) {
    return `<h1>${escapeHtml(category.label)}</h1><p class="empty-state">No images in this category yet.</p>`;
  }
  const cards = images.map(img => renderImageCard(img, true)).join('\n');
  return `<h1>${escapeHtml(category.label)}</h1>\n<div class="image-grid">${cards}\n</div>`;
}

export async function generate(data, docsPath) {
  await mkdir(join(docsPath, 'categories'), { recursive: true });

  const indexHtml = renderPage({
    title: 'All Categories',
    mainContent: renderIndexMain(data.categories, data.images),
    categories: data.categories,
    fromRoot: true,
  });
  await writeFile(join(docsPath, 'index.html'), indexHtml, 'utf8');

  for (const cat of data.categories) {
    const catImages = data.images.filter(i => i.category === cat.slug);
    const catHtml = renderPage({
      title: cat.label,
      mainContent: renderCategoryMain(cat, catImages),
      categories: data.categories,
      fromRoot: false,
    });
    await writeFile(join(docsPath, 'categories', `${cat.slug}.html`), catHtml, 'utf8');
  }
}
