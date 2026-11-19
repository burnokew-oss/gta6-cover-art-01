// Vice Coast Cover Studio — wires the editor: photo slots, layout and grade
// buttons, per-panel crop controls, caption editing, and PNG export at the
// three common post sizes. A `?shot=` query builds a fixed scene instead,
// so screenshots are reproducible (see ./shots.js).
import { renderCover, defaultState, layoutPanels, GRADES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const photoStatus = document.getElementById('photoStatus');
const state = defaultState();

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

function redraw() {
  // The selection outline is an editor aid: never draw it on a cover scene.
  const showSelection = !document.body.classList.contains('shot-cover');
  const panels = renderCover(canvas, state, { selectedPanel: showSelection ? state.selectedPanel : null });
  syncPanelControls(panels);
  return panels;
}

function syncPanelControls(panels) {
  const i = state.selectedPanel;
  const names = ['1 (hero)', '2', '3', '4'];
  document.getElementById('panelName').textContent = names[i] ?? String(i + 1);
  const slot = state.panelPhotos[i] ?? 0;
  document.getElementById('panelPhoto').value = String(slot);
  const photo = state.photos[slot];
  document.getElementById('zoom').value = String(photo.zoom);
  document.getElementById('zoomVal').textContent = `${photo.zoom.toFixed(2)}×`;
  document.getElementById('panX').value = String(photo.panX);
  document.getElementById('panY').value = String(photo.panY);
  const loaded = state.photos.filter((p) => p.img).length;
  photoStatus.textContent = loaded === 0
    ? 'No photo yet — pick one, or load a sample.'
    : `${loaded} photo${loaded > 1 ? 's' : ''} loaded. Click a panel to crop that photo.`;
  state.photos.forEach((p, n) => {
    document.querySelector(`label.file-btn:nth-child(${n + 1})`)?.classList.toggle('loaded', Boolean(p.img));
  });
  void panels;
}

/** Puts an image into a photo slot and redraws. */
async function setPhoto(slot, img) {
  state.photos[slot] = { img, zoom: 1, panX: 0, panY: 0 };
  redraw();
}

async function loadSample(slot, file) {
  try {
    await setPhoto(slot, await loadImage(`samples/${file}`));
    status.textContent = `Sample photo loaded into Photo ${slot + 1}.`;
  } catch {
    status.textContent = 'That sample could not be loaded.';
  }
}

function bindFileInput(id, slot) {
  document.getElementById(id).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await setPhoto(slot, await loadImage(URL.createObjectURL(file)));
      status.textContent = `${file.name} is in Photo ${slot + 1}.`;
    } catch {
      status.textContent = 'That file could not be read as a photo.';
    }
  });
}
bindFileInput('photo0', 0);
bindFileInput('photo1', 1);
bindFileInput('photo2', 2);

document.getElementById('sampleA').addEventListener('click', () => loadSample(0, 'boulevard.jpg'));
document.getElementById('sampleB').addEventListener('click', () => loadSample(1, 'pier.jpg'));
document.getElementById('fillAll').addEventListener('click', () => {
  const first = state.panelPhotos[0] ?? 0;
  state.panelPhotos = state.panelPhotos.map(() => first);
  redraw();
  status.textContent = 'Every panel now shows the same photo.';
});

// Layout and grade segmented buttons.
function bindSegment(id, key, values) {
  document.getElementById(id).addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-' + key + ']');
    if (!btn) return;
    state[key] = btn.dataset[key];
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle('on', b === btn));
    if (key === 'layout') {
      const count = LAYOUTS[state.layout].panels;
      state.panelPhotos = Array.from({ length: count }, (_, i) => state.panelPhotos[i] ?? (i % 3));
      state.selectedPanel = 0;
      // The preview canvas follows the layout's shape only for tall/wide
      // exports; the editor preview stays square for a stable workspace.
    }
    redraw();
  });
  void values;
}
bindSegment('layoutSeg', 'layout');
bindSegment('gradeSeg', 'grade');

// Per-panel crop controls edit the photo shown in the selected panel.
document.getElementById('panelPhoto').addEventListener('change', (e) => {
  state.panelPhotos[state.selectedPanel] = Number(e.target.value);
  redraw();
});
function cropControl(id, apply) {
  document.getElementById(id).addEventListener('input', (e) => {
    const slot = state.panelPhotos[state.selectedPanel] ?? 0;
    apply(state.photos[slot], Number(e.target.value));
    redraw();
  });
}
cropControl('zoom', (photo, v) => { photo.zoom = v; });
cropControl('panX', (photo, v) => { photo.panX = v; });
cropControl('panY', (photo, v) => { photo.panY = v; });
document.getElementById('autoFrame').addEventListener('click', () => {
  const slot = state.panelPhotos[state.selectedPanel] ?? 0;
  const photo = state.photos[slot];
  if (!photo.img) { status.textContent = 'Load a photo first.'; return; }
  // Smart-ish framing: a portrait photo in a wide panel zooms to its width,
  // a landscape photo in a tall panel zooms to its height; centred either way.
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const p = panels[state.selectedPanel];
  const photoRatio = photo.img.naturalWidth / photo.img.naturalHeight;
  const panelRatio = p.w / p.h;
  photo.zoom = photoRatio > panelRatio ? 1.35 : 1.15;
  photo.panX = 0;
  photo.panY = photoRatio > panelRatio ? 0 : -0.15;
  redraw();
  status.textContent = 'Auto-framed the selected panel.';
});
document.getElementById('resetPanel').addEventListener('click', () => {
  const slot = state.panelPhotos[state.selectedPanel] ?? 0;
  state.photos[slot] = { ...state.photos[slot], zoom: 1, panX: 0, panY: 0 };
  redraw();
});

// Caption controls.
document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); redraw(); });
document.getElementById('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
document.getElementById('outline').addEventListener('change', (e) => { state.outline = e.target.checked; redraw(); });
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });

// Click the preview to select a panel (hit-test against its rectangles).
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const hit = panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  if (hit >= 0) {
    state.selectedPanel = hit;
    redraw();
  }
});

/** Exports the cover at an exact post size and downloads the PNG. */
export function exportCover(sizeLabel) {
  const [w, h] = sizeLabel.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off, state, {});
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-coast-${w}x${h}.png — ready to post.`;
  }, 'image/png');
}

document.querySelectorAll('.export-seg button').forEach((btn) => {
  btn.addEventListener('click', () => exportCover(btn.dataset.size));
});

// Fixed screenshot scenes: ?shot=cover draws the cover alone, ?shot=editor
// shows the editor with sample photos loaded.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, { loadImage, setPhoto, redraw, exportCover, canvas });
} else {
  redraw();
}
