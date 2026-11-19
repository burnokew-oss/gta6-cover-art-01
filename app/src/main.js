// Vice Coast Cover Studio — editor wiring.
// Photos, sample scenes, layouts, grades, caption editing, per-panel
// crop/pan/zoom/flip, poster ink, and PNG export. Everything runs offline;
// a photo is only ever drawn onto a canvas on this machine.

import { LAYOUTS, LAYOUT_IDS, SIZES, SIZE_IDS, renderCover, renderCoverCanvas, panelRects } from './cover.js';
import { GRADES, GRADE_IDS } from './poster.js';
import { SCENES, renderScene } from './samples.js';

const $ = (id) => document.getElementById(id);

const canvas = $('coverCanvas');
const ctx = canvas.getContext('2d');

// ------------------------------------------------------------------ state --
const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  title: 'VICE COAST',
  subtitle: 'Sunset Heist',
  tagline: 'EIGHT PANELS · ONE CITY · NO WAY OUT',
  badge: '★ NEW ★',
  ink: 0.65,
  onePhoto: false,
  photos: [], // { id, name, source } — source is an Image or a canvas
  panels: [], // { photoId, zoom, panX, panY, flip, ink }
  titlePos: null, // { x, y } fractions of the cover, or null for the band
  selectedPanel: 0,
};

let photoCounter = 0;
let renderQueued = false;
let shotCoverMode = false;

function maxPanels() {
  return Math.max(...LAYOUT_IDS.map((id) => LAYOUTS[id].slots.filter((s) => s.w > 0).length));
}

function ensurePanels() {
  const n = maxPanels();
  while (state.panels.length < n) {
    state.panels.push({ photoId: null, zoom: 1, panX: 0, panY: 0, flip: false, ink: state.ink });
  }
}
ensurePanels();

function setStatus(text) {
  const el = $('status');
  if (el) el.textContent = text;
}

// ------------------------------------------------------------ photo intake --
function addPhoto(source, name) {
  const photo = { id: `photo-${++photoCounter}`, name, source };
  state.photos.push(photo);
  refreshTray();
  return photo;
}

function loadSampleScene(sceneId) {
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const sceneCanvas = renderScene(scene.id, 960, 720);
  const photo = addPhoto(sceneCanvas, scene.name);
  autoFillFrom(photo);
  setStatus(`${scene.name} loaded — pick a layout, a grade, then export.`);
  queueRender();
}

function autoFillFrom(photo) {
  // Fill every empty panel from the loaded photos, round-robin.
  const rects = panelRects(state, 1080, 1080);
  for (let i = 0; i < rects.length; i++) {
    if (!state.panels[i].photoId) state.panels[i].photoId = photo.id;
  }
  syncPanelControls();
}

function autoFill() {
  if (state.photos.length === 0) {
    setStatus('Load a photo or pick a sample scene first.');
    return;
  }
  const rects = panelRects(state, 1080, 1080);
  let filled = 0;
  for (let i = 0; i < rects.length; i++) {
    if (!state.panels[i].photoId) {
      state.panels[i].photoId = state.photos[filled % state.photos.length].id;
      filled++;
    }
  }
  refreshTray();
  syncPanelControls();
  queueRender();
  setStatus(filled > 0 ? `Filled ${filled} empty panel${filled === 1 ? '' : 's'}.` : 'Every panel already has a photo.');
}

function clearPhotos() {
  state.photos = [];
  for (const p of state.panels) p.photoId = null;
  refreshTray();
  queueRender();
  setStatus('Photos cleared.');
}

function refreshTray() {
  const tray = $('photoTray');
  if (!tray) return;
  tray.innerHTML = '';
  if (state.photos.length === 0) {
    const note = document.createElement('div');
    note.className = 'thumb empty-note';
    note.textContent = 'No photos yet';
    tray.appendChild(note);
    return;
  }
  for (const photo of state.photos) {
    const thumb = document.createElement('canvas');
    thumb.className = 'thumb';
    thumb.width = 56;
    thumb.height = 56;
    thumb.title = photo.name;
    const tctx = thumb.getContext('2d');
    const sw = photo.source.naturalWidth || photo.source.width;
    const sh = photo.source.naturalHeight || photo.source.height;
    const scale = Math.max(56 / sw, 56 / sh);
    tctx.drawImage(photo.source, (56 - sw * scale) / 2, (56 - sh * scale) / 2, sw * scale, sh * scale);
    if (state.panels.some((p) => p.photoId === photo.id)) thumb.classList.add('used');
    thumb.addEventListener('click', () => {
      state.panels[state.selectedPanel].photoId = photo.id;
      refreshTray();
      syncPanelControls();
      queueRender();
    });
    tray.appendChild(thumb);
  }
}

// -------------------------------------------------------------- rendering ---
function previewSize() {
  const size = SIZES[state.size];
  const maxW = 760;
  const scale = Math.min(1, maxW / size.w, 620 / size.h);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function renderNow() {
  renderQueued = false;
  if (shotCoverMode) return; // the shot render owns the canvas in cover mode
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx, state, w, h);
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(renderNow);
}

// ------------------------------------------------------------ export (PNG) --
function exportPng() {
  const size = SIZES[state.size];
  const out = renderCoverCanvas(state, state.size);
  setStatus(`Rendering ${size.w} × ${size.h}…`);
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-coast-cover-${state.size}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported ${size.w} × ${size.h} PNG — check your downloads.`);
  }, 'image/png');
}

// ------------------------------------------------------------- UI building --
function buildChoices(containerId, items, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn' + (item.id === current ? ' active' : '');
    if (item.swatch) {
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = item.swatch;
      btn.appendChild(sw);
    }
    btn.appendChild(document.createTextNode(item.label));
    btn.addEventListener('click', () => {
      onPick(item.id);
      buildChoices(containerId, items, item.id, onPick);
      queueRender();
    });
    box.appendChild(btn);
  }
}

function buildLayoutChoices() {
  buildChoices('layoutChoices',
    LAYOUT_IDS.map((id) => ({ id, label: LAYOUTS[id].name })),
    state.layout,
    (id) => {
      state.layout = id;
      state.selectedPanel = 0;
      syncPanelControls();
      setStatus(`${LAYOUTS[id].name} — ${panelRects(state, 1080, 1080).length} panels.`);
    });
}

function buildGradeChoices() {
  buildChoices('gradeChoices',
    GRADE_IDS.map((id) => ({ id, label: GRADES[id].label, swatch: GRADES[id].swatch })),
    state.grade,
    (id) => { state.grade = id; setStatus(`Grade: ${GRADES[id].label}.`); });
}

function buildSizeChoices() {
  buildChoices('sizeChoices',
    SIZE_IDS.map((id) => ({ id, label: SIZES[id].label })),
    state.size,
    (id) => { state.size = id; setStatus(`Export size: ${SIZES[id].label}.`); });
}

function syncPanelControls() {
  const count = panelRects(state, 1080, 1080).length;
  state.selectedPanel = Math.max(0, Math.min(state.selectedPanel, count - 1));
  const panel = state.panels[state.selectedPanel];
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${count}`;
  $('zoomSlider').value = String(panel.zoom);
  $('panXSlider').value = String(panel.panX);
  $('panYSlider').value = String(panel.panY);
  $('inkSlider').value = String(panel.ink);
}

// ------------------------------------------------------------- UI wiring ---
function wireControls() {
  $('photoInput').addEventListener('change', (event) => {
    const files = [...event.target.files];
    if (files.length === 0) return;
    let loaded = 0;
    for (const file of files) {
      const img = new Image();
      img.onload = () => {
        const photo = addPhoto(img, file.name);
        if (loaded === 0) autoFillFrom(photo);
        loaded++;
        if (loaded === files.length) {
          setStatus(`${files.length} photo${files.length === 1 ? '' : 's'} loaded.`);
          queueRender();
        }
      };
      img.onerror = () => setStatus(`Could not read ${file.name}.`);
      img.src = URL.createObjectURL(file);
    }
    event.target.value = '';
  });

  $('autoFillBtn').addEventListener('click', autoFill);
  $('clearPhotosBtn').addEventListener('click', clearPhotos);
  $('onePhotoMode').addEventListener('change', (event) => {
    state.onePhoto = event.target.checked;
    setStatus(state.onePhoto
      ? 'One-photo mode: one photo fills every panel with a different crop.'
      : 'One-photo mode off.');
    queueRender();
  });

  $('sampleButtons').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-scene]');
    if (btn) loadSampleScene(btn.dataset.scene);
  });

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; queueRender(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; queueRender(); });
  $('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; queueRender(); });
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; queueRender(); });
  $('resetTitleBtn').addEventListener('click', () => {
    state.titlePos = null;
    setStatus('Title back in its band above the panels.');
    queueRender();
  });

  $('prevPanelBtn').addEventListener('click', () => {
    const count = panelRects(state, 1080, 1080).length;
    state.selectedPanel = (state.selectedPanel - 1 + count) % count;
    syncPanelControls();
  });
  $('nextPanelBtn').addEventListener('click', () => {
    const count = panelRects(state, 1080, 1080).length;
    state.selectedPanel = (state.selectedPanel + 1) % count;
    syncPanelControls();
  });
  $('zoomSlider').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].zoom = Number(e.target.value);
    queueRender();
  });
  $('panXSlider').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].panX = Number(e.target.value);
    queueRender();
  });
  $('panYSlider').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].panY = Number(e.target.value);
    queueRender();
  });
  $('flipBtn').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    panel.flip = !panel.flip;
    queueRender();
  });
  $('fillPanelBtn').addEventListener('click', () => {
    if (state.photos.length === 0) {
      setStatus('Load a photo or pick a sample scene first.');
      return;
    }
    const used = state.panels.filter((p) => p.photoId).length;
    state.panels[state.selectedPanel].photoId =
      state.photos[used % state.photos.length].id;
    refreshTray();
    queueRender();
  });
  $('inkSlider').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].ink = Number(e.target.value);
    queueRender();
  });
  $('inkAllSlider').addEventListener('input', (e) => {
    state.ink = Number(e.target.value);
    for (const p of state.panels) p.ink = state.ink;
    $('inkSlider').value = e.target.value;
    queueRender();
  });

  $('exportBtn').addEventListener('click', exportPng);
  $('exportTop').addEventListener('click', exportPng);
}

// ------------------------------------------- canvas pointer: pan, zoom, drag
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function hitPanel(point) {
  const rects = panelRects(state, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}

function wireCanvas() {
  let drag = null; // { kind: 'title' | 'panel', index, startX, startY, panX, panY }

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    canvas.setPointerCapture(event.pointerId);
    // Dragging from the title band lifts the title out of its band.
    const bandH = state.titlePos ? 0 : Math.max(90, Math.round(canvas.height * 0.165));
    if (!state.titlePos && point.y < bandH) {
      state.titlePos = { x: point.x / canvas.width, y: point.y / canvas.height };
      drag = { kind: 'title', startX: point.x, startY: point.y, ox: state.titlePos.x, oy: state.titlePos.y };
      queueRender();
      return;
    }
    if (state.titlePos) {
      const bw = canvas.width * 0.72;
      const bh = Math.max(70, Math.round(canvas.height * 0.11));
      const bx = state.titlePos.x * canvas.width - bw / 2;
      const by = state.titlePos.y * canvas.height - bh / 2;
      if (point.x >= bx && point.x <= bx + bw && point.y >= by && point.y <= by + bh) {
        drag = { kind: 'title', startX: point.x, startY: point.y, ox: state.titlePos.x, oy: state.titlePos.y };
        return;
      }
    }
    const index = hitPanel(point);
    if (index >= 0) {
      state.selectedPanel = index;
      syncPanelControls();
      const panel = state.panels[index];
      drag = { kind: 'panel', index, startX: point.x, startY: point.y, panX: panel.panX, panY: panel.panY };
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    if (drag.kind === 'title') {
      state.titlePos = {
        x: Math.max(0.1, Math.min(0.9, drag.ox + (point.x - drag.startX) / canvas.width)),
        y: Math.max(0.08, Math.min(0.92, drag.oy + (point.y - drag.startY) / canvas.height)),
      };
      queueRender();
    } else {
      const rects = panelRects(state, canvas.width, canvas.height);
      const rect = rects[drag.index];
      const panel = state.panels[drag.index];
      const spanX = Math.max(1, (rect.w * panel.zoom - rect.w) / 2);
      const spanY = Math.max(1, (rect.h * panel.zoom - rect.h) / 2);
      panel.panX = Math.max(-1, Math.min(1, drag.panX - (point.x - drag.startX) / spanX));
      panel.panY = Math.max(-1, Math.min(1, drag.panY - (point.y - drag.startY) / spanY));
      $('panXSlider').value = String(panel.panX);
      $('panYSlider').value = String(panel.panY);
      queueRender();
    }
  });

  const endDrag = (event) => {
    if (!drag) return;
    if (drag.kind === 'title') setStatus('Title moved — it now floats over the panels. “Title back to its band” restores the default.');
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // A dragged title also lifts with a double-click on the band, for
  // people who tap rather than drag.
  canvas.addEventListener('dblclick', (event) => {
    const point = canvasPoint(event);
    const bandH = Math.max(90, Math.round(canvas.height * 0.165));
    if (!state.titlePos && point.y < bandH) {
      state.titlePos = { x: 0.5, y: 0.5 };
      setStatus('Title lifted over the panels — drag it anywhere.');
      queueRender();
    }
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const index = hitPanel(point);
    if (index < 0) return;
    const panel = state.panels[index];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom - event.deltaY * 0.0015));
    state.selectedPanel = index;
    syncPanelControls();
    queueRender();
  }, { passive: false });
}

// --------------------------------------------------------------- shot mode --
// ?shot=cover&photo=beach&layout=hero&grade=sunset&size=1920x1080&caption=...
// draws the cover full-window for a screenshot; ?shot=editor shows the
// editor with that scene loaded. Used only to take the entry's screenshots.
function applyShotQuery() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return false;
  const photo = q.get('photo') ?? 'beach';
  const layout = q.get('layout');
  const grade = q.get('grade');
  const size = q.get('size');
  const caption = q.get('caption');
  const subtitle = q.get('subtitle');
  const tagline = q.get('tagline');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  if (grade && GRADES[grade]) state.grade = grade;
  if (size && SIZES[size]) state.size = size;
  if (caption) state.title = caption;
  if (subtitle) state.subtitle = subtitle;
  if (tagline) state.tagline = tagline;
  // One scene fills every panel in a shot, so give each panel a different
  // crop of it — otherwise the cover would repeat the same crop.
  state.onePhoto = true;
  const onePhotoBox = $('onePhotoMode');
  if (onePhotoBox) onePhotoBox.checked = true;
  loadSampleScene(photo);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    shotCoverMode = true;
    const w = Number(q.get('w') ?? 1280);
    const h = Number(q.get('h') ?? 720);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    renderCover(ctx, state, w, h);
    return true;
  }
  // A shot may have changed layout/grade/size after the choice buttons
  // were built — rebuild them so the editor shows the shot's own state.
  buildLayoutChoices();
  buildGradeChoices();
  buildSizeChoices();
  syncPanelControls();
  queueRender();
  return true;
}

// -------------------------------------------------------------------- boot --
buildLayoutChoices();
buildGradeChoices();
buildSizeChoices();
wireControls();
wireCanvas();
syncPanelControls();
refreshTray();
const inShot = applyShotQuery();
if (!inShot) {
  // First visit: show what the app does right away.
  loadSampleScene('beach');
  setStatus('Beach Sunset sample loaded — try a layout, a grade, then export.');
}
