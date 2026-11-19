// noise.js — deterministic seeded value noise and small drawing helpers.
// Everything in Vice Coast Cover Studio is procedural: no image assets are
// loaded, so the same seed always paints the same scene, on any machine.

export function mulberry(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixHex(h1, h2, t) {
  const a = hexRgb(h1), b = hexRgb(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
export function rgba(hex, alpha) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// A tileable-ish value-noise field: random grid values, smooth interpolation,
// several octaves summed. Built once per (seed, size) and sampled by scenes to
// modulate clouds, water, foliage, asphalt, skin and cloth.
export class NoiseField {
  constructor(seed = 7, grid = 64) {
    const rand = mulberry(seed);
    this.grid = grid;
    this.values = new Float32Array(grid * grid);
    for (let i = 0; i < this.values.length; i++) this.values[i] = rand();
  }
  at(x, y) {
    const g = this.grid;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const w = (i, j) => this.values[(((j % g) + g) % g) * g + (((i % g) + g) % g)];
    return lerp(lerp(w(xi, yi), w(xi + 1, yi), sx), lerp(w(xi, yi + 1), w(xi + 1, yi + 1), sx), sy);
  }
  fbm(x, y, octaves = 4) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.at(x * freq, y * freq);
      norm += amp; amp *= 0.5; freq *= 2.03;
    }
    return sum / norm;
  }
}

export const sharedNoise = new NoiseField(20261120, 64);

// Multi-stop vertical gradient helper — the foundation of every sky and sea.
export function vGrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  return g;
}
export function hGrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  return g;
}

// A soft radial blob, used for glow, bokeh, cheek light and pooled shadow.
export function blob(ctx, cx, cy, r, color, alpha) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

// A short wavy stroke, for heat shimmer, water glints and hair flyaways.
export function wavyStroke(ctx, x0, y, len, amp, color, alpha, width = 1) {
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let x = 0; x <= len; x += 8) {
    const yy = y + Math.sin(x * 0.11 + y) * amp;
    x === 0 ? ctx.moveTo(x0, yy) : ctx.lineTo(x0 + x, yy);
  }
  ctx.stroke();
}

// Speckle: thousands of tiny tonal dots — pores, sand, crowd, sparkle, grain.
export function speckle(ctx, rand, x, y, w, h, count, colors, maxR = 1.6, alpha = 0.5) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rgba(colors[(rand() * colors.length) | 0], alpha * (0.35 + rand() * 0.65));
    const r = 0.4 + rand() * maxR;
    ctx.beginPath();
    ctx.arc(x + rand() * w, y + rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
