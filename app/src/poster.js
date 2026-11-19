// poster.js — the print pipeline of Vice Coast Cover Studio.
// Each panel's picture is pushed through three print steps: its colours are
// posterized into a few flat levels, its brightness is mapped through the
// chosen grade's colour ramp, and a halftone dot screen is laid over it
// whose dots grow in the shadows. Because the sample scenes and photos carry
// real detail, the printed result keeps that detail — flat input would not.

// Six grades, each a brightness ramp of [red, green, blue] stops plus the
// halftone cell size the grade prints with. Comic Ink is a bold duotone.
export const GRADES = {
  sunset: {
    name: 'Sunset',
    css: 'linear-gradient(90deg,#1b1035,#7a1e5e,#e84e6d,#ff8c42,#ffd98a)',
    halftoneCell: 5,
    ramp: [[16, 10, 44], [74, 22, 84], [150, 34, 92], [214, 66, 96], [244, 110, 84], [255, 166, 88], [255, 214, 138]],
  },
  neon: {
    name: 'Neon',
    css: 'linear-gradient(90deg,#0b0620,#3b0f63,#a4138f,#ff2e88,#ff7ab8,#7df9ff)',
    halftoneCell: 5,
    ramp: [[10, 6, 32], [46, 14, 92], [110, 20, 130], [196, 24, 140], [255, 46, 136], [255, 122, 184], [160, 250, 255]],
  },
  golden: {
    name: 'Golden',
    css: 'linear-gradient(90deg,#241126,#6e2a1e,#b3541e,#e88a2a,#ffc44d,#ffe9a8)',
    halftoneCell: 5,
    ramp: [[30, 14, 30], [92, 36, 30], [158, 74, 28], [214, 122, 36], [244, 168, 62], [255, 205, 92], [255, 238, 178]],
  },
  miami: {
    name: 'Miami',
    css: 'linear-gradient(90deg,#07273d,#0e5e6e,#17a398,#f06ba8,#ff9ec4,#ffe3ee)',
    halftoneCell: 5,
    ramp: [[8, 34, 56], [12, 84, 104], [20, 150, 148], [64, 196, 178], [238, 110, 168], [255, 158, 196], [255, 232, 240]],
  },
  viceblue: {
    name: 'Vice Blue',
    css: 'linear-gradient(90deg,#060a24,#12275e,#1d4e9e,#2f8fd0,#7fd4f2,#eafcff)',
    halftoneCell: 5,
    ramp: [[6, 10, 36], [16, 34, 88], [28, 74, 150], [46, 130, 200], [110, 190, 235], [180, 230, 250], [240, 253, 255]],
  },
  comic: {
    name: 'Comic Ink',
    css: 'linear-gradient(90deg,#14100e 55%,#f24822 78%,#ffd23f)',
    halftoneCell: 6,
    ramp: [[16, 12, 12], [30, 20, 22], [120, 26, 20], [214, 62, 28], [242, 72, 34], [255, 178, 44], [255, 214, 74]],
  },
};

const lutCache = new Map();

// Expand a grade's stops into a 256-entry lookup table, cached per grade.
export function rampLut(gradeId) {
  if (lutCache.has(gradeId)) return lutCache.get(gradeId);
  const stops = (GRADES[gradeId] || GRADES.sunset).ramp;
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(stops.length - 1, lo + 1);
    const f = t - lo;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(stops[lo][c] + (stops[hi][c] - stops[lo][c]) * f);
  }
  lutCache.set(gradeId, lut);
  return lut;
}

// Draw a source (image or canvas) into a target box with cover-fit maths:
// the picture fills the box, zoom scales it, ox/oy pan it inside the box and
// flip mirrors it. Portrait and landscape sources both frame sensibly
// because the fit always covers the shorter fit dimension first.
export function drawCoverFit(ctx, source, x, y, w, h, view) {
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  if (!sw || !sh) return;
  const zoom = Math.max(1, view.zoom || 1);
  const scale = Math.max(w / sw, h / sh) * zoom;
  const dw = sw * scale;
  const dh = sh * scale;
  const roomX = Math.max(0, dw - w);
  const roomY = Math.max(0, dh - h);
  // Centred by default; ox/oy slide the picture inside its overflow room.
  const px = x + (w - dw) / 2 - (view.ox || 0) * roomX * 0.5;
  const py = y + (h - dh) / 2 - (view.oy || 0) * roomY * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (view.flip) {
    ctx.translate(px + dw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, py, dw, dh);
  } else {
    ctx.drawImage(source, px, py, dw, dh);
  }
  ctx.restore();
}

// Run one panel-sized canvas through the print pipeline in place.
// ink is 0..1: higher ink posterizes harder, leans further into the ramp
// and prints a stronger halftone screen.
export function applyPosterInk(canvas, gradeId, ink) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return canvas;
  const grade = GRADES[gradeId] || GRADES.sunset;
  const lut = rampLut(gradeId);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const levels = Math.max(4, Math.round(10 - ink * 5)); // posterize steps
  const step = 255 / (levels - 1);
  const rampMix = 0.16 + ink * 0.5; // lean into the ramp, keep the photo's hues
  const cell = grade.halftoneCell;
  const dotGain = 0.16 + ink * 0.3; // halftone strength
  for (let y = 0; y < h; y++) {
    const cy = (y % cell) - cell / 2 + 0.5;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      r = Math.round(r / step) * step; // posterize each channel flat
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
      const lum = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
      const lr = lut[lum * 3], lg = lut[lum * 3 + 1], lb = lut[lum * 3 + 2];
      r += (lr - r) * rampMix;
      g += (lg - g) * rampMix;
      b += (lb - b) * rampMix;
      // Halftone: inside a cell, pixels farther than the dot radius (which
      // grows as the pixel darkens) are inked down toward the ramp shadow.
      const cx = (x % cell) - cell / 2 + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const radius = (1 - lum / 255) * cell * 0.72;
      if (dist > radius) {
        const f = 1 - dotGain * Math.min(1, (dist - radius) / (cell * 0.5));
        r *= f; g *= f; b *= f;
      } else {
        const f = 1 + dotGain * 0.35; // dot centres catch a little light
        r = Math.min(255, r * f); g = Math.min(255, g * f); b = Math.min(255, b * f);
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// A reusable fine-noise canvas for the cover-wide grain overlay.
let grainTile = null;
export function makeGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 140; c.height = 140;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(140, 140);
  let a = 987654321;
  for (let i = 0; i < img.data.length; i += 4) {
    a = (Math.imul(a, 1103515245) + 12345) | 0;
    const v = 108 + ((a >>> 9) % 120);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}
