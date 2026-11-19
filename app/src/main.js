// Vice Coast Cover Studio — editor wiring.
// Flow: add photos (or the built-in scenes) → pick a size → export a PNG.
// Everything runs on this machine; no photo ever leaves it.

import { SCENES, renderScene } from './samples.js';
import { GRADES, LAYOUTS, layoutById } from './poster.js';
import { SIZES, sizeById, renderCover } from './cover.js';

const $ = (id) => document.getElementById(id);

const state = {
  layoutId: 'comic-hero',
  gradeId: 'sunset',
  sizeId: 'portrait',
  title: 'VICE COAST',
  subtitle: 'salt in the air, sirens in the distance',
  tagline: 'Every sunset has a getaway car',
  quote: 'The cover of the summer, bottled',
  quoteSource: 'Shoreline Gazette',
  badge1: 'VICE',
  badge2: 'CERTIFIED',
  titlePos: 'middle',
  titleDY: 0,
  ink: 0.55,
  grain: 0.5,
  vignette: 0.6,
  slots: [],
  selected: 0,
  onePhoto: false,
};

let photos = []; // {name, source}
let renderQueued = false;

function emptySlot() { return { source: null, zoom: 1, panX: 0, panY: 0, flip: false, ink: null }; }

function ensureSlots() {
  const layout = layoutById(state.layoutId);
  while (state.slots.length < layout.panels.length) state.slots.push(emptySlot());
  state.slots.length = layout.panels.length;
  if (state.selected >= state.slots.length) state.selected = 0;
}

function samplePhoto(sceneId) {
  const canvas = renderScene(sceneId, 720, 720);
  const def = SCENES.find((s) => s.id === sceneId);
  return { name: def ? def.name : sceneId, source: canvas };
}

function loadAllSamples() {
  photos = SCENES.map((s) => samplePhoto(s.id));
  setStatus(`Loaded ${photos.length} built-in scenes as photos.`);
}

function spread() {
  ensureSlots();
  const layout = layoutById(state.layoutId);
  const heroIdx = layout.hero || 0;
  const portrait = photos.find((p) => p.name.includes('Portrait'));
  state.slots = layout.panels.map((_, i) => {
    let photo = null;
    if (state.onePhoto && photos.length) {
      photo = photos[0];
    } else if (i === heroIdx && portrait) {
      photo = portrait;
    } else {
      const pool = photos.filter((p) => p !== portrait);
      photo = pool.length ? pool[(i + (portrait ? 0 : 0)) % pool.length] : photos[i % Math.max(1, photos.length)];
      if (!photo && photos.length) photo = photos[i % photos.length];
    }
    // one-photo mode: a different crop in every panel
    const cropStep = state.onePhoto ? i / Math.max(1, layout.panels.length - 1) : 0;
    return {
      source: photo ? photo.source : null,
      zoom: state.onePhoto ? 1.25 + cropStep * 0.5 : 1,
      panX: state.onePhoto ? (cropStep - 0.5) * 0.5 : 0,
      panY: state.onePhoto ? (0.5 - cropStep) * 0.3 : 0,
      flip: state.onePhoto && i % 2 === 1,
      ink: null,
    };
  });
  buildPanelStrip();
}

function setStatus(msg) { const el = $('status'); if (el) el.textContent = msg; }

function currentSize() { return sizeById(state.sizeId); }

function render() {
  ensureSlots();
  const size = currentSize();
  const canvas = renderCover(state, size.w, size.h);
  const preview = $('preview');
  const pctx = preview.getContext('2d');
  if (preview.width !== canvas.width || preview.height !== canvas.height) {
    preview.width = canvas.width; preview.height = canvas.height;
  }
  pctx.drawImage(canvas, 0, 0);
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

function exportSize(sizeId) {
  const size = sizeById(sizeId);
  const canvas = renderCover(state, size.w, size.h);
  download(canvas, `vice-coast-${size.w}x${size.h}.png`);
  setStatus(`Saved PNG ${size.w} × ${size.h}.`);
  return canvas;
}

function exportAll() {
  let done = 0;
  for (const size of SIZES) {
    const canvas = renderCover(state, size.w, size.h);
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      done++;
      setStatus(`Saved ${done} of ${SIZES.length} sizes — check your downloads.`);
    }, 'image/png');
  }
}

// ------------------------------------------------------------ panel strip
function buildPanelStrip() {
  const strip = $('panelStrip');
  strip.innerHTML = '';
  state.slots.forEach((slot, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-chip' + (i === state.selected ? ' active' : '');
    btn.textContent = `Panel ${i + 1}`;
    btn.addEventListener('click', () => {
      state.selected = i;
      syncPanelControls();
      buildPanelStrip();
    });
    strip.appendChild(btn);
    if (slot.source) {
      const thumb = document.createElement('canvas');
      thumb.width = 54; thumb.height = 40;
      thumb.getContext('2d').drawImage(slot.source, 0, 0, 54, 40);
      btn.prepend(thumb);
    }
  });
  syncPanelControls();
}

function syncPanelControls() {
  const slot = state.slots[state.selected];
  if (!slot) return;
  $('zoom').value = String(Math.round((slot.zoom || 1) * 100));
  $('panelInk').value = String(Math.round(((slot.ink != null ? slot.ink : state.ink)) * 100));
}

// ------------------------------------------------------------- pickers
function buildLayoutPicker() {
  const wrap = $('layoutPicker');
  wrap.innerHTML = '';
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-thumb' + (layout.id === state.layoutId ? ' active' : '');
    btn.title = layout.name;
    const c = document.createElement('canvas');
    c.width = 72; c.height = 54;
    const cctx = c.getContext('2d');
    cctx.fillStyle = '#241536'; cctx.fillRect(0, 0, 72, 54);
    cctx.strokeStyle = '#ffd9a0'; cctx.lineWidth = 1.6;
    cctx.fillStyle = 'rgba(255,150,90,0.5)';
    for (const panel of layout.panels) {
      cctx.beginPath();
      panel.forEach((p, j) => { if (j === 0) cctx.moveTo(p.x * 72, p.y * 54); else cctx.lineTo(p.x * 72, p.y * 54); });
      cctx.closePath(); cctx.fill(); cctx.stroke();
    }
    const label = document.createElement('span');
    label.textContent = layout.name;
    btn.append(c, label);
    btn.addEventListener('click', () => {
      state.layoutId = layout.id;
      ensureSlots(); spread(); buildLayoutPicker(); queueRender();
    });
    wrap.appendChild(btn);
  }
}

function buildGradePicker() {
  const wrap = $('gradePicker');
  wrap.innerHTML = '';
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-bar' + (grade.id === state.gradeId ? ' active' : '');
    const stops = grade.stops.map(([at, col]) => `${col} ${Math.round(at * 100)}%`).join(', ');
    btn.style.background = `linear-gradient(90deg, ${stops})`;
    btn.innerHTML = `<span>${grade.name}</span>`;
    btn.addEventListener('click', () => {
      state.gradeId = grade.id;
      buildGradePicker(); queueRender();
    });
    wrap.appendChild(btn);
  }
}

function buildSizeTabs() {
  const wrap = $('sizeTabs');
  wrap.innerHTML = '';
  for (const size of SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-tab' + (size.id === state.sizeId ? ' active' : '');
    btn.textContent = `${size.w} × ${size.h}`;
    btn.addEventListener('click', () => {
      state.sizeId = size.id;
      buildSizeTabs(); queueRender();
    });
    wrap.appendChild(btn);
  }
}

// -------------------------------------------------------------- wiring
function bindText(id, key) {
  $(id).addEventListener('input', (e) => { state[key] = e.target.value; queueRender(); });
}

function initEditor() {
  bindText('titleInput', 'title');
  bindText('subtitleInput', 'subtitle');
  bindText('taglineInput', 'tagline');
  bindText('quoteInput', 'quote');
  bindText('quoteSourceInput', 'quoteSource');
  bindText('badgeInput', 'badge1');
  $('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; queueRender(); });
  $('titleNudge').addEventListener('input', (e) => { state.titleDY = e.target.value / 100; queueRender(); });
  $('inkAll').addEventListener('input', (e) => { state.ink = e.target.value / 100; syncPanelControls(); queueRender(); });
  $('grain').addEventListener('input', (e) => { state.grain = e.target.value / 100; queueRender(); });
  $('vignette').addEventListener('input', (e) => { state.vignette = e.target.value / 100; queueRender(); });
  $('zoom').addEventListener('input', (e) => {
    const slot = state.slots[state.selected];
    if (slot) { slot.zoom = e.target.value / 100; queueRender(); }
  });
  $('panelInk').addEventListener('input', (e) => {
    const slot = state.slots[state.selected];
    if (slot) { slot.ink = e.target.value / 100; queueRender(); }
  });
  $('photoInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    let loaded = 0;
    for (const file of files) {
      const img = new Image();
      img.onload = () => {
        photos.push({ name: file.name, source: img });
        loaded++;
        if (loaded === files.length) { spread(); queueRender(); setStatus(`${photos.length} photo(s) ready — spread across the panels.`); }
      };
      img.src = URL.createObjectURL(file);
    }
  });
  $('loadSamples').addEventListener('click', () => { loadAllSamples(); spread(); queueRender(); });
  $('spread').addEventListener('click', () => { spread(); queueRender(); });
  $('onePhoto').addEventListener('change', (e) => { state.onePhoto = e.target.checked; spread(); queueRender(); });
  $('flip').addEventListener('click', () => {
    const slot = state.slots[state.selected];
    if (slot) { slot.flip = !slot.flip; queueRender(); }
  });
  $('exportOne').addEventListener('click', () => exportSize(state.sizeId));
  $('exportAll').addEventListener('click', exportAll);
  // drag on the preview pans the selected panel
  const preview = $('preview');
  let drag = null;
  preview.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; preview.setPointerCapture(e.pointerId); });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const slot = state.slots[state.selected];
    if (!slot) return;
    const rect = preview.getBoundingClientRect();
    slot.panX = Math.max(-0.6, Math.min(0.6, (slot.panX || 0) + (e.clientX - drag.x) / rect.width));
    slot.panY = Math.max(-0.6, Math.min(0.6, (slot.panY || 0) + (e.clientY - drag.y) / rect.height));
    drag = { x: e.clientX, y: e.clientY };
    queueRender();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  // wheel over the preview zooms the selected panel; double-click cycles it
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.slots[state.selected];
    if (!slot) return;
    slot.zoom = Math.max(0.6, Math.min(2.6, (slot.zoom || 1) * (e.deltaY < 0 ? 1.06 : 0.94)));
    syncPanelControls();
    queueRender();
  }, { passive: false });
  preview.addEventListener('dblclick', () => {
    state.selected = (state.selected + 1) % state.slots.length;
    syncPanelControls();
    buildPanelStrip();
  });
  buildLayoutPicker(); buildGradePicker(); buildSizeTabs();
  loadAllSamples(); spread();
  render();
  setStatus('Built-in scenes are loaded. Add your own photos any time — they never leave this machine.');
}

// Shot mode for screenshots: ?shot=cover renders one export full-page,
// ?shot=editor shows the editor exactly as a visitor would meet it.
function init() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (params.get('layout')) state.layoutId = params.get('layout');
  if (params.get('grade')) state.gradeId = params.get('grade');
  if (params.get('size')) state.sizeId = params.get('size');
  if (params.get('title')) state.title = params.get('title');
  ensureSlots();
  loadAllSamples(); spread();
  // ?scenes=beach,neon,... deals named scenes across the panels in order,
  // so each screenshot can carry its own distinct mix.
  if (params.get('scenes')) {
    const ids = params.get('scenes').split(',').map((s) => s.trim()).filter(Boolean);
    state.slots = state.slots.map((slot, i) => {
      const def = SCENES.find((s) => s.id === ids[i % ids.length]);
      if (!def) return slot;
      return { ...slot, source: renderScene(def.id, 720, 720) };
    });
    buildPanelStrip();
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = currentSize();
    const canvas = renderCover(state, size.w, size.h);
    canvas.id = 'shotCanvas';
    document.body.appendChild(canvas);
    document.title = 'Vice Coast — exported cover';
    return;
  }
  initEditor();
  if (shot === 'editor') document.body.classList.add('shot-editor');
}

init();
export { state };
