// main.js — the Vice Coast Cover Studio editor (round 8). Wires the
// three-step flow (add photos, pick a size, export PNG) to the poster
// engine: photos and the studio's own sample scenes spread across the
// panels of a layout, each panel keeps its own crop, zoom, pan, flip
// and ink, the caption and dressing are editable, the title drags, and
// export writes a real PNG at 1080 x 1080, 1080 x 1350 or 1920 x 1080.
// Everything runs locally; no photo ever leaves the machine.

import { GRADE_ORDER, GRADES, LAYOUT_ORDER, LAYOUTS, composeCover, panelsFor, polygonBounds } from './poster.js';
import { loadAllSampleScenes } from './samples.js';

const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1350': [1080, 1350],
  '1080x1080': [1080, 1080],
};

const state = {
  photos: [],
  selectedPhoto: 0,
  panelPhotos: [],
  panelViews: [],
  panelInk: [],
  selectedPanel: 0,
  layout: 'comicA',
  grade: 'sunset',
  size: '1080x1350',
  ink: 0.65,
  effect: 0.8,
  grain: 0.5,
  vignette: 0.45,
  title: 'NEON HARBOR',
  subtitle: 'Salt & Sirens',
  tagline: 'One shoreline · No curfew · All summer',
  quote: 'A postcard that bites back',
  quoteSource: 'The Harbor Review',
  sealLine1: 'Handmade',
  sealLine2: 'Cover art',
  titleY: 0.52,
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

function currentPanels() {
  const [w, h] = SIZES[state.size];
  return panelsFor(state.layout, w / h);
}

function ensurePanelSlots() {
  const count = currentPanels().length;
  while (state.panelViews.length < count) state.panelViews.push({ zoom: 1, panX: 0, panY: 0, flip: false });
  while (state.panelInk.length < count) state.panelInk.push(null);
  if (state.panelPhotos.length === 0 && state.photos.length > 0) spreadPhotos();
}

function spreadPhotos() {
  const panels = currentPanels();
  state.panelPhotos = panels.map((_, i) => state.photos[i % state.photos.length]);
  state.selectedPanel = 0;
  renderPanelStrip();
}

function renderThumbs() {
  const grid = $('thumbGrid');
  grid.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = photo.canvas || photo.img;
    const el = document.createElement('canvas');
    el.width = 96;
    el.height = 72;
    el.getContext('2d').drawImage(thumb, 0, 0, 96, 72);
    el.title = photo.name;
    if (i === state.selectedPhoto) el.className = 'picked';
    el.addEventListener('click', () => {
      state.selectedPhoto = i;
      renderThumbs();
    });
    el.draggable = true;
    el.addEventListener('dragstart', (ev) => ev.dataTransfer.setData('text/plain', String(i)));
    grid.appendChild(el);
  });
  $('photoCount').textContent = `${state.photos.length} loaded`;
}

function renderPanelStrip() {
  const strip = $('panelStrip');
  strip.innerHTML = '';
  currentPanels().forEach((_, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = String(i + 1);
    if (i === state.selectedPanel) btn.className = 'active';
    btn.addEventListener('click', () => selectPanel(i));
    strip.appendChild(btn);
  });
  $('panelLabel').textContent = `${state.selectedPanel + 1} of ${currentPanels().length}`;
}

function selectPanel(i) {
  state.selectedPanel = i;
  const view = state.panelViews[i] || { zoom: 1, panX: 0, panY: 0 };
  $('panelZoom').value = view.zoom;
  $('panelZoomVal').textContent = `${Number(view.zoom).toFixed(1)}×`;
  $('panelPanX').value = view.panX;
  $('panelPanY').value = view.panY;
  const ink = state.panelInk[i] != null ? state.panelInk[i] : state.ink;
  $('panelInk').value = ink;
  $('panelInkVal').textContent = Number(ink).toFixed(2);
  renderPanelStrip();
}

function renderLayoutGrid() {
  const grid = $('layoutGrid');
  grid.innerHTML = '';
  for (const id of LAYOUT_ORDER) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `layout-cell${id === state.layout ? ' active' : ''}`;
    const map = document.createElement('canvas');
    map.width = 84;
    map.height = 40;
    const mctx = map.getContext('2d');
    mctx.fillStyle = '#160a24';
    mctx.fillRect(0, 0, 84, 40);
    const panels = LAYOUTS[id].panels();
    panels.forEach((poly, i) => {
      mctx.beginPath();
      poly.forEach(([x, y], j) => {
        if (j === 0) mctx.moveTo(x * 84, y * 40);
        else mctx.lineTo(x * 84, y * 40);
      });
      mctx.closePath();
      mctx.fillStyle = `hsl(${280 + i * 24}, 65%, ${38 + i * 5}%)`;
      mctx.fill();
      mctx.strokeStyle = '#f5efe2';
      mctx.lineWidth = 1;
      mctx.stroke();
    });
    cell.appendChild(map);
    const label = document.createElement('span');
    label.textContent = LAYOUTS[id].name;
    cell.appendChild(label);
    cell.addEventListener('click', () => {
      state.layout = id;
      ensurePanelSlots();
      if (state.photos.length) spreadPhotos();
      renderLayoutGrid();
      draw();
    });
    grid.appendChild(cell);
  }
}

function renderGradeGrid() {
  const grid = $('gradeGrid');
  grid.innerHTML = '';
  for (const id of GRADE_ORDER) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `grade-cell${id === state.grade ? ' active' : ''}`;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.background = `linear-gradient(90deg, ${GRADES[id].ramp.join(', ')})`;
    cell.appendChild(bar);
    cell.appendChild(document.createTextNode(GRADES[id].name));
    cell.addEventListener('click', () => {
      state.grade = id;
      renderGradeGrid();
      draw();
    });
    grid.appendChild(cell);
  }
}

// The effect-strength slider scales the poster ink the composer sees,
// so the finish controls read as one family: ink sets the look, effect
// strength sets how hard it is applied.
function effectiveState() {
  return { ...state, ink: state.ink * (0.3 + 0.7 * state.effect) };
}

let drawQueued = false;
function draw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    ensurePanelSlots();
    const [w, h] = SIZES[state.size];
    const scale = Math.min(1, 880 / w, 1080 / h);
    const pw = Math.round(w * scale);
    const ph = Math.round(h * scale);
    if (preview.width !== pw || preview.height !== ph) {
      preview.width = pw;
      preview.height = ph;
    }
    const cover = composeCover(pw, ph, effectiveState());
    pctx.clearRect(0, 0, pw, ph);
    pctx.drawImage(cover, 0, 0);
  });
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cover';
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function exportSize(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const cover = composeCover(w, h, effectiveState());
  const blob = await new Promise((resolve) => cover.toBlob(resolve, 'image/png'));
  const name = `${slug(state.title)}-${w}x${h}.png`;
  saveBlob(blob, name);
  return name;
}

async function exportAllSizes() {
  const saved = [];
  for (const key of Object.keys(SIZES)) saved.push(await exportSize(key));
  $('savedNote').textContent = `Saved ${saved.join(' · ')}`;
}

function addPhotoFiles(files) {
  let pending = files.length;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.photos.push({ id: `photo-${Date.now()}-${state.photos.length}`, name: file.name, img });
      pending -= 1;
      if (pending === 0) {
        spreadPhotos();
        renderThumbs();
        draw();
      }
    };
    img.src = url;
  }
}

function loadSamples() {
  const samples = loadAllSampleScenes();
  state.photos = samples.map((s) => ({ id: s.id, name: s.name, canvas: s.canvas }));
  state.selectedPhoto = 0;
  spreadPhotos();
  renderThumbs();
  draw();
}

// ---------- wiring ----------

$('fileInput').addEventListener('change', (ev) => addPhotoFiles([...ev.target.files]));
$('loadSamples').addEventListener('click', loadSamples);
$('spreadPhotos').addEventListener('click', () => { spreadPhotos(); draw(); });
$('onePhotoMode').addEventListener('click', () => {
  const photo = state.photos[state.selectedPhoto];
  if (!photo) return;
  const panels = currentPanels();
  state.panelPhotos = panels.map(() => photo);
  // a different crop in each panel of the one photo
  state.panelViews = panels.map((_, i) => ({
    zoom: 1.15 + (i % 3) * 0.25,
    panX: ((i * 37) % 10) / 10 - 0.5,
    panY: ((i * 53) % 10) / 10 - 0.5,
    flip: i % 4 === 3,
  }));
  selectPanel(0);
  draw();
});
$('exportOne').addEventListener('click', async () => {
  const name = await exportSize(state.size);
  $('savedNote').textContent = `Saved ${name}`;
});
$('exportAll').addEventListener('click', exportAllSizes);
$('exportAllTop').addEventListener('click', exportAllSizes);

for (const tab of document.querySelectorAll('.size-tab')) {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.size-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.size = tab.dataset.size;
    ensurePanelSlots();
    draw();
  });
}

$('panelZoom').addEventListener('input', (ev) => {
  state.panelViews[state.selectedPanel].zoom = Number(ev.target.value);
  $('panelZoomVal').textContent = `${Number(ev.target.value).toFixed(1)}×`;
  draw();
});
$('panelPanX').addEventListener('input', (ev) => { state.panelViews[state.selectedPanel].panX = Number(ev.target.value); draw(); });
$('panelPanY').addEventListener('input', (ev) => { state.panelViews[state.selectedPanel].panY = Number(ev.target.value); draw(); });
$('panelInk').addEventListener('input', (ev) => {
  state.panelInk[state.selectedPanel] = Number(ev.target.value);
  $('panelInkVal').textContent = Number(ev.target.value).toFixed(2);
  draw();
});
$('panelUseSelected').addEventListener('click', () => {
  const photo = state.photos[state.selectedPhoto];
  if (!photo) return;
  state.panelPhotos[state.selectedPanel] = photo;
  draw();
});
$('panelFlip').addEventListener('click', () => {
  const view = state.panelViews[state.selectedPanel];
  view.flip = !view.flip;
  draw();
});
$('panelCenter').addEventListener('click', () => {
  state.panelViews[state.selectedPanel] = { zoom: 1, panX: 0, panY: 0, flip: false };
  selectPanel(state.selectedPanel);
  draw();
});
$('inkAll').addEventListener('input', (ev) => {
  state.ink = Number(ev.target.value);
  $('inkAllVal').textContent = state.ink.toFixed(2);
  draw();
});
$('effectStrength').addEventListener('input', (ev) => { state.effect = Number(ev.target.value); draw(); });
$('grainAmt').addEventListener('input', (ev) => { state.grain = Number(ev.target.value); draw(); });
$('vignetteAmt').addEventListener('input', (ev) => { state.vignette = Number(ev.target.value); draw(); });

const fieldMap = [
  ['fldTitle', 'title'], ['fldSubtitle', 'subtitle'], ['fldTagline', 'tagline'],
  ['fldQuote', 'quote'], ['fldQuoteSource', 'quoteSource'],
  ['fldSeal1', 'sealLine1'], ['fldSeal2', 'sealLine2'],
];
for (const [id, key] of fieldMap) {
  $(id).addEventListener('input', (ev) => { state[key] = ev.target.value; draw(); });
}
$('titlePos').addEventListener('change', (ev) => {
  state.titleY = ev.target.value === 'top' ? 0.27 : ev.target.value === 'bottom' ? 0.74 : 0.52;
  draw();
});

// drag on the preview: pan the panel under the pointer, or drag the
// title when the press starts on the title band.
let drag = null;
function pointerPanel(ev) {
  const rect = preview.getBoundingClientRect();
  const nx = (ev.clientX - rect.left) / rect.width;
  const ny = (ev.clientY - rect.top) / rect.height;
  const panels = currentPanels();
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const b = polygonBounds(panels[i]);
    if (nx >= b.x && nx <= b.x + b.w && ny >= b.y && ny <= b.y + b.h) return { index: i, nx, ny };
  }
  return { index: 0, nx, ny };
}
preview.addEventListener('pointerdown', (ev) => {
  const hit = pointerPanel(ev);
  const onTitle = Math.abs(hit.ny - state.titleY) < 0.13;
  drag = { ...hit, startX: ev.clientX, startY: ev.clientY, mode: onTitle ? 'title' : 'pan', view: { ...state.panelViews[hit.index] }, titleY: state.titleY };
  selectPanel(hit.index);
  preview.setPointerCapture(ev.pointerId);
});
preview.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const rect = preview.getBoundingClientRect();
  const dx = (ev.clientX - drag.startX) / rect.width;
  const dy = (ev.clientY - drag.startY) / rect.height;
  if (drag.mode === 'title') {
    state.titleY = Math.min(0.8, Math.max(0.18, drag.titleY + dy));
  } else {
    const view = state.panelViews[drag.index];
    view.panX = Math.min(1, Math.max(-1, drag.view.panX + dx * 1.6));
    view.panY = Math.min(1, Math.max(-1, drag.view.panY + dy * 1.6));
  }
  draw();
});
preview.addEventListener('pointerup', () => { drag = null; });
preview.addEventListener('dblclick', (ev) => {
  const hit = pointerPanel(ev);
  state.panelViews[hit.index] = { zoom: 1, panX: 0, panY: 0, flip: false };
  selectPanel(hit.index);
  draw();
});
preview.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const hit = pointerPanel(ev);
  const view = state.panelViews[hit.index];
  view.zoom = Math.min(3, Math.max(1, view.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
  selectPanel(hit.index);
  draw();
}, { passive: false });
preview.addEventListener('dragover', (ev) => ev.preventDefault());
preview.addEventListener('drop', (ev) => {
  ev.preventDefault();
  const idx = Number(ev.dataTransfer.getData('text/plain'));
  if (Number.isInteger(idx) && state.photos[idx]) {
    const hit = pointerPanel(ev);
    state.panelPhotos[hit.index] = state.photos[idx];
    draw();
  } else if (ev.dataTransfer.files.length) {
    addPhotoFiles([...ev.dataTransfer.files]);
  }
});

// ---------- screenshot modes (used by the maker's own shots.json) ----------

function applyShotMode() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('size')) state.size = params.get('size');
  if (params.get('title')) state.title = params.get('title');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  if (params.get('tagline')) state.tagline = params.get('tagline');
  loadSamples();
  if (params.get('shift')) {
    const shift = Number(params.get('shift')) || 0;
    if (shift > 0) {
      // rotate the photo order before the spread, so a second exported
      // cover shows a different scene mix rather than a repeat
      state.photos = state.photos.slice(shift).concat(state.photos.slice(0, shift));
      spreadPhotos();
      renderThumbs();
    }
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-mode');
    const [w, h] = SIZES[state.size];
    const scale = Math.min(1280 / Math.max(w, h), 1);
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    preview.width = cw;
    preview.height = ch;
    preview.style.maxHeight = 'none';
    preview.style.maxWidth = 'none';
    const cover = composeCover(cw, ch, effectiveState());
    pctx.drawImage(cover, 0, 0);
    document.title = 'cover-ready';
    return true;
  }
  // editor shot: leave the configured editor on screen, with the size
  // tabs and fields synced to the shot's parameters
  document.querySelectorAll('.size-tab').forEach((t) => t.classList.toggle('active', t.dataset.size === state.size));
  renderLayoutGrid();
  renderGradeGrid();
  draw();
  document.title = 'editor-ready';
  return true;
}

renderLayoutGrid();
renderGradeGrid();
if (!applyShotMode()) {
  loadSamples();
  draw();
}
