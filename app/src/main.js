// main.js — wires the Vice Coast Cover Studio UI to the cover renderer.
// No network: photos come from the file picker or the bundled samples, and
// the cover is drawn on a canvas and exported as a PNG download.

import { GRADES, LAYOUTS, CAPTION_STYLES, drawCover, panelAt } from './cover.js';

const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

const state = {
  layout: 'hero',
  grade: 'sunset',
  gradeIntensity: 0.55,
  photos: [null, null, null],
  caption: { text: 'VICE COAST', tagline: 'sunset chasers', size: 0.085, position: 'bottom', style: 'solid' },
};

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
let selectedSlot = 0;
let panels = [];

// The preview is square; the layout code uses the canvas size, so any
// export size is just a re-render at that size.
function render() {
  panels = drawCover(ctx, canvas.width, canvas.height, state);
  document.querySelectorAll('.slot').forEach((el, i) => {
    el.classList.toggle('active', i === selectedSlot);
  });
}

function blankPhoto() {
  return { img: null, zoom: 1, panX: 0, panY: 0, flip: false, fit: 'cover' };
}

// Sensible auto-framing: fill the panel, bias the view a little above centre
// (where faces usually are in portrait photos).
function autoframe(photo) {
  photo.zoom = 1;
  photo.panX = 0;
  photo.panY = photo.img && photo.img.naturalHeight > photo.img.naturalWidth ? -0.06 : 0;
}

function setPhoto(slot, img, label) {
  const photo = blankPhoto();
  photo.img = img;
  autoframe(photo);
  state.photos[slot] = photo;
  selectedSlot = slot;
  const thumb = document.querySelector(`#slot-${slot} .thumb`);
  if (thumb) thumb.src = img.src;
  const name = document.querySelector(`#slot-${slot} .photoname`);
  if (name) name.textContent = label;
  render();
}

function loadSample(slot, sample) {
  const img = new Image();
  img.onload = () => setPhoto(slot, img, sample.name);
  img.src = sample.src;
}

function loadFile(slot, file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => setPhoto(slot, img, file.name);
  img.src = url;
}

// ---- photo slot cards ------------------------------------------------------
const slotsEl = document.getElementById('slots');
for (let slot = 0; slot < 3; slot++) {
  const div = document.createElement('div');
  div.className = 'slot';
  div.id = `slot-${slot}`;
  div.innerHTML = `
    <div class="slothead">
      <img class="thumb" alt="">
      <div><b>Photo ${slot + 1}${slot === 0 ? ' — hero' : ''}</b><br><small class="photoname">No photo yet</small></div>
    </div>
    <div class="minirow">
      <label class="filebtn">Upload<input type="file" accept="image/*" hidden></label>
      ${SAMPLES.map((s, i) => `<button type="button" data-sample="${i}">${s.name}</button>`).join('')}
      <button type="button" data-act="flip">Flip</button>
      <button type="button" data-act="reset">Reset</button>
    </div>
    <label class="row"><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value="1" data-ctl="zoom"><output>1.00×</output></label>
    <label class="row"><span>Pan X</span><input type="range" min="-0.5" max="0.5" step="0.01" value="0" data-ctl="panX"><output>0</output></label>
    <label class="row"><span>Pan Y</span><input type="range" min="-0.5" max="0.5" step="0.01" value="0" data-ctl="panY"><output>0</output></label>
    <label class="row"><span>Fit</span>
      <select data-ctl="fit"><option value="cover">Fill panel (crop)</option><option value="contain">Fit whole photo</option></select>
    </label>`;
  slotsEl.appendChild(div);

  div.addEventListener('click', () => { selectedSlot = slot; render(); });
  div.querySelector('input[type="file"]').addEventListener('change', (e) => loadFile(slot, e.target.files[0]));
  div.querySelectorAll('[data-sample]').forEach((b) => {
    b.addEventListener('click', (e) => { e.stopPropagation(); loadSample(slot, SAMPLES[+b.dataset.sample]); });
  });
  div.querySelector('[data-act="flip"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const p = state.photos[slot];
    if (p) { p.flip = !p.flip; render(); }
  });
  div.querySelector('[data-act="reset"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const p = state.photos[slot];
    if (p) { autoframe(p); syncSlotControls(slot); render(); }
  });
  div.querySelectorAll('[data-ctl]').forEach((ctl) => {
    ctl.addEventListener('input', () => {
      const p = state.photos[slot];
      if (!p) return;
      const key = ctl.dataset.ctl;
      if (key === 'fit') p.fit = ctl.value;
      else p[key] = parseFloat(ctl.value);
      const out = ctl.closest('label').querySelector('output');
      if (out) out.textContent = key === 'zoom' ? `${p.zoom.toFixed(2)}×` : String(p[key]);
      render();
    });
  });
}

function syncSlotControls(slot) {
  const p = state.photos[slot];
  const div = document.getElementById(`slot-${slot}`);
  if (!p || !div) return;
  div.querySelector('[data-ctl="zoom"]').value = p.zoom;
  div.querySelector('[data-ctl="panX"]').value = p.panX;
  div.querySelector('[data-ctl="panY"]').value = p.panY;
  div.querySelector('[data-ctl="fit"]').value = p.fit;
  div.querySelector('[data-ctl="zoom"]').closest('label').querySelector('output').textContent = `${p.zoom.toFixed(2)}×`;
}

document.getElementById('autoframe').addEventListener('click', () => {
  state.photos.forEach((p, i) => { if (p) { autoframe(p); syncSlotControls(i); } });
  render();
});

// ---- layout + grade choices -------------------------------------------------
function buildChoices(el, entries, current, onPick, hintEl) {
  Object.entries(entries).forEach(([key, info]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = info.name;
    b.setAttribute('aria-pressed', String(key === current));
    b.addEventListener('click', () => {
      onPick(key);
      el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      if (hintEl) hintEl.textContent = info.hint;
      render();
    });
    el.appendChild(b);
  });
  if (hintEl) hintEl.textContent = entries[current].hint;
}
buildChoices(
  document.getElementById('layoutChoices'), LAYOUTS, state.layout,
  (key) => { state.layout = key; },
  document.getElementById('layoutHint'),
);
buildChoices(
  document.getElementById('gradeChoices'), GRADES, state.grade,
  (key) => { state.grade = key; },
  document.getElementById('gradeHint'),
);

// ---- caption ------------------------------------------------------------------
const captionInput = document.getElementById('captionText');
const taglineInput = document.getElementById('taglineText');
const sizeInput = document.getElementById('captionSize');
const sizeOut = document.getElementById('captionSizeOut');
const posInput = document.getElementById('captionPos');
const styleInput = document.getElementById('captionStyle');
captionInput.addEventListener('input', () => { state.caption.text = captionInput.value; render(); });
taglineInput.addEventListener('input', () => { state.caption.tagline = taglineInput.value; render(); });
sizeInput.addEventListener('input', () => {
  state.caption.size = parseFloat(sizeInput.value) / 100;
  sizeOut.textContent = `${sizeInput.value}%`;
  render();
});
posInput.addEventListener('change', () => { state.caption.position = posInput.value; render(); });
styleInput.addEventListener('change', () => { state.caption.style = styleInput.value; render(); });

const gradeStrength = document.getElementById('gradeStrength');
const gradeStrengthOut = document.getElementById('gradeStrengthOut');
gradeStrength.addEventListener('input', () => {
  state.gradeIntensity = parseInt(gradeStrength.value, 10) / 100;
  gradeStrengthOut.textContent = `${gradeStrength.value}%`;
  render();
});

// ---- canvas interaction: click to pick a panel, drag to pan, wheel to zoom --
function coverPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = coverPoint(e);
  const panel = panelAt(panels, pt.x, pt.y);
  if (!panel || panel.slot === 3) return;
  selectedSlot = panel.slot;
  const photo = state.photos[panel.slot];
  if (!photo) return;
  drag = { x: pt.x, y: pt.y, panX: photo.panX, panY: photo.panY, panel };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = coverPoint(e);
  const photo = state.photos[selectedSlot];
  if (!photo) return;
  photo.panX = drag.panX + (pt.x - drag.x) / drag.panel.w;
  photo.panY = drag.panY + (pt.y - drag.y) / drag.panel.h;
  photo.panX = Math.max(-0.6, Math.min(0.6, photo.panX));
  photo.panY = Math.max(-0.6, Math.min(0.6, photo.panY));
  syncSlotControls(selectedSlot);
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const pt = coverPoint(e);
  const panel = panelAt(panels, pt.x, pt.y);
  if (!panel || panel.slot === 3) return;
  const photo = state.photos[panel.slot];
  if (!photo) return;
  selectedSlot = panel.slot;
  photo.zoom = Math.max(1, Math.min(3, photo.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncSlotControls(selectedSlot);
  render();
}, { passive: false });
canvas.addEventListener('dblclick', (e) => {
  const pt = coverPoint(e);
  const panel = panelAt(panels, pt.x, pt.y);
  if (!panel || panel.slot === 3) return;
  const photo = state.photos[panel.slot];
  if (!photo) return;
  autoframe(photo);
  syncSlotControls(panel.slot);
  render();
});

// ---- export -------------------------------------------------------------------
function exportCover() {
  const [w, h] = document.getElementById('exportSize').value.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}

document.getElementById('exportBtn').addEventListener('click', async () => {
  const blob = await exportCover();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const img = document.getElementById('exportImg');
  img.src = url;
  const link = document.getElementById('downloadLink');
  link.href = url;
  const [w, h] = document.getElementById('exportSize').value.split('x');
  link.download = `vice-coast-cover-${w}x${h}.png`;
  document.getElementById('exportView').hidden = false;
  document.getElementById('exportView').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
document.getElementById('closeExport').addEventListener('click', () => {
  document.getElementById('exportView').hidden = true;
});

// Exposed for automated checks and screenshots: renders the export and
// returns a PNG data URL at the requested size.
window.__viceCoast = {
  state,
  render,
  loadSample: (slot, i) => loadSample(slot, SAMPLES[i]),
  exportDataUrl: async (size) => {
    const [w, h] = size.split('x').map(Number);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off.getContext('2d'), w, h, state);
    return off.toDataURL('image/png');
  },
};

// Start with the two samples loaded so the first paint already shows a cover.
loadSample(0, SAMPLES[0]);
loadSample(1, SAMPLES[1]);
loadSample(2, SAMPLES[1]);
render();
