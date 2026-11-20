// Marlin Coast Cover Studio — the editor.
//
// The page wires the studio together: the bundled example photographs
// load into their panels, the visitor swaps any panel for a photo of
// their own, crops it with zoom and drag sliders (the crop stays centred
// on the face-aware focus point), picks a layout and a grade, edits the
// title and caption, and exports the cover as a PNG in the three post
// sizes. Everything happens on this machine; no photo is ever uploaded.
import {
  ALL_PANELS,
  CAST_MEMBERS,
  GRADES,
  LAYOUT_LABELS,
  drawCoverArt,
  freshStudioState,
} from './cover.js';
import { runShotScene } from './shots.js';

const EXPORT_SIZES = [
  { id: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

const state = freshStudioState();
let selectedPanelId = 'dj';

const canvas = document.getElementById('coverCanvas');
const statusLine = document.getElementById('statusLine');
const panelList = document.getElementById('panelList');
const zoomRange = document.getElementById('zoomRange');
const xRange = document.getElementById('xRange');
const yRange = document.getElementById('yRange');

function say(text) {
  statusLine.textContent = text;
}

function redraw() {
  drawCoverArt(canvas.getContext('2d'), canvas.width, canvas.height, state);
}

/** Loads an image from a URL or object URL, resolving once it can be drawn. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Loads the seven bundled photographs into their panels, then repaints. */
async function loadBundledPhotos() {
  await Promise.all(ALL_PANELS.map(async (def) => {
    try {
      state.panels[def.id].img = await loadImage(def.asset);
    } catch {
      say(`Could not load ${def.asset}`);
    }
  }));
  redraw();
}

function selectedPanel() {
  return state.panels[selectedPanelId];
}

function syncCropControls() {
  const panel = selectedPanel();
  zoomRange.value = String(panel.zoom);
  xRange.value = String(panel.dx);
  yRange.value = String(panel.dy);
  document.getElementById('selectedPanelName').textContent = panel.def.name;
  for (const btn of panelList.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.panel === selectedPanelId);
  }
}

function buildPanelList() {
  for (const def of ALL_PANELS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.panel = def.id;
    btn.textContent = def.name.replace(/^THE /, '');
    btn.addEventListener('click', () => {
      selectedPanelId = def.id;
      if (CAST_MEMBERS.some((c) => c.id === def.id)) state.heroId = def.id;
      syncCropControls();
      redraw();
    });
    panelList.appendChild(btn);
  }
}

function buildChoiceRow(rowId, values, labels, current, onPick) {
  const row = document.getElementById(rowId);
  for (const value of values) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = labels[value];
    btn.dataset.value = value;
    if (value === current) btn.classList.add('active');
    btn.addEventListener('click', () => {
      onPick(value);
      for (const b of row.querySelectorAll('button')) b.classList.toggle('active', b.dataset.value === value);
      redraw();
    });
    row.appendChild(btn);
  }
}

document.getElementById('photoFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const panel = selectedPanel();
  panel.img = await loadImage(URL.createObjectURL(file));
  panel.focus = { x: 0.5, y: 0.38 };
  panel.zoom = 1; panel.dx = 0; panel.dy = 0;
  syncCropControls();
  redraw();
  say(`${file.name} is in the ${panel.def.name} panel — it never left this machine.`);
});

document.getElementById('fillAllBtn').addEventListener('click', async () => {
  const source = selectedPanel().img;
  if (!source) return;
  for (const def of ALL_PANELS) {
    if (def.id === selectedPanelId) continue;
    const panel = state.panels[def.id];
    panel.img = source;
    panel.focus = { x: 0.5, y: 0.38 };
    panel.zoom = 1; panel.dx = 0; panel.dy = 0;
  }
  redraw();
  say('Your photo now fills every panel. Pick a panel to fine-tune its crop.');
});

document.getElementById('resetPanelBtn').addEventListener('click', async () => {
  const panel = selectedPanel();
  panel.img = await loadImage(panel.def.asset);
  panel.focus = { ...panel.def.focus };
  panel.zoom = 1; panel.dx = 0; panel.dy = 0;
  syncCropControls();
  redraw();
  say(`${panel.def.name} is back on its bundled photograph.`);
});

for (const [range, key] of [[zoomRange, 'zoom'], [xRange, 'dx'], [yRange, 'dy']]) {
  range.addEventListener('input', () => {
    selectedPanel()[key] = Number(range.value);
    redraw();
  });
}

document.getElementById('titleInput').addEventListener('input', (event) => {
  state.title = event.target.value;
  redraw();
});
document.getElementById('captionInput').addEventListener('input', (event) => {
  state.caption = event.target.value;
  redraw();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const sizeId = document.getElementById('sizeSelect').value;
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) ?? EXPORT_SIZES[0];
  const out = document.createElement('canvas');
  out.width = size.w;
  out.height = size.h;
  drawCoverArt(out.getContext('2d'), size.w, size.h, state);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `marlin-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    say(`Saved marlin-coast-cover-${size.w}x${size.h}.png`);
  }, 'image/png');
});

buildPanelList();
buildChoiceRow('layoutRow', Object.keys(LAYOUT_LABELS), LAYOUT_LABELS, state.layout, (v) => { state.layout = v; });
buildChoiceRow('gradeRow', Object.keys(GRADES), Object.fromEntries(Object.entries(GRADES).map(([k, g]) => [k, g.label])), state.grade, (v) => { state.grade = v; });
syncCropControls();
redraw();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShotScene(shot, query, async (layout, grade) => {
    state.layout = layout;
    state.grade = grade;
    if (shot === 'cover') {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    await loadBundledPhotos();
    for (const rowId of ['layoutRow', 'gradeRow']) {
      const row = document.getElementById(rowId);
      const current = rowId === 'layoutRow' ? state.layout : state.grade;
      for (const b of row.querySelectorAll('button')) b.classList.toggle('active', b.dataset.value === current);
    }
    redraw();
  });
} else {
  loadBundledPhotos();
}
