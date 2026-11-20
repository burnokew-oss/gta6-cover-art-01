// noise.js — deterministic seeded value noise for Vice Coast Cover Studio.
// Every texture in the studio (clouds, water, skin pores, cloth weave,
// asphalt, foliage) is modulated by this one field so a scene feels made
// of continuous material instead of flat fills.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 974634211);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

// Bilinear value noise at one octave, roughly in [-1, 1].
export function valueNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  const u = smooth(fx), v = smooth(fy);
  const top = a + (b - a) * u;
  const bot = c + (d - c) * u;
  return (top + (bot - top) * v) * 2 - 1;
}

// Fractal sum of octaves; amp falls, frequency rises per octave.
export function fbm(x, y, seed, octaves = 4, lacunarity = 2.03, gain = 0.52) {
  let sum = 0, amp = 0.55, norm = 0, fx = x, fy = y;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(fx, fy, seed + o * 131);
    norm += amp;
    fx *= lacunarity; fy *= lacunarity;
    amp *= gain;
  }
  return sum / norm;
}

// Speckle a region with tiny soft marks whose density follows the noise
// field — used for pore-scale skin grain, sand, crowd texture and sparkle.
// Marks are irregular short strokes, never a regular dot screen.
export function speckle(ctx, x, y, w, h, count, seed, colour, alpha, size = 1.4) {
  const rng = makeRng(seed);
  ctx.save();
  ctx.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    const px = x + rng() * w, py = y + rng() * h;
    const n = fbm(px * 0.02, py * 0.02, seed + 7, 3);
    if (rng() > 0.45 + n * 0.5) continue;
    ctx.globalAlpha = alpha * (0.4 + rng() * 0.6);
    const s = size * (0.6 + rng() * 0.9);
    ctx.beginPath();
    ctx.ellipse(px, py, s, s * (0.5 + rng() * 0.6), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Vertical gradient helper with many stops so bands never show.
export function vGrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  return g;
}

// Revision pass: a ridged variant for coastline erosion and cloud banks,
// where the absolute value folds the field into sharp crests.
export function ridged(x, y, seed, octaves = 3) {
  let sum = 0, amp = 0.6, norm = 0, fx = x, fy = y;
  for (let o = 0; o < octaves; o++) {
    sum += amp * (1 - Math.abs(valueNoise(fx, fy, seed + o * 57)));
    norm += amp; fx *= 2.1; fy *= 2.1; amp *= 0.5;
  }
  return sum / norm;
}

export function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
