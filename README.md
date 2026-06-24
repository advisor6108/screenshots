# Screenshots Gallery

A personal image gallery hosted on GitHub Pages. Upload screenshots in bulk, optionally extract text from them via OCR, and publish them organized by category — all from a local admin tool.

## What it does

- **Bulk image upload** — drag and drop multiple images at once into the local admin UI
- **WebP compression** — images are automatically converted to WebP at medium quality (thumbnails at 70%, full-size at 75%) using `sharp`
- **OCR text extraction** — optionally scans images for text using `tesseract.js` and displays it below each image on the gallery
- **Category organization** — choose an existing category or create a new one; each category gets its own page
- **Static site output** — generates plain HTML/CSS files into `docs/`, which GitHub Pages serves as a public website
- **Click to expand** — each image opens at full size in a new tab when clicked

## Live site

[https://advisor6108.github.io/screenshots/](https://advisor6108.github.io/screenshots/)

## Running locally

### 1. Install dependencies (first time only)

```bash
npm install
```

### 2. Start the admin server

```bash
npm run serve
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Upload images

1. Select or create a category
2. Check **Skip text extraction** if you don't need OCR (faster)
3. Drag and drop images into the upload area
4. Click **Process images**
5. Review the preview — remove any images with the **×** button if needed
6. Click **Save all to gallery**

### 4. Preview the site locally

```bash
npm run preview
```

Opens the static site at [http://localhost:3000/site/](http://localhost:3000/site/) while the admin server is running, or run `npm run preview` separately to serve `docs/` directly.

### 5. Publish to GitHub Pages

```bash
git add docs/ data/data.json
git commit -m "Add images to <category>"
git push origin main
```

GitHub Pages deploys automatically from the `docs/` folder within ~1 minute.

## Project structure

```
screenshots/
├── admin/              # Local admin tool (never published)
│   ├── server.js       # Express server (npm run serve)
│   ├── lib/
│   │   ├── processor.js    # sharp compression + tesseract OCR
│   │   ├── generator.js    # HTML generation from data.json
│   │   └── store.js        # Read/write data.json
│   └── public/         # Admin UI (HTML/CSS/JS)
├── data/
│   └── data.json       # Source of truth for all image metadata
├── docs/               # Static site — served by GitHub Pages
│   ├── index.html
│   ├── assets/
│   ├── images/
│   └── categories/
├── scripts/
│   └── build.js        # Regenerate all HTML without starting the server
└── package.json
```

## Other commands

```bash
npm run build     # Regenerate all HTML from data.json (no server needed)
npm run preview   # Preview the docs/ site locally
```
