// Marlin Coast Cover Studio — editor wiring (round 12).
// Owns the page state, the bundled-photo defaults, per-panel crop
// controls, user-photo uploads and the PNG export. The drawing itself
// lives in cover.js; this file only drives it from the page.

import { CAST, GRADES, LAYOUTS, SIZES, defaultState, drawCover, loadPhotos } from './cover.js';

const state = defaultState();
let photos = {};
let pickedPanel = 'dj';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const notice = $('notice');

function showNotice(text) {
  notice.textContent = text;
  notice.hidden = !text;
}

function refreshPreview() {
  try {
    const dims = drawCover(preview, photos, state);
    preview.dataset.w = String(dims.w);
    preview.dataset.h = String(dims.h);
  } catch (err) {
    showNotice(`Preview failed: ${err.message}`);
  }
}

function markButtons(group, value) {
  for (const btn of document.querySelectorAll(`[data-group="${group}"]`)) {
    btn.classList.toggle('on', btn.dataset.value === value);
  }
}

function buildControlRows() {
  const layoutBox = $('layouts');
  for (const item of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.group = 'layout';
    btn.dataset.value = item.id;
    btn.textContent = item.name;
    btn.title = item.blurb;
    btn.addEventListener('click', () => {
      state.layout = item.id;
      markButtons('layout', item.id);
      refreshPreview();
    });
    layoutBox.appendChild(btn);
  }
  const gradeBox = $('grades');
  for (const item of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.group = 'grade';
    btn.dataset.value = item.id;
    btn.textContent = item.name;
    btn.addEventListener('click', () => {
      state.grade = item.id;
      markButtons('grade', item.id);
      refreshPreview();
    });
    gradeBox.appendChild(btn);
  }
  const sizeBox = $('sizes');
  for (const item of Object.values(SIZES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.group = 'size';
    btn.dataset.value = item.id;
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      state.size = item.id;
      markButtons('size', item.id);
      refreshPreview();
    });
    sizeBox.appendChild(btn);
  }
  const panelBox = $('panels');
  const entries = [...CAST.map((c) => ({ key: c.key, label: c.label })), { key: 'car', label: 'THE RED CONVERTIBLE' }, { key: 'aerial', label: 'THE COAST FROM ABOVE' }];
  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'panel-row';
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'panel-pick';
    pick.textContent = entry.label;
    pick.addEventListener('click', () => {
      pickedPanel = entry.key;
      syncCropControls();
      for (const el of panelBox.querySelectorAll('.panel-pick')) el.classList.toggle('on', el === pick);
    });
    const load = document.createElement('label');
    load.className = 'file-btn';
    load.textContent = 'Use your photo';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        photos[entry.key] = img;
        state.crops[entry.key] = { zoom: 1, dx: 0, dy: 0 };
        pickedPanel = entry.key;
        syncCropControls();
        refreshPreview();
        showNotice(`${entry.label} now uses your photo. Nothing is uploaded — it stays in this browser.`);
      };
      img.onerror = () => showNotice('That file could not be read as a photo.');
      img.src = url;
    });
    load.appendChild(input);
    row.appendChild(pick);
    row.appendChild(load);
    panelBox.appendChild(row);
  }
}

function syncCropControls() {
  const crop = state.crops[pickedPanel];
  $('panel-name').textContent = pickedPanel.toUpperCase();
  $('zoom').value = String(crop.zoom);
  $('pan-x').value = String(crop.dx);
  $('pan-y').value = String(crop.dy);
  $('zoom-val').textContent = `${Math.round(crop.zoom * 100)}%`;
  $('pan-x-val').textContent = crop.dx.toFixed(2);
  $('pan-y-val').textContent = crop.dy.toFixed(2);
}

function wireInputs() {
  $('title').addEventListener('input', (ev) => {
    state.title = ev.target.value.trim() === '' ? 'MARLIN COAST' : ev.target.value.toUpperCase();
    refreshPreview();
  });
  $('script').addEventListener('input', (ev) => {
    state.script = ev.target.value;
    refreshPreview();
  });
  $('quote').addEventListener('input', (ev) => {
    state.quote = ev.target.value.toUpperCase();
    refreshPreview();
  });
  $('zoom').addEventListener('input', (ev) => {
    state.crops[pickedPanel].zoom = Number(ev.target.value);
    syncCropControls();
    refreshPreview();
  });
  $('pan-x').addEventListener('input', (ev) => {
    state.crops[pickedPanel].dx = Number(ev.target.value);
    syncCropControls();
    refreshPreview();
  });
  $('pan-y').addEventListener('input', (ev) => {
    state.crops[pickedPanel].dy = Number(ev.target.value);
    syncCropControls();
    refreshPreview();
  });
  $('reset-crop').addEventListener('click', () => {
    state.crops[pickedPanel] = { zoom: 1, dx: 0, dy: 0 };
    syncCropControls();
    refreshPreview();
  });
  $('shuffle').addEventListener('click', () => {
    const order = [...CAST];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const swapped = {};
    order.forEach((c, i) => { swapped[CAST[i].key] = photos[c.key]; });
    Object.assign(photos, swapped);
    refreshPreview();
  });
  $('export').addEventListener('click', () => {
    const off = document.createElement('canvas');
    const dims = drawCover(off, photos, state);
    off.toBlob((blob) => {
      if (!blob) { showNotice('Export failed: the browser could not make the PNG.'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marlin-coast-${state.layout}-${dims.w}x${dims.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showNotice(`Exported ${dims.w} × ${dims.h} PNG. Share it anywhere.`);
    }, 'image/png');
  });
}

// Scene driver for screenshots: picks a layout/grade/size from the URL
// and reports readiness once the first frame is painted.
export function applyShotScene(params) {
  if (params.has('layout')) state.layout = params.get('layout');
  if (params.has('grade')) state.grade = params.get('grade');
  if (params.has('size')) state.size = params.get('size');
  if (params.has('title')) state.title = params.get('title').toUpperCase();
  markButtons('layout', state.layout);
  markButtons('grade', state.grade);
  markButtons('size', state.size);
  refreshPreview();
}

export const ready = (async () => {
  buildControlRows();
  wireInputs();
  markButtons('layout', state.layout);
  markButtons('grade', state.grade);
  markButtons('size', state.size);
  syncCropControls();
  photos = await loadPhotos('');
  refreshPreview();
  return true;
})();

window.__marlin = { state, applyShotScene, ready, refreshPreview };
