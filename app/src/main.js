// Vice Coast Cover Studio — editor wiring.
// Photos in, caption typed, PNG out: load photos (or procedural samples),
// auto-fill eight panels, pick a layout and a poster grade, drag the title,
// export at 1080x1080, 1080x1350 or 1920x1080. Fully offline.

import { POSTER_GRADES } from './poster.js';
import { COVER_LAYOUTS, layoutById, SINGLE_PHOTO_CROPS, drawViceCoastCover, clearPanelCache } from './cover.js';
import { SAMPLE_SCENES, makeSamplePhoto } from './samples.js';

const SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

const PANEL_NAMES = ['Hero', 'Top', 'Stack', 'Strip', 'Strip', 'Strip', 'Strip', 'Strip'];

function defaultPanels() {
  return Array.from({ length: 8 }, (_, i) => ({
    photoIndex: 0,
    zoom: 120,
    panX: 0,
    panY: 0,
    flip: false,
    ink: 70,
    crop: { ...SINGLE_PHOTO_CROPS[i] },
  }));
}

const state = {
  layoutId: 'hero-split',
  gradeId: 'sunset',
  sizeId: '1080x1080',
  photos: [],
  panels: defaultPanels(),
  title: 'VICE COAST',
  subtitle: 'Golden Hour Run',
  tagline: 'ON THE COAST, EVERYONE IS SOMEBODY',
  badge: 'HOT ★ 2026',
  titleSize: 100,
  titleX: 6,
  titleY: 62,
  selectedPanel: 0,
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const previewCtx = preview.getContext('2d');
let renderQueued = false;
let lastTitleBand = null;

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview();
  });
}

function renderPreview() {
  const size = SIZES[state.sizeId];
  const scale = Math.min(900 / size.w, 900 / size.h);
  const pw = Math.max(2, Math.round(size.w * scale));
  const ph = Math.max(2, Math.round(size.h * scale));
  if (preview.width !== pw || preview.height !== ph) {
    preview.width = pw;
    preview.height = ph;
  }
  lastTitleBand = drawViceCoastCover(previewCtx, state, pw, ph, { showSelection: true });
}

function setStatus(text) {
  $('status').textContent = text;
}

function refreshTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('canvas');
    thumb.width = 120;
    thumb.height = 120;
    const tctx = thumb.getContext('2d');
    tctx.drawImage(photo.source, 0, 0, 120, 120);
    thumb.title = photo.name;
    thumb.addEventListener('click', () => {
      state.panels[state.selectedPanel].photoIndex = i;
      clearPanelCache();
      queueRender();
      refreshTray();
    });
    if (state.panels[state.selectedPanel].photoIndex === i) thumb.classList.add('picked');
    tray.appendChild(thumb);
  });
  $('photoCount').textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} ready`;
}

function addPhoto(source, w, h, name) {
  const id = `photo-${state.photos.length}-${Date.now()}`;
  state.photos.push({ id, name, source, w, h });
  if (state.photos.length > 8) state.photos = state.photos.slice(-8);
  refreshTray();
}

function loadSamplePhotos() {
  state.photos = [];
  for (const scene of SAMPLE_SCENES) {
    const canvas = makeSamplePhoto(scene, 900, 900);
    addPhoto(canvas, 900, 900, scene.name);
  }
  autoFillPanels();
  setStatus(`${SAMPLE_SCENES.length} sample scenes loaded — panels auto-filled.`);
}

function autoFillPanels() {
  const n = state.photos.length;
  if (n === 0) {
    setStatus('Add photos or load samples first.');
    return;
  }
  state.panels = defaultPanels();
  if (n === 1) {
    // One photo: every panel takes a DIFFERENT crop window of it, with a
    // different zoom and an alternating flip — never the same view twice.
    state.panels.forEach((panel, i) => {
      panel.photoIndex = 0;
      panel.crop = { ...SINGLE_PHOTO_CROPS[i] };
      panel.zoom = 120 + (i % 4) * 18;
      panel.flip = i % 2 === 1;
      panel.ink = 62 + (i % 3) * 9;
    });
  } else {
    // Several photos: round-robin across panels, each panel still framed
    // differently so repeats never look identical.
    state.panels.forEach((panel, i) => {
      panel.photoIndex = i % n;
      panel.crop = { ...SINGLE_PHOTO_CROPS[i] };
      panel.zoom = 115 + (i % 3) * 15;
      panel.flip = i % 4 === 3;
    });
  }
  clearPanelCache();
  refreshTray();
  queueRender();
  setStatus(`Panels auto-filled from ${n} photo${n === 1 ? '' : 's'}.`);
}

function buildLayoutPicker() {
  const wrap = $('layoutPicker');
  for (const layout of COVER_LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = layout.name;
    btn.dataset.layout = layout.id;
    if (layout.id === state.layoutId) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.layoutId = layout.id;
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      queueRender();
    });
    wrap.appendChild(btn);
  }
}

function buildGradePicker() {
  const wrap = $('gradePicker');
  for (const grade of POSTER_GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.grade = grade.id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = grade.swatch;
    btn.appendChild(swatch);
    btn.appendChild(document.createTextNode(grade.name));
    if (grade.id === state.gradeId) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.gradeId = grade.id;
      clearPanelCache();
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      queueRender();
    });
    wrap.appendChild(btn);
  }
}

function syncPanelControls() {
  const panel = state.panels[state.selectedPanel];
  $('panelZoom').value = String(panel.zoom);
  $('panelInk').value = String(panel.ink);
  $('panelInkValue').textContent = `${panel.ink}%`;
  $('selectedPanel').textContent = `Panel ${state.selectedPanel + 1} · ${PANEL_NAMES[state.selectedPanel] || 'Panel'}`;
}

function selectPanel(i) {
  state.selectedPanel = i;
  syncPanelControls();
  refreshTray();
  queueRender();
}

function previewPoint(event) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * preview.width,
    y: ((event.clientY - rect.top) / rect.height) * preview.height,
  };
}

function panelAt(x, y) {
  const layout = layoutById(state.layoutId);
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const r = layout.panels[i];
    if (x >= r.x * preview.width && x < (r.x + r.w) * preview.width
      && y >= r.y * preview.height && y < (r.y + r.h) * preview.height) return i;
  }
  return 0;
}

function bindPreviewPointer() {
  let drag = null;
  preview.addEventListener('pointerdown', (event) => {
    const p = previewPoint(event);
    const band = lastTitleBand;
    const inBand = band && p.x >= band.x && p.x < band.x + band.w && p.y >= band.y && p.y < band.y + band.h;
    if (inBand) {
      drag = { kind: 'title', startX: p.x, startY: p.y, titleX: state.titleX, titleY: state.titleY };
    } else {
      const i = panelAt(p.x, p.y);
      selectPanel(i);
      const panel = state.panels[i];
      drag = { kind: 'panel', startX: p.x, startY: p.y, panX: panel.panX, panY: panel.panY };
    }
    preview.setPointerCapture(event.pointerId);
  });
  preview.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = previewPoint(event);
    const dx = ((p.x - drag.startX) / preview.width) * 100;
    const dy = ((p.y - drag.startY) / preview.height) * 100;
    if (drag.kind === 'title') {
      state.titleX = Math.max(0, Math.min(60, drag.titleX + dx));
      state.titleY = Math.max(0, Math.min(80, drag.titleY + dy));
      $('titleX').value = String(Math.round(state.titleX));
      $('titleY').value = String(Math.round(state.titleY));
    } else {
      const panel = state.panels[state.selectedPanel];
      panel.panX = Math.max(-100, Math.min(100, drag.panX + dx * 2));
      panel.panY = Math.max(-100, Math.min(100, drag.panY + dy * 2));
    }
    queueRender();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selectedPanel];
    panel.zoom = Math.max(100, Math.min(260, panel.zoom + (event.deltaY < 0 ? 12 : -12)));
    $('panelZoom').value = String(panel.zoom);
    queueRender();
  }, { passive: false });
}

function exportCoverPNG() {
  const size = SIZES[state.sizeId];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  drawViceCoastCover(ctx, state, size.w, size.h, {});
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed — try again.');
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-coast-${state.sizeId}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Exported ${size.w} × ${size.h} PNG — ${Math.round(blob.size / 1024)} KiB.`);
      resolve(blob);
    }, 'image/png');
  });
}

// Headless hooks for screenshots and verification: the page can render a
// cover full-frame (?shot=cover) or the editor with samples (?shot=editor).
function applyShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  if (params.get('layout')) state.layoutId = params.get('layout');
  if (params.get('grade')) state.gradeId = params.get('grade');
  if (params.get('size')) state.sizeId = params.get('size');
  if (params.get('title')) state.title = params.get('title');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  // Keep the pickers honest with the URL-driven state.
  document.querySelectorAll('#layoutPicker button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layoutId));
  document.querySelectorAll('#gradePicker button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.gradeId));
  document.querySelectorAll('#sizePicker .size-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === state.sizeId));
  loadSamplePhotos();
  if (shot === 'cover') {
    document.body.classList.add('shot-mode');
    const stage = $('shotStage');
    stage.hidden = false;
    const size = SIZES[state.sizeId];
    const canvas = $('shotCanvas');
    canvas.width = size.w;
    canvas.height = size.h;
    drawViceCoastCover(canvas.getContext('2d'), state, size.w, size.h, {});
    document.title = `VICE-COAST-COVER ${size.w}x${size.h}`;
  } else {
    renderPreview();
    document.title = 'VICE-COAST-EDITOR';
  }
}

function bindControls() {
  $('addPhotos').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = url;
      });
      if (img.naturalWidth > 0) addPhoto(img, img.naturalWidth, img.naturalHeight, file.name);
    }
    if (state.photos.length > 0) {
      autoFillPanels();
      setStatus(`${files.length} photo${files.length === 1 ? '' : 's'} added — panels auto-filled.`);
    }
    event.target.value = '';
  });
  $('loadSamples').addEventListener('click', loadSamplePhotos);
  $('autoFill').addEventListener('click', autoFillPanels);
  $('panelZoom').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].zoom = Number(e.target.value);
    queueRender();
  });
  $('panelInk').addEventListener('input', (e) => {
    const panel = state.panels[state.selectedPanel];
    panel.ink = Number(e.target.value);
    $('panelInkValue').textContent = `${panel.ink}%`;
    clearPanelCache();
    queueRender();
  });
  $('allInk').addEventListener('input', (e) => {
    const ink = Number(e.target.value);
    $('allInkValue').textContent = `${ink}%`;
    $('panelInk').value = String(ink);
    $('panelInkValue').textContent = `${ink}%`;
    for (const panel of state.panels) panel.ink = ink;
    clearPanelCache();
    queueRender();
  });
  $('flipPanel').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    panel.flip = !panel.flip;
    clearPanelCache();
    queueRender();
  });
  $('resetCrop').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    panel.zoom = 120;
    panel.panX = 0;
    panel.panY = 0;
    panel.flip = false;
    panel.crop = { ...SINGLE_PHOTO_CROPS[state.selectedPanel] };
    syncPanelControls();
    clearPanelCache();
    queueRender();
  });
  const bindText = (id, key) => {
    $(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      queueRender();
    });
  };
  bindText('titleText', 'title');
  bindText('subtitleText', 'subtitle');
  bindText('taglineText', 'tagline');
  bindText('badgeText', 'badge');
  $('titleSize').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value);
    queueRender();
  });
  $('titleX').addEventListener('input', (e) => {
    state.titleX = Number(e.target.value);
    queueRender();
  });
  $('titleY').addEventListener('input', (e) => {
    state.titleY = Number(e.target.value);
    queueRender();
  });
  document.querySelectorAll('#sizePicker .size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sizeId = btn.dataset.size;
      document.querySelectorAll('#sizePicker .size-btn').forEach((b) => b.classList.toggle('active', b === btn));
      queueRender();
    });
  });
  $('exportPng').addEventListener('click', exportCoverPNG);
  const stage = document.querySelector('.stage');
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = url;
      });
      if (img.naturalWidth > 0) addPhoto(img, img.naturalWidth, img.naturalHeight, file.name);
    }
    if (files.length > 0) autoFillPanels();
  });
}

buildLayoutPicker();
buildGradePicker();
bindControls();
bindPreviewPointer();
syncPanelControls();
applyShotMode();
if (!new URLSearchParams(window.location.search).get('shot')) renderPreview();

// Test hooks: exportCoverPNG resolves with the PNG blob; state is inspectable.
window.__viceCoast = { state, exportCoverPNG, loadSamplePhotos, autoFillPanels, SIZES };
