// Marlin Coast Cover Studio — screenshot scenes (round 12).
// Reads ?shot=cover|editor plus layout/grade/size/title from the URL and
// paints exactly what the screenshots must show, then flags readiness
// for the headless screenshot driver. Never edits or composites anything:
// a cover shot is the app's own drawing at the viewport's size.

import { drawCover } from './cover.js';

const params = new URLSearchParams(location.search);
const kind = params.get('shot') ?? 'editor';

async function waitForMarlin() {
  for (let i = 0; i < 200; i++) {
    if (window.__marlin) return window.__marlin;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('editor did not start');
}

async function coverScene() {
  const marlin = await waitForMarlin();
  await marlin.ready;
  document.body.classList.add('shot-cover');
  marlin.applyShotScene(params);
  // The cover fills the whole viewport for this shot.
  const canvas = document.getElementById('preview');
  const photos = await import('./cover.js').then((m) => m.loadPhotos(''));
  const state = { ...marlin.state, size: 'square' };
  const dims = { w: innerWidth, h: innerHeight };
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d');
  // Draw at the viewport's aspect through a scratch canvas sized to the
  // matching export size, then scale it onto the shot canvas.
  const scratch = document.createElement('canvas');
  const ratio = dims.w / dims.h;
  const pick = ratio > 1.4 ? 'wide' : ratio < 0.85 ? 'portrait' : 'square';
  drawCover(scratch, photos, { ...state, size: pick });
  ctx.drawImage(scratch, 0, 0, dims.w, dims.h);
  window.__shotReady = true;
}

async function editorScene() {
  const marlin = await waitForMarlin();
  await marlin.ready;
  marlin.applyShotScene(params);
  document.body.classList.add('shot-editor');
  await new Promise((r) => setTimeout(r, 120));
  window.__shotReady = true;
}

if (kind === 'cover') {
  coverScene().catch((err) => { window.__shotError = String(err); });
} else {
  editorScene().catch((err) => { window.__shotError = String(err); });
}
