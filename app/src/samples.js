// samples.js — the six built-in sample "photos": each scene painted once onto
// its own canvas, then treated by the editor exactly like a loaded photo.

import { SCENES, paintScene } from './scenes.js';

let cache = null;

export function loadSamples(size = 720) {
  if (cache) return cache;
  cache = SCENES.map((scene) => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    paintScene(canvas.getContext('2d'), size, size, scene);
    return { name: scene.name, id: scene.id, canvas };
  });
  return cache;
}

export function sampleById(id) {
  return loadSamples().find(s => s.id === id);
}

// The scene order the editor spreads by default: the portrait leads, because
// the hero panel of a Vice Coast cover is always the face.
export const SPREAD_ORDER = ['portrait', 'neon', 'aerial', 'dawn', 'skyline', 'road'];
