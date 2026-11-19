// samples.js — renders the studio's own procedural scenes into
// offscreen canvases that behave exactly like loaded photos inside the
// editor: they can be spread across panels, cropped, zoomed and graded.
// Rendering happens once per scene at a fixed working size, so the
// editor stays fast and every export is deterministic.

import { SCENE_ORDER, SCENE_PAINTERS } from './scenes.js';

export const SAMPLE_WIDTH = 760;
export const SAMPLE_HEIGHT = 570;

const cache = new Map();

export function renderSampleScene(id) {
  if (cache.has(id)) return cache.get(id);
  const painter = SCENE_PAINTERS[id];
  if (!painter) return null;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const ctx = canvas.getContext('2d');
  painter.paint(ctx, SAMPLE_WIDTH, SAMPLE_HEIGHT, 1234 + id.length * 977 + id.charCodeAt(0) * 131);
  canvas.dataset.sceneName = painter.name;
  cache.set(id, canvas);
  return canvas;
}

export function loadAllSampleScenes() {
  return SCENE_ORDER.map((id) => {
    const canvas = renderSampleScene(id);
    return { id: `sample-${id}`, name: SCENE_PAINTERS[id].name, canvas, sceneId: id };
  });
}

export function sampleSceneName(id) {
  return SCENE_PAINTERS[id] ? SCENE_PAINTERS[id].name : id;
}

// Warm the cache for every scene; the editor calls this once samples
// are first requested so spreading them across panels never stalls.
export function warmSampleCache() {
  for (const id of SCENE_ORDER) renderSampleScene(id);
  return cache.size;
}
