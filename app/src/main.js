// main.js — the Vice Coast Cover Studio editor: three steps from a photo to a
// PNG. Everything runs locally; photos are read from the person's machine and
// never leave it. No network request is made by this app, ever.

import { LAYOUTS, GRADES, renderCover } from './poster.js';
import { loadSamples } from './samples.js';
import { clamp } from './noise.js';

const SIZES = [
  { id: 'sq', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

const state = {
  sizeId: 'portrait',
  layoutId: 'comic-hero-plus',
  gradeId: 'sunset',
  title: 'VICE COAST',
  subtitle: 'where the neon meets the tide',
  tagline: 'Every sunset here has a price — and a witness',
  quote: 'The loudest, sunniest cover maker on the coast',
  quoteSource: 'The Boardwalk Gazette',
  badge1: 'COAST', badge2: 'CERTIFIED',
  titlePos: 'middle', titleDy: 0,
  ink: 0.55, inkAll: 1, grain: 0.45, vignette: 0.5,
  panels: [],
};

let sources = [];        // { name, img } — samples and the person's photos
let panelState = [];     // per panel: { src, zoom, panX, panY, flip, ink }
let selectedPanel = 0;

const $ = id => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

function currentSize() { return SIZES.find(s => s.id === state.sizeId); }
function currentLayout() { return LAYOUTS.find(l => l.id === state.layoutId); }

function defaultPanel(src) { return { src, zoom: 1, panX: 0, panY: 0, flip: false, ink: state.ink }; }

function ensurePanels() {
  const n = currentLayout().panels.length;
  while (panelState.length < n) panelState.push(defaultPanel(panelState.length % Math.max(1, sources.length)));
  panelState = panelState.slice(0, Math.max(n, panelState.length));
  panelState.length = n;
  if (selectedPanel >= n) selectedPanel = 0;
}

function spread() {
  ensurePanels();
  // portrait scene first (the hero), then the rest in a lively order
  const order = [0, 2, 3, 1, 4, 5];
  panelState = panelState.map((p, i) => ({ ...defaultPanel(order[i % order.length] % sources.length), ink: p.ink }));
  selectedPanel = 0;
  syncPanelControls(); drawPanelStrip(); render();
}

function buildRenderState() {
  ensurePanels();
  return {
    ...state,
    panels: panelState.map(p => {
      const s = sources[p.src % sources.length];
      return { img: s ? s.img : null, zoom: p.zoom, panX: p.panX, panY: p.panY, flip: p.flip, ink: p.ink };
    }),
  };
}

let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const { w, h } = currentSize();
    if (preview.width !== w) preview.width = w;
    if (preview.height !== h) preview.height = h;
    renderCover(pctx, w, h, buildRenderState());
  });
}

// ---- sources: samples and user photos ---------------------------------------
function addSamples() {
  const samples = loadSamples();
  for (const s of samples) {
    if (!sources.some(x => x.name === s.name)) sources.push({ name: s.name, img: s.canvas });
  }
}

function addPhotoFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // sensible automatic framing is handled by cover-fit in the renderer;
      // portrait photos get a touch more zoom so faces fill their panel
      sources.push({ name: file.name.replace(/\.[^.]+$/, ''), img });
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

// ---- controls -----------------------------------------------------------------
function buildSizeTabs() {
  const box = $('sizeTabs');
  box.innerHTML = '';
  for (const s of SIZES) {
    const b = document.createElement('button');
    b.textContent = s.label;
    b.className = 'tab' + (s.id === state.sizeId ? ' on' : '');
    b.onclick = () => { state.sizeId = s.id; buildSizeTabs(); render(); };
    box.appendChild(b);
  }
}

function buildLayoutThumbs() {
  const box = $('layoutThumbs');
  box.innerHTML = '';
  for (const layout of LAYOUTS) {
    const c = document.createElement('canvas');
    c.width = 72; c.height = 54;
    const x = c.getContext('2d');
    x.fillStyle = '#241a38'; x.fillRect(0, 0, 72, 54);
    layout.panels.forEach((poly, i) => {
      x.beginPath();
      poly.forEach(([px, py], j) => { j ? x.lineTo(px * 72, py * 54) : x.moveTo(px * 72, py * 54); });
      x.closePath();
      x.fillStyle = `hsl(${(i * 47 + 300) % 360} 65% ${52 + (i % 3) * 8}%)`;
      x.fill();
      x.strokeStyle = '#fff6ec'; x.lineWidth = 1.4; x.stroke();
    });
    c.title = layout.name;
    c.className = 'thumb' + (layout.id === state.layoutId ? ' on' : '');
    c.onclick = () => { state.layoutId = layout.id; ensurePanels(); buildLayoutThumbs(); drawPanelStrip(); syncPanelControls(); render(); };
    box.appendChild(c);
  }
}

function buildGradeBars() {
  const box = $('gradeBars');
  box.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.className = 'grade' + (g.id === state.gradeId ? ' on' : '');
    const stops = g.ramp.map(([at, col]) => `${col} ${Math.round(at * 100)}%`).join(',');
    b.style.background = `linear-gradient(90deg,${stops})`;
    b.innerHTML = `<span>${g.name}</span>`;
    b.onclick = () => { state.gradeId = g.id; buildGradeBars(); render(); };
    box.appendChild(b);
  }
}

function drawPanelStrip() {
  const box = $('panelStrip');
  box.innerHTML = '';
  panelState.forEach((p, i) => {
    const s = sources[p.src % sources.length];
    const wrap = document.createElement('button');
    wrap.className = 'panelChip' + (i === selectedPanel ? ' on' : '');
    const c = document.createElement('canvas');
    c.width = 56; c.height = 56;
    if (s) c.getContext('2d').drawImage(s.img, 0, 0, 56, 56);
    const label = document.createElement('span');
    label.textContent = `${i + 1} · ${s ? s.name : '—'}`;
    wrap.appendChild(c); wrap.appendChild(label);
    wrap.onclick = () => { selectedPanel = i; drawPanelStrip(); syncPanelControls(); };
    box.appendChild(wrap);
  });
  const sel = $('panelSource');
  sel.innerHTML = '';
  sources.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = s.name;
    sel.appendChild(o);
  });
  if (panelState[selectedPanel]) sel.value = panelState[selectedPanel].src;
}

function syncPanelControls() {
  const p = panelState[selectedPanel];
  if (!p) return;
  $('panelZoom').value = p.zoom;
  $('panelPanX').value = p.panX;
  $('panelPanY').value = p.panY;
  $('panelInk').value = p.ink;
  $('panelTitle').textContent = `Panel ${selectedPanel + 1} of ${panelState.length}`;
}

function bindControls() {
  $('fileInput').addEventListener('change', async (e) => {
    for (const f of e.target.files) await addPhotoFile(f);
    setStatus(`${sources.length} photos and scenes ready — pick a panel and place them.`);
    spread();
  });
  $('loadSamples').onclick = () => { addSamples(); spread(); setStatus('All six sample scenes loaded and spread across the panels.'); };
  $('spreadBtn').onclick = () => { spread(); setStatus('Photos and scenes dealt across the panels.'); };
  $('onePhoto').addEventListener('change', (e) => {
    if (!sources.length) return;
    const src = panelState[selectedPanel] ? panelState[selectedPanel].src : 0;
    panelState = panelState.map((p, i) => ({
      src, zoom: 1 + (i % 4) * 0.22, panX: ((i % 3) - 1) * 0.4, panY: (((i + 1) % 3) - 1) * 0.35, flip: i % 2 === 1, ink: p.ink,
    }));
    drawPanelStrip(); syncPanelControls(); render();
    setStatus(e.target.checked ? 'One photo, a different crop in every panel.' : 'Back to one scene per panel — press Spread.');
    if (!e.target.checked) spread();
  });
  const text = (id, key) => $(id).addEventListener('input', (e) => { state[key] = e.target.value; render(); });
  text('inTitle', 'title'); text('inSubtitle', 'subtitle'); text('inTagline', 'tagline');
  text('inQuote', 'quote'); text('inQuoteSource', 'quoteSource');
  text('inBadge1', 'badge1'); text('inBadge2', 'badge2');
  $('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; state.titleDy = 0; render(); });
  const slider = (id, key, fmt) => $(id).addEventListener('input', (e) => {
    state[key] = parseFloat(e.target.value);
    if (fmt) $(id + 'Val').textContent = fmt(state[key]);
    render();
  });
  // the all-panels Poster Ink slider scales every panel's own ink in the renderer
  $('inkAll').addEventListener('input', (e) => {
    state.inkAll = parseFloat(e.target.value) / 0.55;
    state.ink = parseFloat(e.target.value);
    $('inkAllVal').textContent = `${Math.round(state.ink * 100)}%`;
    render();
  });
  slider('grain', 'grain', v => `${Math.round(v * 100)}%`);
  slider('vignette', 'vignette', v => `${Math.round(v * 100)}%`);
  const pslider = (id, key) => $(id).addEventListener('input', (e) => {
    const p = panelState[selectedPanel]; if (!p) return;
    p[key] = parseFloat(e.target.value); render();
  });
  pslider('panelZoom', 'zoom'); pslider('panelPanX', 'panX'); pslider('panelPanY', 'panY'); pslider('panelInk', 'ink');
  $('panelFlip').onclick = () => { const p = panelState[selectedPanel]; if (p) { p.flip = !p.flip; render(); } };
  $('panelSource').addEventListener('change', (e) => {
    const p = panelState[selectedPanel]; if (!p) return;
    p.src = parseInt(e.target.value, 10); drawPanelStrip(); render();
  });
  $('exportOne').onclick = () => exportPng(currentSize());
  $('exportAll').onclick = async () => {
    for (const s of SIZES) { await exportPng(s, true); await new Promise(r => setTimeout(r, 350)); }
    setStatus('All three sizes saved: 1080 × 1080, 1080 × 1350 and 1920 × 1080.');
  };
  // drag the title block up or down the cover
  let dragging = false, startY = 0, startDy = 0;
  preview.addEventListener('pointerdown', (e) => {
    const rect = preview.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    const anchor = state.titlePos === 'top' ? 0.17 : state.titlePos === 'bottom' ? 0.8 : 0.5;
    if (Math.abs(y - (anchor + state.titleDy)) < 0.14) { dragging = true; startY = y; startDy = state.titleDy; preview.setPointerCapture(e.pointerId); }
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    state.titleDy = clamp(startDy + (y - startY), -0.3, 0.3);
    render();
  });
  preview.addEventListener('pointerup', () => { dragging = false; });
}

function setStatus(msg) { $('status').textContent = msg; }

async function exportPng(size, quiet) {
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  renderCover(off.getContext('2d'), size.w, size.h, buildRenderState());
  const blob = await new Promise(r => off.toBlob(r, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-coast-cover-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  if (!quiet) setStatus(`Saved vice-coast-cover-${size.w}x${size.h}.png — ready to post.`);
  else setStatus(`Saved ${size.w} × ${size.h}…`);
  return true;
}

// ---- screenshot / share mode ---------------------------------------------------
function applyShotParams() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shot')) return false;
  if (q.get('size')) { const s = SIZES.find(x => `${x.w}x${x.h}` === q.get('size')); if (s) state.sizeId = s.id; }
  if (q.get('layout') && LAYOUTS.some(l => l.id === q.get('layout'))) state.layoutId = q.get('layout');
  if (q.get('grade') && GRADES.some(g => g.id === q.get('grade'))) state.gradeId = q.get('grade');
  if (q.get('title')) state.title = q.get('title');
  if (q.get('subtitle')) state.subtitle = q.get('subtitle');
  if (q.get('titlepos')) state.titlePos = q.get('titlepos');
  addSamples();
  spread();
  if (q.get('assign')) {
    const ids = q.get('assign').split(',');
    const samples = loadSamples();
    panelState = panelState.map((p, i) => {
      const idx = samples.findIndex(s => s.id === ids[i % ids.length]);
      return { ...p, src: idx >= 0 ? idx : p.src };
    });
  }
  if (q.get('shot') === 'cover') document.body.classList.add('shot-cover');
  return true;
}

// ---- boot ------------------------------------------------------------------------
addSamples();
bindControls();
buildSizeTabs();
buildLayoutThumbs();
buildGradeBars();
const wasShot = applyShotParams();
if (!wasShot) spread();
else { drawPanelStrip(); syncPanelControls(); render(); }
setStatus('Six sample scenes are loaded. Add your own photo, type a caption, export the PNG.');
window.__viceCoastReady = true;
