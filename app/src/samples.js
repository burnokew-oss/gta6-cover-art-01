// samples.js — the studio's built-in sample scenes and cast, painted by
// scenes.js. "Load all samples" deals every one of these across the
// panels so the demo cover mixes the whole world in one click.

import { CHARACTERS, SCENES } from './scenes.js';

function prettyTag(tag) {
  const words = tag.replace(/^THE /, '').toLowerCase().split(' ');
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
export const SAMPLES = [
  ...CHARACTERS.map((c) => ({ id: c.id, label: prettyTag(c.tag) + ' — portrait', kind: 'char' })),
  ...Object.entries(SCENES).map(([id, s]) => ({ id, label: s.name, kind: 'scene' })),
];

export function defaultSlots(layout) {
  return layout.panels.map((p) => ({ kind: 'scene', id: p.content, zoom: 1, dx: 0, dy: 0, flip: false }));
}
