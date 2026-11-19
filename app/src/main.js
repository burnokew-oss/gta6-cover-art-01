// main.js — the editor of Vice Coast Cover Studio: photo loading, panel
// framing, layout and grade picking, lettering, print effects and PNG
// export in the three common post sizes. Everything runs locally; the app
// makes no network request and photos never leave the machine.
// A ?shot= mode renders a single cover or a set-up editor for screenshots.

import { GRADES } from './poster.js';
import { LAYOUTS, layoutById, drawCover } from './cover.js';
import { SAMPLE_SCENES, renderSampleScene } from './samples.js';

const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide' },
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

// ---- sources: sample scenes rendered by the app, plus visitor photos ----
const sources = new Map();
let photoCount = 0;

function sceneSource(sceneId) {
  const key = 'scene-' + sceneId;
  if (!sources.has(key)) {
    const scene = SAMPLE_SCENES.find((s) => s.id === sceneId);
    const canvas = renderSampleScene(sceneId, 960, 720);
    sources.set(key, { img: canvas, cacheId: key + '-' + canvas.width, label: scene ? scene.name : sceneId });
  }
  return sources.get(key);
}

function allSceneIds() {
  return SAMPLE_SCENES.map((s) => 'scene-' + s.id);
}

// ---- cover state ----
const state = {
  size: '1080x1350',
  layout: 'slash',
  grade: 'sunset',
  title: 'VICE COAST',
  subtitle: 'Neon Hearts Run Wild',
  tagline: 'Every sunset has a price',
  quote: 'A postcard from the edge of paradise',
  quoteBy: 'The Coastline Gazette',
  sealTop: 'VICE',
  sealBottom: 'COAST',
  titlePos: 'middle',
  titleLift: 0,
  ink: 0.55,
  grain: 0.35,
  vignette: 0.5,
  panels: [],
  selected: 0,
};

const DEFAULT_SPREAD = ['portrait', 'neon', 'beach', 'skyline', 'aerial', 'coast', 'beach', 'neon'];
for (let i = 0; i < 8; i++) {
  state.panels.push({
    sourceId: 'scene-' + DEFAULT_SPREAD[i],
    zoom: 1.12 + (i % 3) * 0.1,
    ox: [0.55, 0.25, -0.25, 0.1, -0.1, 0.3, -0.3, 0][i],
    oy: [0, -0.05, 0.1, 0, 0.15, -0.15, 0, 0.05][i],
    flip: false,
    ink: null,
  });
}

function resolveSource(id) {
  if (!id) return null;
  if (id.startsWith('scene-')) sceneSource(id.slice(6));
  return sources.get(id) || null;
}

// ---- rendering ----
let renderQueued = false;
let shotCoverActive = false;
function render() {
  if (shotCoverActive) return; // a cover shot owns the canvas outright
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const { w, h } = SIZES[state.size];
    const scale = Math.min(1, 660 / w, 760 / h);
    const pw = Math.round(w * scale), ph = Math.round(h * scale);
    if (preview.width !== pw || preview.height !== ph) {
      preview.width = pw; preview.height = ph;
    }
    drawCover(pctx, pw, ph, state, resolveSource);
  });
}

function renderCoverAt(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  drawCover(c.getContext('2d'), w, h, state, resolveSource);
  return c;
}

// ---- layout thumbnails and grade bars ----
function buildLayoutThumbs() {
  const host = $('layout-thumbs');
  host.innerHTML = '';
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.layout = layout.id;
    const fills = ['#e84e6d', '#ff8c42', '#2fb3c9', '#ffd23f', '#7c5cff', '#2effa8', '#f06ba8', '#4d7dd1'];
    const polys = layout.panels.map((poly, i) =>
      `<polygon points="${poly.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}" fill="${fills[i % fills.length]}" stroke="#fff6e6" stroke-width="1.6"/>`).join('');
    btn.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${polys}</svg><span>${layout.name}</span>`;
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      state.selected = 0;
      syncLayoutUi();
      render();
    });
    host.appendChild(btn);
  }
}

function buildGradeBars() {
  const host = $('grade-bars');
  host.innerHTML = '';
  for (const [id, grade] of Object.entries(GRADES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.grade = id;
    btn.style.background = grade.css;
    btn.innerHTML = `<span>${grade.name}</span>`;
    btn.addEventListener('click', () => {
      state.grade = id;
      syncGradeUi();
      render();
    });
    host.appendChild(btn);
  }
}

function syncLayoutUi() {
  document.querySelectorAll('#layout-thumbs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  buildPanelStrip();
  buildPanelSourceOptions();
  syncPanelControls();
}

function syncGradeUi() {
  document.querySelectorAll('#grade-bars button').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
}

function syncSizeUi() {
  document.querySelectorAll('#size-tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === state.size));
}

// ---- panel strip and per-panel controls ----
function sourceLabel(id) {
  if (!id) return 'empty';
  const src = sources.get(id);
  if (src) return src.label;
  if (id.startsWith('scene-')) {
    const scene = SAMPLE_SCENES.find((s) => s.id === id.slice(6));
    return scene ? scene.name : id;
  }
  return id;
}

function buildPanelStrip() {
  const host = $('panel-strip');
  host.innerHTML = '';
  const count = layoutById(state.layout).panels.length;
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `P${i + 1}<small>${sourceLabel(state.panels[i].sourceId)}</small>`;
    btn.classList.toggle('active', i === state.selected);
    btn.addEventListener('click', () => {
      state.selected = i;
      buildPanelStrip();
      syncPanelControls();
    });
    host.appendChild(btn);
  }
}

function buildPanelSourceOptions() {
  const sel = $('panel-source');
  sel.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '— empty panel —';
  sel.appendChild(empty);
  for (const scene of SAMPLE_SCENES) {
    const opt = document.createElement('option');
    opt.value = 'scene-' + scene.id;
    opt.textContent = 'Scene · ' + scene.name;
    sel.appendChild(opt);
  }
  for (const [id, src] of sources) {
    if (id.startsWith('photo-')) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = 'Photo · ' + src.label;
      sel.appendChild(opt);
    }
  }
  sel.value = state.panels[state.selected].sourceId || '';
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  buildPanelSourceOptions();
  $('panel-zoom').value = p.zoom;
  $('panel-ox').value = p.ox;
  $('panel-oy').value = p.oy;
  $('panel-ink').value = p.ink == null ? state.ink : p.ink;
  $('panel-hint').textContent = `Panel ${state.selected + 1} of ${layoutById(state.layout).panels.length} — drag it on the preview to pan, or use the sliders.`;
}

function bindPanelControls() {
  $('panel-source').addEventListener('change', (e) => {
    state.panels[state.selected].sourceId = e.target.value || null;
    buildPanelStrip();
    render();
  });
  $('panel-zoom').addEventListener('input', (e) => { state.panels[state.selected].zoom = Number(e.target.value); render(); });
  $('panel-ox').addEventListener('input', (e) => { state.panels[state.selected].ox = Number(e.target.value); render(); });
  $('panel-oy').addEventListener('input', (e) => { state.panels[state.selected].oy = Number(e.target.value); render(); });
  $('panel-ink').addEventListener('input', (e) => { state.panels[state.selected].ink = Number(e.target.value); render(); });
  $('panel-flip').addEventListener('click', () => {
    const p = state.panels[state.selected];
    p.flip = !p.flip;
    render();
  });
  $('panel-reset').addEventListener('click', () => {
    const p = state.panels[state.selected];
    p.zoom = 1.1; p.ox = 0; p.oy = 0; p.flip = false; p.ink = null;
    syncPanelControls();
    render();
  });
}

// ---- photos ----
function refreshPhotoChips() {
  const host = $('photo-list');
  host.innerHTML = '';
  for (const [, src] of sources) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = src.label;
    host.appendChild(chip);
  }
}

function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  const id = 'photo-' + (++photoCount);
  img.addEventListener('load', () => {
    sources.set(id, { img, cacheId: id + '-' + img.naturalWidth + 'x' + img.naturalHeight, label: file.name.slice(0, 22) });
    refreshPhotoChips();
    buildPanelSourceOptions();
    render();
  });
  img.src = url;
  return id;
}

function loadAllSamples() {
  for (const scene of SAMPLE_SCENES) sceneSource(scene.id);
  refreshPhotoChips();
  buildPanelSourceOptions();
}

// Deal every loaded source across the panels in turn, each panel taking a
// slightly different crop so a cover mixes many scenes at once.
function spreadSources() {
  loadAllSamples();
  const pool = [...sources.keys()];
  if (!pool.length) return;
  const count = layoutById(state.layout).panels.length;
  for (let i = 0; i < 8; i++) {
    const p = state.panels[i];
    p.sourceId = pool[i % pool.length];
    if (i < count) {
      p.zoom = 1.1 + (i % 4) * 0.09;
      p.ox = [0, 0.3, -0.3, 0.15, -0.15, 0.35, -0.35, 0][i];
      p.oy = [0, -0.12, 0.12, -0.05, 0.18, -0.18, 0.05, -0.05][i];
    }
  }
  buildPanelStrip();
  syncPanelControls();
  render();
}

// One photo mode: a single picture fills every panel, each panel framed on
// a different part of it.
function onePhotoEveryPanel() {
  const photoId = [...sources.keys()].find((id) => id.startsWith('photo-'));
  const id = photoId || allSceneIds()[4];
  for (let i = 0; i < 8; i++) {
    const p = state.panels[i];
    p.sourceId = id;
    p.zoom = 1.25 + i * 0.14;
    p.ox = [0, 0.45, -0.45, 0.2, -0.2, 0.6, -0.6, 0][i];
    p.oy = [0, -0.3, 0.25, -0.45, 0.4, 0, 0.1, -0.1][i];
  }
  buildPanelStrip();
  syncPanelControls();
  render();
}

// ---- lettering and effects inputs ----
function bindTextInputs() {
  const map = [
    ['in-title', 'title'], ['in-subtitle', 'subtitle'], ['in-tagline', 'tagline'],
    ['in-quote', 'quote'], ['in-quote-by', 'quoteBy'],
    ['in-seal-top', 'sealTop'], ['in-seal-bottom', 'sealBottom'],
  ];
  for (const [id, key] of map) {
    const el = $(id);
    el.value = state[key];
    el.addEventListener('input', () => { state[key] = el.value; render(); });
  }
  $('in-title-pos').value = state.titlePos;
  $('in-title-pos').addEventListener('change', (e) => {
    state.titlePos = e.target.value;
    state.titleLift = 0;
    render();
  });
  $('fx-ink').value = state.ink;
  $('fx-grain').value = state.grain;
  $('fx-vignette').value = state.vignette;
  $('fx-ink').addEventListener('input', (e) => { state.ink = Number(e.target.value); render(); });
  $('fx-grain').addEventListener('input', (e) => { state.grain = Number(e.target.value); render(); });
  $('fx-vignette').addEventListener('input', (e) => { state.vignette = Number(e.target.value); render(); });
}

// ---- size tabs and export ----
function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    const note = $('saved-note');
    note.textContent = (note.textContent ? note.textContent + ' · ' : '') + 'Saved ' + name;
  }, 'image/png');
}

function exportCurrent() {
  const { w, h } = SIZES[state.size];
  download(renderCoverAt(w, h), `vice-coast-cover-${w}x${h}.png`);
}

function exportAllSizes() {
  $('saved-note').textContent = '';
  for (const { w, h } of Object.values(SIZES)) {
    download(renderCoverAt(w, h), `vice-coast-cover-${w}x${h}.png`);
  }
}

// ---- preview dragging: pan the selected panel, or nudge the title ----
function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bindPreviewDrag() {
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const rect = preview.getBoundingClientRect();
    const ux = (e.clientX - rect.left) / rect.width;
    const uy = (e.clientY - rect.top) / rect.height;
    const titleY = state.titlePos === 'top' ? 0.16 : state.titlePos === 'bottom' ? 0.8 : 0.47;
    if (Math.abs(uy - (titleY + state.titleLift)) < 0.13) {
      drag = { kind: 'title', startY: uy, lift: state.titleLift };
    } else {
      const layout = layoutById(state.layout);
      const idx = layout.panels.findIndex((poly) => pointInPolygon(ux, uy, poly));
      if (idx >= 0) {
        state.selected = idx;
        buildPanelStrip();
        syncPanelControls();
        const p = state.panels[idx];
        drag = { kind: 'panel', startX: ux, startY: uy, ox: p.ox, oy: p.oy };
      }
    }
    if (drag) preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = preview.getBoundingClientRect();
    const ux = (e.clientX - rect.left) / rect.width;
    const uy = (e.clientY - rect.top) / rect.height;
    if (drag.kind === 'title') {
      state.titleLift = Math.max(-0.3, Math.min(0.3, drag.lift + (uy - drag.startY)));
    } else {
      const p = state.panels[state.selected];
      p.ox = Math.max(-1, Math.min(1, drag.ox - (ux - drag.startX) * 2));
      p.oy = Math.max(-1, Math.min(1, drag.oy - (uy - drag.startY) * 2));
      $('panel-ox').value = p.ox;
      $('panel-oy').value = p.oy;
    }
    render();
  });
  const end = () => { drag = null; };
  preview.addEventListener('pointerup', end);
  preview.addEventListener('pointercancel', end);
}

// ---- shot mode for screenshots ----
function applyShotMode() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shot')) return false;
  const get = (k, fb) => q.get(k) || fb;
  state.layout = get('layout', state.layout);
  state.grade = get('grade', state.grade);
  state.size = get('size', state.size);
  state.title = get('title', state.title);
  state.subtitle = get('subtitle', state.subtitle);
  state.tagline = get('tagline', state.tagline);
  state.quote = get('quote', state.quote);
  state.quoteBy = get('quoteby', state.quoteBy);
  state.titlePos = get('titlepos', state.titlePos);
  if (q.get('ink')) state.ink = Number(q.get('ink'));
  if (q.get('grain')) state.grain = Number(q.get('grain'));
  if (q.get('vignette')) state.vignette = Number(q.get('vignette'));
  const scenes = get('scenes', '').split(',').filter(Boolean);
  scenes.forEach((sceneId, i) => {
    if (i < 8 && SAMPLE_SCENES.some((s) => s.id === sceneId)) {
      state.panels[i].sourceId = 'scene-' + sceneId;
    }
  });
  loadAllSamples();
  if (q.get('shot') === 'cover') {
    document.body.classList.add('shot-cover');
    shotCoverActive = true;
    const w = Number(q.get('w') || 1024), h = Number(q.get('h') || 1280);
    preview.width = w; preview.height = h;
    drawCover(pctx, w, h, state, resolveSource);
    return true;
  }
  document.body.classList.add('shot-editor');
  syncAll();
  render();
  return true;
}

function syncAll() {
  syncLayoutUi();
  syncGradeUi();
  syncSizeUi();
  bindTextInputs();
}

// ---- wire everything ----
function init() {
  buildLayoutThumbs();
  buildGradeBars();
  bindPanelControls();
  bindPreviewDrag();
  $('photo-input').addEventListener('change', (e) => {
    const files = [...e.target.files];
    files.forEach(addPhotoFile);
    if (files.length) setTimeout(spreadSources, 350);
  });
  $('load-samples').addEventListener('click', () => { loadAllSamples(); render(); });
  $('spread').addEventListener('click', spreadSources);
  $('one-photo').addEventListener('click', onePhotoEveryPanel);
  $('clear-photos').addEventListener('click', () => {
    for (const id of [...sources.keys()]) if (id.startsWith('photo-')) sources.delete(id);
    refreshPhotoChips();
    buildPanelSourceOptions();
    render();
  });
  document.querySelectorAll('#size-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      syncSizeUi();
      render();
    }));
  $('export-one').addEventListener('click', exportCurrent);
  $('export-all').addEventListener('click', exportAllSizes);
  loadAllSamples();
  if (!applyShotMode()) {
    syncAll();
    render();
  }
  // Lettering metrics change once local fonts arrive; redraw with them.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());
}

init();
