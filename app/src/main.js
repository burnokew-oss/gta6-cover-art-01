// main.js — the Vice Coast Cover Studio editor.
// Three steps: add photos, pick a size, export a PNG. Photos are read
// locally with FileReader and drawn on canvas; nothing is uploaded and
// the app makes no network request of its own.

import { LAYOUTS, GRADES, renderCover } from './poster.js';
import { SAMPLES, defaultSlots } from './samples.js';
import { CHARACTERS } from './scenes.js';

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

const state = {
  size: '1080x1350',
  layout: 'cast',
  grade: 'sunset',
  title: 'VICE COAST',
  subtitle: 'salt in the air',
  tagline: 'Five strangers · one shoreline · no brakes',
  quote: 'A POSTCARD WITH A PULSE',
  quoteSource: 'THE BOARDWALK REVIEW',
  sealA: 'ORIGINAL', sealB: 'ARTWORK', badgeTop: 'NO. 09',
  billing: 'Vice Coast Cover Studio · Starring you · Lettering and seal drawn by hand in the studio',
  titlePos: 'middle',
  inkAll: 0.38, inkPer: {}, gradeMix: 0.55, halftone: 0.3, grain: 0.45, vignette: 0.4, bloom: 0.35,
  tags: {},
  slots: [],
  photos: [], // {name, img}
  selected: 0,
};
state.slots = defaultSlots(LAYOUTS[state.layout]);

const $ = (id) => document.getElementById(id);
const preview = $('preview');
let renderQueued = false;

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; drawPreview(); });
}
function drawPreview() {
  const [tw, th] = SIZES[state.size];
  const scale = Math.min(880 / tw, 940 / th);
  preview.width = Math.round(tw * scale); preview.height = Math.round(th * scale);
  renderCover(preview.getContext('2d'), preview.width, preview.height, state);
}

// ---------- photos ----------
function addPhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.photos.push({ name: file.name, img });
    buildTray();
    // sensible automatic framing: a fresh photo takes the selected panel
    state.slots[state.selected] = { kind: 'photo', img, zoom: 1, dx: 0, dy: 0, flip: false, name: file.name };
    buildPanelStrip(); scheduleRender();
  };
  img.src = url;
}
$('fileInput').addEventListener('change', (e) => { for (const f of e.target.files) addPhotoFile(f); e.target.value = ''; });
const dz = $('dropZone');
dz.addEventListener('dragover', (e) => e.preventDefault());
dz.addEventListener('drop', (e) => { e.preventDefault(); for (const f of e.dataTransfer.files) addPhotoFile(f); });
window.addEventListener('paste', (e) => { for (const it of e.clipboardData.items) if (it.type.startsWith('image/')) addPhotoFile(it.getAsFile()); });

function buildTray() {
  const tray = $('photoTray'); tray.innerHTML = '';
  state.photos.forEach((p, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = '▣ ' + p.name;
    b.title = 'Put this photo in the selected panel';
    b.addEventListener('click', () => { state.slots[state.selected] = { kind: 'photo', img: p.img, zoom: 1, dx: 0, dy: 0, flip: false, name: p.name }; buildPanelStrip(); scheduleRender(); });
    tray.appendChild(b);
  });
  SAMPLES.forEach((s) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = s.label;
    b.addEventListener('click', () => { state.slots[state.selected] = { kind: 'scene', id: s.id, zoom: 1, dx: 0, dy: 0, flip: false }; buildPanelStrip(); syncTagInput(); scheduleRender(); });
    tray.appendChild(b);
  });
}

$('loadSamples').addEventListener('click', () => { spreadSamples(); });
function spreadSamples() {
  const n = LAYOUTS[state.layout].panels.length;
  state.slots = LAYOUTS[state.layout].panels.map((p, i) => ({ kind: 'scene', id: SAMPLES[i % SAMPLES.length].id, zoom: 1, dx: 0, dy: 0, flip: false }));
  buildPanelStrip(); syncTagInput(); scheduleRender();
}
$('spreadBtn').addEventListener('click', () => {
  // deal loaded photos first, then samples, across the panels
  const n = LAYOUTS[state.layout].panels.length;
  const pool = [
    ...state.photos.map((p) => ({ kind: 'photo', img: p.img, name: p.name })),
    ...SAMPLES.map((s) => ({ kind: 'scene', id: s.id })),
  ];
  state.slots = Array.from({ length: n }, (_, i) => ({ zoom: 1, dx: 0, dy: 0, flip: false, ...pool[i % pool.length] }));
  buildPanelStrip(); syncTagInput(); scheduleRender();
});
// Revision pass: the W key cycles the selected panel, so keyboard users
// can walk the panels without reaching for the strip.
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'w' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    state.selected = (state.selected + 1) % LAYOUTS[state.layout].panels.length;
    buildPanelStrip(); syncPanelControls();
  }
});
$('onePhotoBtn').addEventListener('click', () => {
  const p = state.photos[state.photos.length - 1];
  if (!p) { $('saveNote').textContent = 'Add a photo first — then one photo fills every panel with a different crop.'; return; }
  state.slots = state.slots.map((s, i) => ({ kind: 'photo', img: p.img, name: p.name, zoom: 1 + (i % 3) * 0.35, dx: ((i * 37) % 5 - 2) / 4, dy: ((i * 53) % 5 - 2) / 4, flip: i % 4 === 3 }));
  buildPanelStrip(); scheduleRender();
});

// ---------- layout thumbs & grade bars ----------
function buildLayoutThumbs() {
  const box = $('layoutThumbs'); box.innerHTML = '';
  for (const [key, lay] of Object.entries(LAYOUTS)) {
    const c = document.createElement('canvas'); c.width = 52; c.height = 52;
    c.title = lay.name; if (key === state.layout) c.className = 'active';
    const g = c.getContext('2d');
    g.fillStyle = '#170826'; g.fillRect(0, 0, 52, 52);
    lay.panels.forEach((p, i) => {
      g.beginPath();
      p.poly.forEach(([ux, uy], j) => { if (j === 0) g.moveTo(ux * 52, uy * 52); else g.lineTo(ux * 52, uy * 52); });
      g.closePath();
      g.fillStyle = ['#e8487f', '#ffb03a', '#3fb7c9', '#8dff57', '#c44fd8', '#ffd166', '#57c8ff', '#ff8c42'][i % 8];
      g.fill(); g.strokeStyle = '#fdf6ec'; g.stroke();
    });
    c.addEventListener('click', () => {
      state.layout = key; state.slots = defaultSlots(lay); state.inkPer = {}; state.selected = 0;
      buildLayoutThumbs(); buildPanelStrip(); syncTagInput(); scheduleRender();
    });
    box.appendChild(c);
  }
}
function buildGradeBars() {
  const box = $('gradeBars'); box.innerHTML = '';
  for (const [key, gr] of Object.entries(GRADES)) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = gr.name;
    if (key === state.grade) b.className = 'active';
    const stops = gr.ramp.map((c, i) => `rgb(${c[0]},${c[1]},${c[2]}) ${(i / (gr.ramp.length - 1)) * 100}%`).join(',');
    b.style.background = `linear-gradient(90deg, ${stops})`;
    b.addEventListener('click', () => { state.grade = key; buildGradeBars(); scheduleRender(); });
    box.appendChild(b);
  }
}

// ---------- panel strip & per-panel controls ----------
function slotLabel(slot, panel) {
  if (!slot) return panel.content;
  if (slot.kind === 'photo') return 'Photo: ' + (slot.name || 'yours');
  const s = SAMPLES.find((k) => k.id === slot.id);
  return s ? s.label : slot.id;
}
function buildPanelStrip() {
  const strip = $('panelStrip'); strip.innerHTML = '';
  LAYOUTS[state.layout].panels.forEach((p, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'chip' + (i === state.selected ? ' active' : '');
    b.textContent = `${i + 1}. ${slotLabel(state.slots[i], p)}`;
    b.addEventListener('click', () => { state.selected = i; buildPanelStrip(); syncPanelControls(); });
    strip.appendChild(b);
  });
}
function currentChar() {
  const slot = state.slots[state.selected];
  const id = slot && slot.kind === 'scene' ? slot.id : LAYOUTS[state.layout].panels[state.selected].content;
  return CHARACTERS.find((c) => c.id === id) || null;
}
function syncTagInput() {
  const c = currentChar();
  $('tagInput').value = c ? (state.tags[c.id] || c.tag) : '';
  $('tagInput').disabled = !c;
}
function syncPanelControls() {
  const slot = state.slots[state.selected];
  $('panelZoom').value = Math.round(((slot && slot.zoom) || 1) * 100);
  $('inkOne').value = Math.round((state.inkPer[state.selected] != null ? state.inkPer[state.selected] : state.inkAll) * 100);
  syncTagInput();
}
$('panelZoom').addEventListener('input', (e) => { const s = state.slots[state.selected]; if (s) { s.zoom = e.target.value / 100; scheduleRender(); } });
$('inkOne').addEventListener('input', (e) => { state.inkPer[state.selected] = e.target.value / 100; scheduleRender(); });
$('tagInput').addEventListener('input', (e) => { const c = currentChar(); if (c) { state.tags[c.id] = e.target.value; scheduleRender(); } });
$('flipBtn').addEventListener('click', () => { const s = state.slots[state.selected]; if (s) { s.flip = !s.flip; scheduleRender(); } });
$('resetCropBtn').addEventListener('click', () => { const s = state.slots[state.selected]; if (s) { s.zoom = 1; s.dx = 0; s.dy = 0; s.flip = false; $('panelZoom').value = 100; scheduleRender(); } });

// drag on the preview pans the selected panel's photo
let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const r = preview.getBoundingClientRect();
  const ux = (e.clientX - r.left) / r.width, uy = (e.clientY - r.top) / r.height;
  // select the panel under the pointer (approximate with panel bboxes)
  const lay = LAYOUTS[state.layout];
  lay.panels.forEach((p, i) => {
    const xs = p.poly.map((q) => q[0]), ys = p.poly.map((q) => q[1]);
    const inX = ux >= Math.min(...xs) && ux <= Math.max(...xs), inY = uy >= Math.min(...ys) && uy <= Math.max(...ys);
    if (inX && inY) { state.selected = i; buildPanelStrip(); syncPanelControls(); }
  });
  drag = { x: e.clientX, y: e.clientY };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const s = state.slots[state.selected];
  if (s && s.kind === 'photo') {
    s.dx = (s.dx || 0) + (e.clientX - drag.x) / 260;
    s.dy = (s.dy || 0) + (e.clientY - drag.y) / 260;
    scheduleRender();
  }
  drag = { x: e.clientX, y: e.clientY };
});
preview.addEventListener('pointerup', () => { drag = null; });

// ---------- words & finish sliders ----------
const bindText = (id, key) => $(id).addEventListener('input', (e) => { state[key] = e.target.value; scheduleRender(); });
bindText('titleInput', 'title'); bindText('subtitleInput', 'subtitle'); bindText('taglineInput', 'tagline');
bindText('quoteInput', 'quote'); bindText('quoteSourceInput', 'quoteSource');
bindText('sealAInput', 'sealA'); bindText('sealBInput', 'sealB'); bindText('badgeInput', 'badgeTop');
$('titlePosSelect').addEventListener('change', (e) => { state.titlePos = e.target.value; scheduleRender(); });
const bindRange = (id, key) => $(id).addEventListener('input', (e) => { state[key] = e.target.value / 100; scheduleRender(); });
bindRange('inkAll', 'inkAll'); bindRange('gradeMix', 'gradeMix'); bindRange('halftone', 'halftone');
bindRange('grain', 'grain'); bindRange('vignette', 'vignette'); bindRange('bloom', 'bloom');
$('inkAll').addEventListener('input', () => { $('inkOne').value = $('inkAll').value; });

// ---------- sizes & export ----------
document.querySelectorAll('#sizeTabs button').forEach((b) => {
  if (b.dataset.size === state.size) b.classList.add('active');
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    document.querySelectorAll('#sizeTabs button').forEach((k) => k.classList.toggle('active', k === b));
    scheduleRender();
  });
});
function exportPng(w, h, note) {
  const off = document.createElement('canvas'); off.width = w; off.height = h;
  renderCover(off.getContext('2d'), w, h, state);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    $('saveNote').textContent = note;
  }, 'image/png');
}
$('exportBtn').addEventListener('click', () => { const [w, h] = SIZES[state.size]; exportPng(w, h, `Saved ${w} × ${h} PNG.`); });
$('exportAllBtn').addEventListener('click', () => {
  const sizes = Object.values(SIZES);
  sizes.forEach(([w, h], i) => setTimeout(() => exportPng(w, h, `Saved all three sizes (${i + 1}/3: ${w} × ${h}).`), i * 350));
});

// ---------- init & screenshot modes ----------
function initEditors() {
  $('titleInput').value = state.title; $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline; $('quoteInput').value = state.quote;
  $('quoteSourceInput').value = state.quoteSource; $('sealAInput').value = state.sealA;
  $('sealBInput').value = state.sealB; $('badgeInput').value = state.badgeTop;
  $('titlePosSelect').value = state.titlePos;
  buildLayoutThumbs(); buildGradeBars(); buildTray(); buildPanelStrip(); syncPanelControls();
  drawPreview();
}
const q = new URLSearchParams(location.search);
if (q.get('shot') === 'cover') {
  document.body.classList.add('shot');
  if (q.get('layout')) state.layout = q.get('layout');
  if (q.get('grade')) state.grade = q.get('grade');
  if (q.get('size')) state.size = q.get('size');
  if (q.get('title')) state.title = q.get('title');
  if (q.get('subtitle')) state.subtitle = q.get('subtitle');
  state.slots = defaultSlots(LAYOUTS[state.layout]);
  if (q.get('spread') === 'samples') state.slots = LAYOUTS[state.layout].panels.map((p, i) => ({ kind: 'scene', id: SAMPLES[i % SAMPLES.length].id, zoom: 1, dx: 0, dy: 0, flip: false }));
  const [tw, th] = SIZES[state.size];
  const maxW = 1280, maxH = 1280;
  const sc = Math.min(maxW / tw, maxH / th);
  preview.width = Math.round(tw * sc); preview.height = Math.round(th * sc);
  renderCover(preview.getContext('2d'), preview.width, preview.height, state);
  document.title = 'cover';
} else {
  if (q.get('layout') && LAYOUTS[q.get('layout')]) { state.layout = q.get('layout'); state.slots = defaultSlots(LAYOUTS[state.layout]); }
  if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
  if (q.get('size') && SIZES[q.get('size')]) state.size = q.get('size');
  initEditors();
  document.querySelectorAll('#sizeTabs button').forEach((k) => k.classList.toggle('active', k.dataset.size === state.size));
  if (q.get('shot') === 'editor') spreadSamples();
}
