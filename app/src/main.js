// Marlin Coast Cover Studio — editor wiring.
//
// The studio loads its bundled cast photographs, lets the visitor swap any
// panel for a photo of their own, retitle the script line, switch layout and
// grade, and export the finished cover as a PNG. Everything happens in the
// browser; no photo ever leaves the machine. A `?shot=` query builds one of
// the fixed scenes used for the entry's screenshots instead (./shots.js).

import { CAST, GRADES, LAYOUTS, drawCover } from './cover.js';
import { runShot } from './shots.js';

export const SLOTS = [
  ...CAST.map((c) => ({ slot: c.slot, file: c.file, label: c.tag })),
  { slot: 'car', file: 'assets/car.jpg', label: 'THE CONVERTIBLE' },
  { slot: 'aerial', file: 'assets/aerial.jpg', label: 'THE COASTLINE' },
];

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const status = document.getElementById('status');
const slotSelect = document.getElementById('slot');

const state = {
  layout: 'slant',
  grade: 'sunset',
  caption: captionInput.value,
  images: {},
};

export function redraw() {
  state.caption = captionInput.value;
  drawCover(canvas, state);
}

async function loadBundled() {
  for (const s of SLOTS) state.images[s.slot] = await loadImage(s.file);
}

function pickGroup(id, attr, apply) {
  const el = document.getElementById(id);
  el.addEventListener('click', (e) => {
    const btn = e.target.closest(`[data-${attr}]`);
    if (!btn) return;
    el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    apply(btn.dataset[attr]);
    redraw();
  });
}

pickGroup('layouts', 'layout', (v) => { state.layout = v; });
pickGroup('grades', 'grade', (v) => { state.grade = v; });

captionInput.addEventListener('input', redraw);

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.images[slotSelect.value] = await loadImage(URL.createObjectURL(file));
  status.textContent = `Panel ${slotSelect.selectedOptions[0].textContent} now uses your photo.`;
  redraw();
});

document.getElementById('reset').addEventListener('click', async () => {
  await loadBundled();
  status.textContent = 'Bundled cast restored.';
  redraw();
});

for (const [id, w, h] of [['export-square', 1080, 1080], ['export-portrait', 1080, 1350], ['export-wide', 1920, 1080]]) {
  document.getElementById(id).addEventListener('click', () => {
    const off = document.createElement('canvas');
    drawCover(off, state, { w, h });
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `marlin-coast-${state.layout}-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved marlin-coast-${state.layout}-${w}x${h}.png`;
    }, 'image/png');
  });
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, loadBundled, redraw);
} else {
  loadBundled().then(redraw);
}
