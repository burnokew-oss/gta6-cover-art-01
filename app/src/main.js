// Marlin Coast Cover Studio — the page wiring.
//
// The studio opens with the bundled Marlin Coast photographs already on the
// sheet, so the cover is alive at first paint. Dropping in your own photos
// replaces panels in order from the panel you pick; the caption, layout,
// grade, size and the photo's zoom and position are all live controls, and
// Export renders the exact post size as a PNG. Everything happens on this
// machine: photos are read as object URLs and never uploaded. A `?shot=`
// query instead stages a fixed scene for the screenshots (./shots.js).
import { CAST, CAR, AERIAL, drawCover } from './cover.js';
import { runShot } from './shots.js';

export const PANELS = [...CAST, CAR, AERIAL];
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const els = {
  photos: document.getElementById('photos'),
  caption: document.getElementById('caption'),
  layout: document.getElementById('layout'),
  grade: document.getElementById('grade'),
  size: document.getElementById('size'),
  target: document.getElementById('target'),
  zoom: document.getElementById('zoom'),
  nudgeX: document.getElementById('nudge-x'),
  nudgeY: document.getElementById('nudge-y'),
  reset: document.getElementById('reset-photo'),
  export: document.getElementById('export'),
  status: document.getElementById('status'),
};

export const state = {
  layout: 'cast',
  grade: 'sunset',
  caption: 'Sunset Heist',
  images: { user: null },
  userKey: 'dj',
  zoom: 1,
  nudgeX: 0,
  nudgeY: 0,
};
for (const meta of PANELS) state.images[meta.key] = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads every bundled photograph into the state; resolves when all are in. */
export async function loadBundled() {
  await Promise.all(PANELS.map(async (meta) => {
    state.images[meta.key] = await loadImage(meta.file);
  }));
}

export function redraw() {
  const [w, h] = SIZES[els.size.value] || SIZES['1080x1350'];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  state.layout = els.layout.value;
  state.grade = els.grade.value;
  state.caption = els.caption.value;
  state.userKey = els.target.value;
  state.zoom = Number(els.zoom.value);
  state.nudgeX = Number(els.nudgeX.value);
  state.nudgeY = Number(els.nudgeY.value);
  drawCover(canvas, state);
}

async function onPhotos(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  const start = PANELS.findIndex((m) => m.key === els.target.value);
  for (let i = 0; i < files.length; i++) {
    const meta = PANELS[(start + i) % PANELS.length];
    const img = await loadImage(URL.createObjectURL(files[i]));
    state.images[meta.key] = img;
    if (i === 0) {
      state.images.user = img;
      state.userKey = meta.key;
      els.target.value = meta.key;
    }
  }
  els.status.textContent = files.length === 1
    ? 'Your photo is on the cover. Nudge it, then export.'
    : `${files.length} photos placed across the panels.`;
  redraw();
}

function onExport() {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `marlin-coast-cover-${canvas.width}x${canvas.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    els.status.textContent = `Saved marlin-coast-cover-${canvas.width}x${canvas.height}.png`;
  }, 'image/png');
}

els.photos.addEventListener('change', onPhotos);
for (const el of [els.caption, els.layout, els.grade, els.size, els.target, els.zoom, els.nudgeX, els.nudgeY]) {
  el.addEventListener('input', redraw);
  el.addEventListener('change', redraw);
}
els.reset.addEventListener('click', () => {
  els.zoom.value = '1';
  els.nudgeX.value = '0';
  els.nudgeY.value = '0';
  redraw();
});
els.export.addEventListener('click', onExport);

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShot(query, { state, els, canvas, loadBundled, redraw });
} else {
  loadBundled().then(redraw).catch(() => redraw());
}
