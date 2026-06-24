// Admin UI — controls upload flow, preview, and save

const $ = id => document.getElementById(id);

// ── State ──
let selectedFiles = [];
let previewResults = [];

// ── Panels ──
const panels = {
  upload: $('panel-upload'),
  preview: $('panel-preview'),
  done: $('panel-done'),
};
function showPanel(name) {
  Object.values(panels).forEach(p => p.classList.add('hidden'));
  panels[name].classList.remove('hidden');
}

// ── Load categories on startup ──
async function loadCategories(selectValue = '') {
  const data = await apiFetch('/api/data');
  const sel = $('cat-select');
  sel.innerHTML = '<option value="">— select —</option>';
  data.categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.slug;
    opt.textContent = c.label;
    if (c.slug === selectValue) opt.selected = true;
    sel.appendChild(opt);
  });
  updateProcessBtn();
}

// ── New category form ──
$('new-cat-toggle').addEventListener('click', () => {
  $('new-cat-form').classList.toggle('hidden');
  $('new-cat-input').focus();
});

$('create-cat-btn').addEventListener('click', async () => {
  const label = $('new-cat-input').value.trim();
  if (!label) return;
  $('create-cat-btn').disabled = true;
  try {
    const cat = await apiFetch('/api/category', 'POST', { label });
    $('new-cat-input').value = '';
    $('new-cat-hint').textContent = `Created "${cat.label}"`;
    $('new-cat-form').classList.add('hidden');
    await loadCategories(cat.slug);
  } catch (e) {
    $('new-cat-hint').textContent = 'Error: ' + e.message;
  }
  $('create-cat-btn').disabled = false;
});

$('cat-select').addEventListener('change', updateProcessBtn);

// ── File input / drag-and-drop ──
const dropZone = $('drop-zone');
const fileInput = $('file-input');

dropZone.addEventListener('click', e => {
  if (e.target.tagName !== 'LABEL') fileInput.click();
});
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  addFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener('change', () => addFiles([...fileInput.files]));

function addFiles(files) {
  const images = files.filter(f => f.type.startsWith('image/'));
  images.forEach(f => {
    if (!selectedFiles.find(sf => sf.name === f.name && sf.size === f.size)) {
      selectedFiles.push(f);
    }
  });
  renderFileList();
  updateProcessBtn();
}

function renderFileList() {
  const list = $('file-list');
  list.innerHTML = '';
  selectedFiles.forEach((f, i) => {
    const tag = document.createElement('div');
    tag.className = 'file-tag';
    tag.innerHTML = `<span>${esc(f.name)}</span><button title="Remove" data-i="${i}">×</button>`;
    list.appendChild(tag);
  });
  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(Number(btn.dataset.i), 1);
      renderFileList();
      updateProcessBtn();
    });
  });
}

function updateProcessBtn() {
  const btn = $('process-btn');
  btn.disabled = !($('cat-select').value && selectedFiles.length > 0);
}

// ── Process (upload + OCR) ──
$('process-btn').addEventListener('click', async () => {
  const category = $('cat-select').value;
  if (!category || !selectedFiles.length) return;

  const statusEl = $('upload-status');
  statusEl.textContent = `Processing ${selectedFiles.length} image(s)… this may take a moment.`;
  statusEl.className = 'status-msg';
  statusEl.classList.remove('hidden');
  $('process-btn').disabled = true;

  try {
    const form = new FormData();
    form.append('category', category);
    selectedFiles.forEach(f => form.append('images', f));

    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    previewResults = await res.json();
    renderPreview();
    showPanel('preview');
    statusEl.classList.add('hidden');
  } catch (e) {
    statusEl.textContent = 'Error: ' + e.message;
    statusEl.className = 'status-msg error';
    $('process-btn').disabled = false;
  }
});

// ── Preview grid ──
function renderPreview() {
  const grid = $('preview-grid');
  grid.innerHTML = '';
  previewResults.forEach((img, i) => {
    const card = document.createElement('div');
    card.className = 'preview-card';
    const isLowConf = img.ocrConfidence < 30;
    card.innerHTML = `
      <img src="${img.previewDataUrl}" alt="">
      <div class="preview-card-body">
        <label>Extracted text</label>
        <textarea data-i="${i}">${esc(img.ocrText)}</textarea>
        <span class="confidence-badge ${isLowConf ? 'low' : ''}">
          OCR confidence: ${img.ocrConfidence}%${isLowConf ? ' ⚠' : ''}
        </span>
        <p class="preview-filename">${esc(img.originalName)}</p>
      </div>`;
    grid.appendChild(card);
  });

  // Sync textarea edits back to previewResults
  grid.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      previewResults[Number(ta.dataset.i)].ocrText = ta.value;
    });
  });
}

// ── Save ──
$('save-btn').addEventListener('click', async () => {
  const statusEl = $('save-status');
  statusEl.textContent = 'Saving…';
  statusEl.className = 'status-msg';
  statusEl.classList.remove('hidden');
  $('save-btn').disabled = true;

  try {
    const res = await apiFetch('/api/save', 'POST', { images: previewResults });
    const catLabel = $('cat-select').options[$('cat-select').selectedIndex].text;
    $('done-msg').textContent =
      `${res.saved} image(s) saved to "${catLabel}" and gallery pages updated.`;
    showPanel('done');
  } catch (e) {
    statusEl.textContent = 'Error: ' + e.message;
    statusEl.className = 'status-msg error';
    $('save-btn').disabled = false;
  }
});

// ── Back ──
$('back-btn').addEventListener('click', () => {
  showPanel('upload');
  $('process-btn').disabled = false;
});

// ── Upload more ──
$('upload-more-btn').addEventListener('click', () => {
  selectedFiles = [];
  previewResults = [];
  renderFileList();
  $('process-btn').disabled = true;
  showPanel('upload');
});

// ── Helpers ──
async function apiFetch(url, method = 'GET', body = null) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──
loadCategories();
