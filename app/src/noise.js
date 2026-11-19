// noise.js — deterministic seeded noise and small numeric helpers for
// Vice Coast Cover Studio (round 8). Everything the scenes and the poster
// pipeline need to feel photographic rather than flat starts here: a
// mulberry32 random stream, a tileable value-noise field sampled at
// several octaves, and easing helpers shared by every painter.
//
// The same seed always produces the same field, so a cover renders
// identically on every machine and every export.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function clamp(value, low, high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// A value-noise field on an integer lattice with smooth interpolation.
// Each octave doubles the frequency and halves the amplitude; the micro
// octave is what survives a close crop as pore, grain and weave texture.
export class NoiseField {
  constructor(seed, cell = 64) {
    this.cell = cell;
    const rand = mulberry32(seed);
    this.grid = new Float32Array(cell * cell);
    for (let i = 0; i < this.grid.length; i += 1) this.grid[i] = rand();
  }

  lattice(ix, iy) {
    const c = this.cell;
    const x = ((ix % c) + c) % c;
    const y = ((iy % c) + c) % c;
    return this.grid[y * c + x];
  }

  sample(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = lerp(this.lattice(ix, iy), this.lattice(ix + 1, iy), sx);
    const bottom = lerp(this.lattice(ix, iy + 1), this.lattice(ix + 1, iy + 1), sx);
    return lerp(top, bottom, sy);
  }

  // Fractal sum: broad shape, mid detail, fine detail, micro texture.
  fbm(x, y, octaves = 4) {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o += 1) {
      sum += amp * this.sample(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }
}

// Ridged variant of the fractal sum: sharp crests instead of soft
// hills — used where a texture needs edges, like foliage clumps and
// broken water sparkle, rather than smooth shading.
export function ridgedFbm(field, x, y, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += amp * (1 - Math.abs(field.sample(x * freq, y * freq) * 2 - 1));
    norm += amp;
    amp *= 0.5;
    freq *= 2.11;
  }
  return sum / norm;
}

// Parse a colour into [r, g, b, a]: '#rrggbb', '#rgb', 'rgb(r, g, b)'
// and 'rgba(r, g, b, a)' are all accepted, alpha defaulting to 1. The
// stepped gradients below lean on transparent fade stops everywhere
// (cloud fades, sheen, contact shadows), so alpha must survive parsing
// — a fade stop read as opaque black would crush a whole panel.
export function hexRgb(colour) {
  if (colour.startsWith('#')) {
    let hex = colour.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const parts = colour.match(/[\d.]+/g).map(Number);
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

export function mixHex(colourA, colourB, t) {
  const a = hexRgb(colourA);
  const b = hexRgb(colourB);
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  const al = lerp(a[3], b[3], t);
  if (al < 0.999) return `rgba(${r}, ${g}, ${bl}, ${al.toFixed(3)})`;
  return `rgb(${r}, ${g}, ${bl})`;
}

// Build a canvas gradient with many evenly stepped stops between the
// given colours, so large areas shade in small tonal steps instead of
// a few broad bands.
export function steppedGradient(ctx, x0, y0, x1, y1, colours, steps = 24) {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const scaled = t * (colours.length - 1);
    const idx = Math.min(colours.length - 2, Math.floor(scaled));
    grad.addColorStop(t, mixHex(colours[idx], colours[idx + 1], scaled - idx));
  }
  return grad;
}

export function steppedRadial(ctx, x, y, r0, x2, y2, r1, colours, steps = 20) {
  const grad = ctx.createRadialGradient(x, y, r0, x2, y2, r1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const scaled = t * (colours.length - 1);
    const idx = Math.min(colours.length - 2, Math.floor(scaled));
    grad.addColorStop(t, mixHex(colours[idx], colours[idx + 1], scaled - idx));
  }
  return grad;
}
