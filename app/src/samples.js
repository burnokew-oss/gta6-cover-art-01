// Vice Coast sample scenes — continuous-tone procedural photography.
// Every scene is painted at panel resolution on its own canvas: layered
// gradients first, seeded multi-octave noise for surface life, soft shadows,
// atmospheric depth, depth of field, bokeh and bloom. No flat fills for any
// large area; the poster finish lives in poster.js and stays light so this
// tonal richness survives into print.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(t) { return t * t * (3 - 2 * t); }

// Deterministic value-noise field: smoothed random grids at several octaves.
export class NoiseField {
  constructor(seed, cells = 64) {
    this.cells = cells;
    const rand = mulberry32(seed);
    this.grid = new Float32Array(cells * cells);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = rand();
  }
  at(x, y) {
    const c = this.cells;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % c) + c) % c, y0 = ((yi % c) + c) % c;
    const x1 = (x0 + 1) % c, y1 = (y0 + 1) % c;
    const g = this.grid;
    const top = g[y0 * c + x0] + (g[y0 * c + x1] - g[y0 * c + x0]) * smooth(xf);
    const bot = g[y1 * c + x0] + (g[y1 * c + x1] - g[y1 * c + x0]) * smooth(xf);
    return top + (bot - top) * smooth(yf);
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

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h));
  return c;
}

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixHex(a, b, t) {
  const ca = hexRgb(a), cb = hexRgb(b);
  return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)},${Math.round(ca[1] + (cb[1] - ca[1]) * t)},${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`;
}
export function rgba(hex, alpha) {
  const c = hexRgb(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

export function vGrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  return g;
}
export function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Modulate a region with the noise field so a surface stops reading flat.
export function texturePass(ctx, w, h, noise, scale, strength, seed = 7) {
  const tw = Math.max(8, Math.round(w / 3)), th = Math.max(8, Math.round(h / 3));
  const layer = makeCanvas(tw, th);
  const lctx = layer.getContext('2d');
  const img = lctx.createImageData(tw, th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const n = noise.fbm((x / tw) * scale + seed, (y / th) * scale + seed * 1.7, 4);
    const v = 118 + Math.round((n - 0.5) * 2 * strength * 127);
    const i = (y * tw + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  lctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layer, 0, 0, w, h);
  ctx.restore();
}

export function softShadow(ctx, cx, cy, rx, ry, alpha = 0.35) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(10,6,18,${alpha})`);
  g.addColorStop(0.7, `rgba(10,6,18,${alpha * 0.45})`);
  g.addColorStop(1, 'rgba(10,6,18,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function bokehField(ctx, w, h, rand, count, palette, yMin = 0, yMax = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = (yMin + rand() * (yMax - yMin)) * h;
    const r = 4 + rand() * (w * 0.045);
    const col = palette[Math.floor(rand() * palette.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, 0.05));
    g.addColorStop(0.78, rgba(col, 0.10));
    g.addColorStop(0.92, rgba(col, 0.34));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function grainAndVignette(ctx, w, h, seed, grainAmt = 9, vig = 0.32) {
  const rand = mulberry32(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 2 * grainAmt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(8,4,14,0)');
  g.addColorStop(1, `rgba(8,4,14,${vig})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function palmFronds(ctx, x, y, len, rand, tone, spread = 7) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let f = 0; f < spread; f++) {
    const ang = -Math.PI * (0.08 + 0.84 * (f / (spread - 1))) + (rand() - 0.5) * 0.12;
    const droop = len * (0.55 + rand() * 0.3);
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len * 0.42 + droop * 0.35;
    const leaflets = 15;
    for (let s = 0; s <= leaflets; s++) {
      const t = s / leaflets;
      const px = x + (ex - x) * t, py = y + (ey - y) * t + Math.sin(t * Math.PI) * len * 0.10;
      const ll = len * 0.16 * (1 - t * 0.55);
      ctx.strokeStyle = rgba(tone, 0.5 + 0.4 * (1 - t));
      ctx.lineWidth = Math.max(1, len * 0.012 * (1 - t * 0.6));
      ctx.beginPath(); ctx.moveTo(px, py);
      ctx.lineTo(px - ll * 0.35, py + ll * 0.8);
      ctx.moveTo(px, py); ctx.lineTo(px + ll * 0.35, py + ll * 0.8);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(tone, 0.85);
    ctx.lineWidth = Math.max(1.2, len * 0.02);
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (ex - x) * 0.5, y + (ey - y) * 0.4 - len * 0.08, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function shadedFigure(ctx, x, groundY, hgt, rand, opts) {
  const { skinLit, skinShade, cloth, clothDark, rim } = opts;
  const wBody = hgt * 0.30;
  ctx.save();
  // long soft shadow stretching away from the low sun
  ctx.save();
  ctx.translate(x, groundY); ctx.rotate(0.10); ctx.scale(1, 0.16);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, hgt * 0.85);
  sg.addColorStop(0, 'rgba(30,10,30,0.34)'); sg.addColorStop(1, 'rgba(30,10,30,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(hgt * 0.2, 0, hgt * 0.85, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const headR = hgt * 0.085;
  const headY = groundY - hgt + headR;
  // legs with a walking stride
  ctx.lineCap = 'round';
  ctx.strokeStyle = clothDark; ctx.lineWidth = hgt * 0.055;
  ctx.beginPath(); ctx.moveTo(x, groundY - hgt * 0.52); ctx.lineTo(x - hgt * 0.10, groundY - hgt * 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, groundY - hgt * 0.52); ctx.lineTo(x + hgt * 0.13, groundY - hgt * 0.10); ctx.stroke();
  // torso: stacked gradients, lit on the sun side
  const tg = ctx.createLinearGradient(x - wBody / 2, 0, x + wBody / 2, 0);
  tg.addColorStop(0, clothDark); tg.addColorStop(0.62, cloth); tg.addColorStop(1, rim);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(x - wBody * 0.52, groundY - hgt * 0.50);
  ctx.quadraticCurveTo(x - wBody * 0.60, groundY - hgt * 0.86, x - wBody * 0.30, groundY - hgt * 0.88);
  ctx.lineTo(x + wBody * 0.34, groundY - hgt * 0.88);
  ctx.quadraticCurveTo(x + wBody * 0.58, groundY - hgt * 0.84, x + wBody * 0.50, groundY - hgt * 0.50);
  ctx.closePath(); ctx.fill();
  // arms swinging
  ctx.strokeStyle = skinShade; ctx.lineWidth = hgt * 0.042;
  ctx.beginPath(); ctx.moveTo(x - wBody * 0.4, groundY - hgt * 0.84); ctx.lineTo(x - hgt * 0.16, groundY - hgt * 0.55); ctx.stroke();
  ctx.strokeStyle = skinLit;
  ctx.beginPath(); ctx.moveTo(x + wBody * 0.42, groundY - hgt * 0.84); ctx.lineTo(x + hgt * 0.15, groundY - hgt * 0.58); ctx.stroke();
  // head: radial lit dome with a shaded crescent
  const hg = ctx.createRadialGradient(x - headR * 0.4, headY - headR * 0.4, headR * 0.2, x, headY, headR * 1.25);
  hg.addColorStop(0, skinLit); hg.addColorStop(0.62, skinShade); hg.addColorStop(1, clothDark);
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(x, headY, headR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(rim === '#ffd9a0' ? '#ffd9a0' : rim, 0.9);
  ctx.lineWidth = Math.max(1.4, hgt * 0.008);
  ctx.beginPath(); ctx.arc(x, headY, headR * 0.96, -0.9, 0.9); ctx.stroke();
  ctx.restore();
}

// A properly shaded car: gradient body, clearcoat band, reflected glass,
// dark arches, radial tyres, spoked rims, light blooms, wet reflection.
export function drawShadedCar(ctx, x, y, wdt, opts = {}) {
  const body = opts.body || '#c2274b';
  const bodyDark = opts.bodyDark || '#5e0f26';
  const hgt = wdt * 0.30;
  const top = y - hgt;
  ctx.save();
  softShadow(ctx, x + wdt / 2, y + hgt * 0.06, wdt * 0.52, hgt * 0.16, 0.5);
  // cabin glass with reflected sky + diagonal glare
  const glass = ctx.createLinearGradient(x, top, x, top + hgt * 0.5);
  glass.addColorStop(0, '#bfe6f2'); glass.addColorStop(0.5, '#3d7ea6'); glass.addColorStop(1, '#17384e');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(x + wdt * 0.24, top + hgt * 0.42);
  ctx.quadraticCurveTo(x + wdt * 0.32, top + hgt * 0.04, x + wdt * 0.47, top + hgt * 0.02);
  ctx.quadraticCurveTo(x + wdt * 0.66, top, x + wdt * 0.76, top + hgt * 0.40);
  ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x + wdt * 0.40, top); ctx.lineTo(x + wdt * 0.52, top);
  ctx.lineTo(x + wdt * 0.36, top + hgt * 0.44); ctx.lineTo(x + wdt * 0.28, top + hgt * 0.44);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // body shell with vertical shading: bright shoulder, dark rocker
  const bg = ctx.createLinearGradient(0, top + hgt * 0.30, 0, y);
  bg.addColorStop(0, body); bg.addColorStop(0.34, body);
  bg.addColorStop(0.52, mixHex(body, '#ffffff', 0.28));
  bg.addColorStop(0.78, body); bg.addColorStop(1, bodyDark);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x + wdt * 0.02, y - hgt * 0.10);
  ctx.quadraticCurveTo(x, top + hgt * 0.52, x + wdt * 0.10, top + hgt * 0.44);
  ctx.lineTo(x + wdt * 0.22, top + hgt * 0.40);
  ctx.quadraticCurveTo(x + wdt * 0.30, top + hgt * 0.06, x + wdt * 0.48, top + hgt * 0.03);
  ctx.quadraticCurveTo(x + wdt * 0.68, top, x + wdt * 0.78, top + hgt * 0.38);
  ctx.lineTo(x + wdt * 0.94, top + hgt * 0.46);
  ctx.quadraticCurveTo(x + wdt * 1.0, top + hgt * 0.55, x + wdt * 0.985, y - hgt * 0.12);
  ctx.quadraticCurveTo(x + wdt * 0.5, y + hgt * 0.03, x + wdt * 0.02, y - hgt * 0.10);
  ctx.closePath(); ctx.fill();
  // clearcoat highlight band along the flank
  const band = ctx.createLinearGradient(x, 0, x + wdt, 0);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.45, 'rgba(255,255,255,0.30)');
  band.addColorStop(0.7, 'rgba(255,255,255,0.05)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = band;
  ctx.fillRect(x + wdt * 0.04, top + hgt * 0.50, wdt * 0.92, hgt * 0.10);
  // door cut line + handle
  ctx.strokeStyle = 'rgba(20,4,12,0.45)'; ctx.lineWidth = Math.max(1, wdt * 0.004);
  ctx.beginPath(); ctx.moveTo(x + wdt * 0.52, top + hgt * 0.42); ctx.lineTo(x + wdt * 0.52, y - hgt * 0.10); ctx.stroke();
  ctx.fillStyle = 'rgba(255,235,210,0.75)';
  ctx.fillRect(x + wdt * 0.44, top + hgt * 0.50, wdt * 0.055, hgt * 0.045);
  // wheel arches, tyres, rims
  for (const wx of [x + wdt * 0.185, x + wdt * 0.815]) {
    const wr = wdt * 0.105;
    ctx.fillStyle = '#0a070c';
    ctx.beginPath(); ctx.arc(wx, y - hgt * 0.06, wr * 1.12, Math.PI, 0); ctx.fill();
    const tyre = ctx.createRadialGradient(wx - wr * 0.3, y - hgt * 0.06 - wr * 0.3, wr * 0.15, wx, y - hgt * 0.06, wr);
    tyre.addColorStop(0, '#3c3a42'); tyre.addColorStop(0.75, '#17151b'); tyre.addColorStop(1, '#060508');
    ctx.fillStyle = tyre;
    ctx.beginPath(); ctx.arc(wx, y - hgt * 0.06, wr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8ccd4';
    ctx.beginPath(); ctx.arc(wx, y - hgt * 0.06, wr * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d838e';
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2 + 0.4;
      ctx.save(); ctx.translate(wx, y - hgt * 0.06); ctx.rotate(a);
      ctx.fillRect(-wr * 0.07, -wr * 0.5, wr * 0.14, wr * 0.5); ctx.restore();
    }
    ctx.fillStyle = '#f2f4f8';
    ctx.beginPath(); ctx.arc(wx, y - hgt * 0.06, wr * 0.15, 0, Math.PI * 2); ctx.fill();
  }
  // lights with bloom
  glow(ctx, x + wdt * 0.045, top + hgt * 0.55, wdt * 0.07, '#ffe9b0', 0.85);
  ctx.fillStyle = '#fff3c4'; ctx.fillRect(x + wdt * 0.015, top + hgt * 0.50, wdt * 0.035, hgt * 0.09);
  glow(ctx, x + wdt * 0.965, top + hgt * 0.55, wdt * 0.06, '#ff4d6d', 0.8);
  ctx.fillStyle = '#ff5d78'; ctx.fillRect(x + wdt * 0.955, top + hgt * 0.50, wdt * 0.032, hgt * 0.09);
  ctx.restore();
  return { top, hgt };
}

export function drawWetReflection(ctx, drawFn, x, y, wdt, hgt, smear = 0.9) {
  const tmp = makeCanvas(Math.max(2, wdt), Math.max(2, hgt));
  const tctx = tmp.getContext('2d');
  drawFn(tctx, tmp.width, tmp.height);
  ctx.save();
  ctx.translate(x, y + hgt);
  ctx.scale(1, -smear);
  ctx.globalAlpha = 0.42;
  ctx.drawImage(tmp, 0, 0, wdt, hgt);
  ctx.restore();
  // ripple: thin horizontal slices nudged sideways break the mirror up
  const rand = mulberry32(99);
  ctx.save();
  ctx.globalAlpha = 0.20;
  for (let sy = 0; sy < hgt * smear; sy += 4) {
    const shift = (rand() - 0.5) * wdt * 0.02;
    ctx.drawImage(tmp, 0, hgt - sy / smear - 4, wdt, 4, x + shift, y + hgt + sy, wdt, 4);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scenes
function sceneDawnBeach(ctx, w, h, noise, rand) {
  vGrad(ctx, 0, 0, w, h, [[0, '#8fb7d9'], [0.30, '#f6c99b'], [0.46, '#ffd9a8'], [0.55, '#f2a56b'], [1, '#e88a5a']]);
  glow(ctx, w * 0.68, h * 0.47, w * 0.42, '#ffdf9e', 0.8);
  ctx.fillStyle = '#fff3cf';
  ctx.beginPath(); ctx.arc(w * 0.68, h * 0.47, w * 0.045, 0, Math.PI * 2); ctx.fill();
  // sea band with sparkle noise
  vGrad(ctx, 0, h * 0.50, w, h * 0.30, [[0, '#f7b978'], [0.25, '#5fa8a0'], [1, '#2c6e7e']]);
  ctx.save();
  for (let i = 0; i < 700; i++) {
    const x = rand() * w, y = h * 0.51 + Math.pow(rand(), 1.6) * h * 0.27;
    const n = noise.fbm(x * 0.02, y * 0.05, 3);
    ctx.fillStyle = `rgba(255,${225 + Math.floor(n * 30)},170,${0.10 + n * 0.4})`;
    ctx.fillRect(x, y, 2 + n * 9, 1.4);
  }
  ctx.restore();
  // sun path glitter column
  const sp = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.8);
  sp.addColorStop(0, 'rgba(255,220,150,0.5)'); sp.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.moveTo(w * 0.60, h * 0.5); ctx.lineTo(w * 0.76, h * 0.5);
  ctx.lineTo(w * 0.86, h * 0.8); ctx.lineTo(w * 0.52, h * 0.8); ctx.closePath(); ctx.fill();
  // wet sand foreground
  vGrad(ctx, 0, h * 0.78, w, h * 0.22, [[0, '#e9b183'], [0.4, '#d99a6d'], [1, '#b97a52']]);
  texturePass(ctx, w, h, noise, 9, 0.5, 3);
  // distant headland, paler and softer (atmospheric perspective)
  ctx.fillStyle = 'rgba(146,110,140,0.55)';
  ctx.beginPath(); ctx.moveTo(0, h * 0.50);
  ctx.quadraticCurveTo(w * 0.2, h * 0.40, w * 0.42, h * 0.50); ctx.closePath(); ctx.fill();
  // palm silhouettes with leaflet fronds
  ctx.strokeStyle = '#4a2438'; ctx.lineWidth = w * 0.012; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(w * 0.10, h * 0.86);
  ctx.quadraticCurveTo(w * 0.13, h * 0.6, w * 0.20, h * 0.42); ctx.stroke();
  palmFronds(ctx, w * 0.20, h * 0.42, w * 0.17, rand, '#3c1e30', 8);
  ctx.beginPath(); ctx.moveTo(w * 0.94, h * 0.88);
  ctx.quadraticCurveTo(w * 0.90, h * 0.66, w * 0.84, h * 0.5); ctx.stroke();
  palmFronds(ctx, w * 0.84, h * 0.5, w * 0.13, rand, '#46222f', 7);
  // two shaded walkers on the wet sand
  shadedFigure(ctx, w * 0.44, h * 0.90, h * 0.34, rand, { skinLit: '#f2b98a', skinShade: '#b06a44', cloth: '#2e7f86', clothDark: '#173f4d', rim: '#ffd9a0' });
  shadedFigure(ctx, w * 0.56, h * 0.925, h * 0.30, rand, { skinLit: '#e8a878', skinShade: '#9c5a38', cloth: '#e8e2d2', clothDark: '#8a4a52', rim: '#ffd9a0' });
}

function scenePortrait(ctx, w, h, noise, rand) {
  // hazy magenta sunset sky, brighter behind the head
  vGrad(ctx, 0, 0, w, h, [[0, '#7a2d63'], [0.35, '#c94f7c'], [0.62, '#f2785c'], [0.85, '#f7a95c'], [1, '#8a3b5e']]);
  glow(ctx, w * 0.52, h * 0.34, w * 0.62, '#ffb37a', 0.75);
  glow(ctx, w * 0.52, h * 0.30, w * 0.30, '#ffe3ae', 0.8);
  // far skyline, hazy and pale
  ctx.fillStyle = 'rgba(90,40,80,0.5)';
  let bx = 0;
  while (bx < w) { const bw = w * (0.05 + rand() * 0.07), bh = h * (0.10 + rand() * 0.16); ctx.fillRect(bx, h * 0.52 - bh, bw, bh); bx += bw + w * 0.012; }
  ctx.fillStyle = 'rgba(255,214,150,0.75)';
  for (let i = 0; i < 90; i++) ctx.fillRect(rand() * w, h * 0.38 + rand() * h * 0.13, 2, 2.6);
  // blurred sea strip at the horizon
  vGrad(ctx, 0, h * 0.52, w, h * 0.10, [[0, '#e88a6a'], [1, '#7a3a63']]);
  bokehField(ctx, w, h, rand, 26, ['#ffd9a0', '#ff8fb0', '#fff1cf', '#c9a0ff'], 0.04, 0.6);
  // ---- the hero: one large head-and-shoulders figure
  const cx = w * 0.5, faceW = w * 0.46, faceH = h * 0.44;
  const faceTop = h * 0.16, faceCy = faceTop + faceH / 2;
  // shoulders / shirt mass with shaded folds
  const shG = ctx.createLinearGradient(cx - w * 0.42, 0, cx + w * 0.42, 0);
  shG.addColorStop(0, '#123a4a'); shG.addColorStop(0.45, '#1f6e7e'); shG.addColorStop(0.78, '#e86a8a'); shG.addColorStop(1, '#f7a95c');
  ctx.fillStyle = shG;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.48, h);
  ctx.quadraticCurveTo(cx - w * 0.44, faceCy + faceH * 0.52, cx - w * 0.20, faceCy + faceH * 0.44);
  ctx.lineTo(cx + w * 0.20, faceCy + faceH * 0.44);
  ctx.quadraticCurveTo(cx + w * 0.44, faceCy + faceH * 0.52, cx + w * 0.48, h);
  ctx.closePath(); ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#0b2531'; ctx.lineWidth = w * 0.008;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - w * 0.3 + i * w * 0.05, faceCy + faceH * 0.55); ctx.quadraticCurveTo(cx - w * 0.2 + i * w * 0.05, h * 0.9, cx - w * 0.28 + i * w * 0.055, h); ctx.stroke(); }
  ctx.restore();
  // neck with soft jaw shadow
  const neckG = ctx.createLinearGradient(cx, faceCy, cx, faceCy + faceH * 0.6);
  neckG.addColorStop(0, '#8a4a30'); neckG.addColorStop(0.5, '#c47a4e'); neckG.addColorStop(1, '#e09a68');
  ctx.fillStyle = neckG; ctx.fillRect(cx - faceW * 0.16, faceCy + faceH * 0.28, faceW * 0.32, faceH * 0.30);
  // face: stacked radial gradients — warm lit zones, cool shadow zones
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - faceW / 2, faceCy - faceH * 0.18);
  ctx.bezierCurveTo(cx - faceW / 2, faceCy - faceH * 0.52, cx - faceW * 0.28, faceTop, cx, faceTop);
  ctx.bezierCurveTo(cx + faceW * 0.28, faceTop, cx + faceW / 2, faceCy - faceH * 0.52, cx + faceW / 2, faceCy - faceH * 0.18);
  ctx.bezierCurveTo(cx + faceW / 2, faceCy + faceH * 0.30, cx + faceW * 0.30, faceCy + faceH * 0.52, cx, faceCy + faceH * 0.52);
  ctx.bezierCurveTo(cx - faceW * 0.30, faceCy + faceH * 0.52, cx - faceW / 2, faceCy + faceH * 0.30, cx - faceW / 2, faceCy - faceH * 0.18);
  ctx.closePath(); ctx.clip();
  const base = ctx.createLinearGradient(cx - faceW / 2, 0, cx + faceW / 2, 0);
  base.addColorStop(0, '#a35a36'); base.addColorStop(0.42, '#d98d5c'); base.addColorStop(0.72, '#f0aa74'); base.addColorStop(1, '#c47a4e');
  ctx.fillStyle = base; ctx.fillRect(cx - faceW / 2, faceTop - 4, faceW, faceH + 8);
  const zones = [
    [cx - faceW * 0.22, faceCy + faceH * 0.05, faceW * 0.30, '#ffc08a', 0.55],
    [cx + faceW * 0.24, faceCy - faceH * 0.10, faceW * 0.26, '#ffb37e', 0.5],
    [cx + faceW * 0.02, faceCy - faceH * 0.34, faceW * 0.34, '#ffd2a0', 0.45],
    [cx - faceW * 0.40, faceCy + faceH * 0.18, faceW * 0.30, '#5e3a5e', 0.42],
    [cx + faceW * 0.38, faceCy + faceH * 0.30, faceW * 0.28, '#7a4038', 0.4],
    [cx, faceCy + faceH * 0.44, faceW * 0.30, '#8a4a34', 0.38],
  ];
  for (const [zx, zy, zr, zc, za] of zones) {
    const zg = ctx.createRadialGradient(zx, zy, 0, zx, zy, zr);
    zg.addColorStop(0, rgba(zc, za)); zg.addColorStop(1, rgba(zc, 0));
    ctx.fillStyle = zg; ctx.fillRect(zx - zr, zy - zr, zr * 2, zr * 2);
  }
  texturePass(ctx, w, h, noise, 14, 0.34, 11);
  // deep cool shadow down the unlit side + a brow band: form, not flatness
  const sideShade = ctx.createLinearGradient(cx - faceW / 2, 0, cx + faceW * 0.1, 0);
  sideShade.addColorStop(0, 'rgba(58,26,58,0.42)'); sideShade.addColorStop(1, 'rgba(58,26,58,0)');
  ctx.fillStyle = sideShade; ctx.fillRect(cx - faceW / 2, faceTop - 4, faceW * 0.62, faceH + 8);
  const browBand = ctx.createLinearGradient(0, faceCy - faceH * 0.30, 0, faceCy - faceH * 0.02);
  browBand.addColorStop(0, 'rgba(70,32,40,0.30)'); browBand.addColorStop(1, 'rgba(70,32,40,0)');
  ctx.fillStyle = browBand; ctx.fillRect(cx - faceW / 2, faceCy - faceH * 0.30, faceW, faceH * 0.28);
  const jawShade = ctx.createRadialGradient(cx, faceCy + faceH * 0.52, faceW * 0.05, cx, faceCy + faceH * 0.52, faceW * 0.42);
  jawShade.addColorStop(0, 'rgba(70,30,34,0.40)'); jawShade.addColorStop(1, 'rgba(70,30,34,0)');
  ctx.fillStyle = jawShade; ctx.fillRect(cx - faceW / 2, faceCy + faceH * 0.1, faceW, faceH * 0.45);
  // nose + lips shading (soft, photographic — no hard outlines)
  ctx.fillStyle = 'rgba(122,58,38,0.20)';
  ctx.beginPath(); ctx.ellipse(cx + faceW * 0.075, faceCy + faceH * 0.15, faceW * 0.030, faceH * 0.07, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,170,0.28)';
  ctx.beginPath(); ctx.ellipse(cx - faceW * 0.01, faceCy + faceH * 0.13, faceW * 0.014, faceH * 0.055, -0.15, 0, Math.PI * 2); ctx.fill();
  const lipG = ctx.createLinearGradient(0, faceCy + faceH * 0.30, 0, faceCy + faceH * 0.40);
  lipG.addColorStop(0, '#b0524e'); lipG.addColorStop(0.55, '#d1766a'); lipG.addColorStop(1, '#9c4642');
  ctx.fillStyle = lipG;
  ctx.beginPath(); ctx.ellipse(cx, faceCy + faceH * 0.345, faceW * 0.115, faceH * 0.038, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,200,0.5)';
  ctx.beginPath(); ctx.ellipse(cx - faceW * 0.03, faceCy + faceH * 0.325, faceW * 0.05, faceH * 0.010, 0, 0, Math.PI * 2); ctx.fill();
  // sunglasses: reflective gradient lenses holding a tiny mirrored sunset
  for (const side of [-1, 1]) {
    const lx = cx + side * faceW * 0.235, ly = faceCy - faceH * 0.13, lw = faceW * 0.40, lh = faceH * 0.20;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lx - lw / 2, ly - lh / 2);
    ctx.quadraticCurveTo(lx, ly - lh * 0.72, lx + lw / 2, ly - lh / 2);
    ctx.quadraticCurveTo(lx + lw / 2, ly + lh * 0.62, lx, ly + lh * 0.58);
    ctx.quadraticCurveTo(lx - lw / 2, ly + lh * 0.62, lx - lw / 2, ly - lh / 2);
    ctx.closePath(); ctx.clip();
    const lg = ctx.createLinearGradient(0, ly - lh / 2, 0, ly + lh / 2);
    lg.addColorStop(0, '#2a1a3e'); lg.addColorStop(0.42, '#c94f7c'); lg.addColorStop(0.62, '#f7a95c'); lg.addColorStop(0.66, '#3a6e8a'); lg.addColorStop(1, '#12283e');
    ctx.fillStyle = lg; ctx.fillRect(lx - lw / 2, ly - lh / 2, lw, lh);
    ctx.fillStyle = 'rgba(20,10,26,0.85)';
    for (let bxi = 0; bxi < 4; bxi++) ctx.fillRect(lx - lw * 0.36 + bxi * lw * 0.19, ly + lh * 0.06, lw * 0.11, lh * 0.20);
    ctx.fillStyle = 'rgba(255,246,220,0.85)';
    ctx.beginPath(); ctx.arc(lx + lw * 0.16, ly + lh * 0.10, lw * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.beginPath(); ctx.moveTo(lx - lw * 0.42, ly + lh * 0.4); ctx.lineTo(lx - lw * 0.05, ly - lh * 0.55); ctx.lineTo(lx + lw * 0.10, ly - lh * 0.55); ctx.lineTo(lx - lw * 0.22, ly + lh * 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#140a18'; ctx.lineWidth = Math.max(2, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(lx - lw / 2, ly - lh / 2);
    ctx.quadraticCurveTo(lx, ly - lh * 0.72, lx + lw / 2, ly - lh / 2);
    ctx.quadraticCurveTo(lx + lw / 2, ly + lh * 0.62, lx, ly + lh * 0.58);
    ctx.quadraticCurveTo(lx - lw / 2, ly + lh * 0.62, lx - lw / 2, ly - lh / 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#140a18'; ctx.fillRect(cx - faceW * 0.045, faceCy - faceH * 0.17, faceW * 0.09, faceH * 0.035);
  ctx.restore();
  // hair: a solid swept mass first, then hundreds of tapered strokes that
  // live inside the cap and fall beside the face — never across it
  ctx.save();
  const hairG = ctx.createLinearGradient(cx - faceW * 0.55, 0, cx + faceW * 0.55, 0);
  hairG.addColorStop(0, '#170b12'); hairG.addColorStop(0.55, '#2c181e'); hairG.addColorStop(0.85, '#54302c'); hairG.addColorStop(1, '#7a4636');
  ctx.fillStyle = hairG;
  ctx.beginPath();
  ctx.moveTo(cx - faceW * 0.56, faceCy - faceH * 0.06);
  ctx.bezierCurveTo(cx - faceW * 0.58, faceTop - faceH * 0.30, cx - faceW * 0.30, faceTop - faceH * 0.16, cx, faceTop - faceH * 0.15);
  ctx.bezierCurveTo(cx + faceW * 0.34, faceTop - faceH * 0.16, cx + faceW * 0.58, faceTop - faceH * 0.28, cx + faceW * 0.56, faceCy - faceH * 0.02);
  ctx.bezierCurveTo(cx + faceW * 0.50, faceTop + faceH * 0.06, cx + faceW * 0.30, faceTop + faceH * 0.02, cx + faceW * 0.12, faceTop + faceH * 0.05);
  ctx.bezierCurveTo(cx - faceW * 0.10, faceTop + faceH * 0.09, cx - faceW * 0.34, faceTop + faceH * 0.05, cx - faceW * 0.48, faceTop + faceH * 0.08);
  ctx.bezierCurveTo(cx - faceW * 0.54, faceTop + faceH * 0.02, cx - faceW * 0.56, faceCy - faceH * 0.02, cx - faceW * 0.56, faceCy - faceH * 0.06);
  ctx.closePath(); ctx.fill();
  // long side falls framing the face
  ctx.fillStyle = '#241218';
  ctx.beginPath(); ctx.ellipse(cx - faceW * 0.545, faceCy + faceH * 0.10, faceW * 0.075, faceH * 0.24, 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#33201f';
  ctx.beginPath(); ctx.ellipse(cx + faceW * 0.545, faceCy + faceH * 0.08, faceW * 0.07, faceH * 0.22, -0.10, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const t = rand();
    const side = Math.abs(t - 0.5) * 2; // 0 centre, 1 edge
    const hx = cx + (t - 0.5) * faceW * 1.04;
    const hy = faceTop - faceH * 0.13 + rand() * faceH * 0.10 + side * faceH * 0.06;
    const len = faceH * (0.10 + rand() * 0.13 + side * side * 0.38) * (0.65 + rand() * 0.7);
    const tone = ['#1c0f16', '#2e1a20', '#4a2a2c', '#6b3d34'][Math.floor(rand() * 4)];
    ctx.strokeStyle = rgba(tone, 0.5 + rand() * 0.45);
    ctx.lineWidth = 1 + rand() * (w * 0.004);
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + (t - 0.5) * faceW * 0.10, hy + len * 0.55, hx + (t - 0.5) * faceW * 0.17, hy + len);
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const t = 0.55 + rand() * 0.45;
    const hx = cx + (t - 0.5) * faceW * 1.02;
    const hy = faceTop + rand() * faceH * 0.10;
    ctx.strokeStyle = 'rgba(255,190,130,0.75)'; ctx.lineWidth = Math.max(1, w * 0.003);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + faceW * 0.05, hy + faceH * 0.16); ctx.stroke();
  }
  ctx.restore();
  // sweat and skin sheen: tiny bright catches on brow, nose bridge, lip
  ctx.save();
  ctx.fillStyle = 'rgba(255,236,210,0.55)';
  for (let i = 0; i < 26; i++) {
    const sx = cx + (rand() - 0.5) * faceW * 0.55;
    const sy = faceCy - faceH * (0.05 + rand() * 0.34);
    ctx.beginPath(); ctx.arc(sx, sy, 0.8 + rand() * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,240,220,0.16)';
  ctx.beginPath(); ctx.ellipse(cx + faceW * 0.02, faceCy + faceH * 0.10, faceW * 0.011, faceH * 0.042, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // cheekbone catches: two soft elongated highlights sell the form
  ctx.save();
  ctx.fillStyle = 'rgba(255,205,150,0.26)';
  ctx.beginPath(); ctx.ellipse(cx - faceW * 0.24, faceCy + faceH * 0.10, faceW * 0.10, faceH * 0.035, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,160,0.32)';
  ctx.beginPath(); ctx.ellipse(cx + faceW * 0.25, faceCy + faceH * 0.08, faceW * 0.09, faceH * 0.032, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // bright rim light along the sun side of hair and shoulder (a soft glow
  // hugging the silhouette, never a line drawn across the face)
  ctx.save();
  ctx.strokeStyle = 'rgba(255,214,160,0.8)'; ctx.lineWidth = Math.max(2, w * 0.008); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + w * 0.30, faceCy + faceH * 0.52); ctx.quadraticCurveTo(cx + w * 0.44, faceCy + faceH * 0.60, cx + w * 0.46, h * 0.86); ctx.stroke();
  ctx.restore();
  glow(ctx, cx + faceW * 0.5, faceCy - faceH * 0.2, faceW * 0.4, '#ffb37a', 0.35);
}

function sceneNeonStreet(ctx, w, h, noise, rand) {
  vGrad(ctx, 0, 0, w, h, [[0, '#0d1030'], [0.4, '#232055'], [0.62, '#3a2060'], [1, '#120e24']]);
  // building masses with lit windows
  for (const [bx, bw, bh, tone] of [[0, 0.30, 0.62, '#171233'], [0.68, 0.32, 0.58, '#120e2c'], [0.30, 0.16, 0.5, '#1d1740']]) {
    vGrad(ctx, w * bx, h * (0.62 - bh + 0.0), w * bw, h * bh, [[0, tone], [1, '#08061a']]);
    ctx.save(); ctx.beginPath(); ctx.rect(w * bx, 0, w * bw, h * 0.62); ctx.clip();
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rand() > 0.4 ? 'rgba(255,214,140,0.8)' : 'rgba(140,220,255,0.6)';
      ctx.fillRect(w * bx + rand() * w * bw * 0.92, rand() * h * 0.55, w * 0.012, h * 0.014);
    }
    ctx.restore();
  }
  // neon signs with bloom
  const signs = [
    [0.06, 0.16, '#ff4d9e', 'PALMS'], [0.70, 0.12, '#39d5e8', 'DINER'], [0.36, 0.08, '#ffb02e', 'HOTEL'],
  ];
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [sx, sy, col, word] of signs) {
    glow(ctx, w * (sx + 0.09), h * (sy + 0.035), w * 0.13, col, 0.75);
    ctx.font = `700 ${Math.round(w * 0.052)}px system-ui, sans-serif`;
    ctx.shadowColor = col; ctx.shadowBlur = w * 0.03;
    ctx.fillStyle = '#ffffff'; ctx.fillText(word, w * (sx + 0.09), h * (sy + 0.035));
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2;
    ctx.strokeRect(w * sx, h * sy, w * 0.18, h * 0.07);
  }
  ctx.restore();
  // wet asphalt: dark base + vertically smeared colour reflections
  vGrad(ctx, 0, h * 0.60, w, h * 0.40, [[0, '#1a1430'], [1, '#06040f']]);
  texturePass(ctx, w, h, noise, 16, 0.4, 5);
  const refl = [[0.15, '#ff4d9e'], [0.79, '#39d5e8'], [0.45, '#ffb02e'], [0.55, '#ff4d9e']];
  for (const [rx, col] of refl) {
    const rg = ctx.createLinearGradient(0, h * 0.60, 0, h);
    rg.addColorStop(0, rgba(col, 0.5)); rg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = rg;
    const rw = w * 0.05;
    ctx.beginPath();
    ctx.moveTo(w * rx - rw / 2, h * 0.60);
    for (let y = 0; y <= 8; y++) ctx.lineTo(w * rx - rw / 2 + (noise.fbm(rx * 40, y * 0.8, 3) - 0.5) * rw * 1.6, h * 0.60 + (y / 8) * h * 0.40);
    for (let y = 8; y >= 0; y--) ctx.lineTo(w * rx + rw / 2 + (noise.fbm(rx * 40 + 9, y * 0.8, 3) - 0.5) * rw * 1.6, h * 0.60 + (y / 8) * h * 0.40);
    ctx.closePath(); ctx.fill();
  }
  // the car, low and glossy, with its smeared twin below
  drawShadedCar(ctx, w * 0.16, h * 0.66, w * 0.68, { body: '#d92652', bodyDark: '#5e0f2c' });
  ctx.save();
  ctx.translate(0, h * 0.66 + h * 0.205); ctx.scale(1, -0.55); ctx.globalAlpha = 0.30;
  ctx.filter = 'blur(2px)';
  drawShadedCar(ctx, w * 0.16, h * 0.66, w * 0.68, { body: '#d92652', bodyDark: '#5e0f2c' });
  ctx.restore();
  // steam haze + rain sparkle
  for (let i = 0; i < 5; i++) glow(ctx, rand() * w, h * (0.55 + rand() * 0.3), w * 0.16, '#aab6ff', 0.10);
  ctx.fillStyle = 'rgba(200,225,255,0.35)';
  for (let i = 0; i < 160; i++) ctx.fillRect(rand() * w, rand() * h, 1, 3 + rand() * 5);
  bokehField(ctx, w, h, rand, 12, ['#ff4d9e', '#39d5e8', '#ffb02e'], 0.05, 0.5);
}

function sceneAerialCoast(ctx, w, h, noise, rand) {
  // turquoise shallows with noise-textured water
  vGrad(ctx, 0, 0, w, h, [[0, '#7fe0d4'], [0.5, '#2fb3b8'], [1, '#15708e']]);
  texturePass(ctx, w, h, noise, 11, 0.55, 8);
  ctx.save();
  for (let i = 0; i < 500; i++) {
    const n = noise.fbm(i * 0.13, i * 0.07, 3);
    ctx.fillStyle = `rgba(255,255,255,${0.05 + n * 0.22})`;
    ctx.fillRect(rand() * w, rand() * h, 2 + n * 7, 1.3);
  }
  ctx.restore();
  // curving shoreline: deep sand shape with a foam edge
  ctx.fillStyle = '#e8cf9e';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.bezierCurveTo(w * 0.30, h * 0.72, w * 0.42, h * 0.98, w * 0.66, h * 0.78);
  ctx.bezierCurveTo(w * 0.82, h * 0.64, w * 0.9, h * 0.86, w, h * 0.80);
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  texturePass(ctx, w, h, noise, 13, 0.3, 21);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = w * 0.008;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.985);
  ctx.bezierCurveTo(w * 0.30, h * 0.70, w * 0.42, h * 0.96, w * 0.66, h * 0.765);
  ctx.bezierCurveTo(w * 0.82, h * 0.625, w * 0.9, h * 0.845, w, h * 0.785);
  ctx.stroke();
  // boat with foaming wake
  const bx = w * 0.30, by = h * 0.30;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = w * 0.006;
  for (let t = 0; t < 3; t++) {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - w * (0.10 + t * 0.05), by + h * (0.05 + t * 0.03), bx - w * (0.2 + t * 0.08), by + h * (0.02 + t * 0.05));
    ctx.stroke();
  }
  ctx.fillStyle = '#f4f6f8';
  ctx.beginPath(); ctx.moveTo(bx - w * 0.045, by); ctx.lineTo(bx + w * 0.055, by - h * 0.012); ctx.lineTo(bx + w * 0.03, by + h * 0.018); ctx.lineTo(bx - w * 0.03, by + h * 0.016); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d92652'; ctx.fillRect(bx - w * 0.01, by - h * 0.03, w * 0.02, h * 0.022);
  ctx.restore();
  // beach crowd texture: umbrellas + tiny figures as dense dabs
  for (let i = 0; i < 130; i++) {
    const ux = w * (0.08 + rand() * 0.86), uy = h * (0.80 + rand() * 0.17);
    if (rand() > 0.45) {
      ctx.fillStyle = ['#e84a6e', '#ffb02e', '#2fb3b8', '#f4f6f8'][Math.floor(rand() * 4)];
      ctx.beginPath(); ctx.arc(ux, uy, w * 0.011, Math.PI, 0); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(90,50,30,0.8)';
      ctx.fillRect(ux, uy, 2, 3.4);
    }
  }
  glow(ctx, w * 0.85, h * 0.10, w * 0.3, '#fff3cf', 0.5);
}

function sceneSkylineBay(ctx, w, h, noise, rand) {
  vGrad(ctx, 0, 0, w, h, [[0, '#1b2a5e'], [0.4, '#3a4a8a'], [0.62, '#c96a8a'], [0.72, '#f2a56b'], [1, '#2a3560']]);
  glow(ctx, w * 0.30, h * 0.66, w * 0.4, '#ffb37a', 0.55);
  // skyline: varied towers, hundreds of lit windows with bloom
  let bx = -w * 0.02;
  const tops = [];
  while (bx < w) {
    const bw = w * (0.05 + rand() * 0.06), bh = h * (0.20 + rand() * 0.34);
    const grad = ctx.createLinearGradient(0, h * 0.68 - bh, 0, h * 0.68);
    grad.addColorStop(0, '#232c52'); grad.addColorStop(1, '#0d1230');
    ctx.fillStyle = grad; ctx.fillRect(bx, h * 0.68 - bh, bw, bh);
    tops.push([bx, bw, bh]);
    bx += bw + w * 0.008;
  }
  ctx.save();
  for (const [tx, tw, th] of tops) {
    const cols = Math.max(2, Math.floor(tw / (w * 0.016)));
    const rows = Math.max(4, Math.floor(th / (h * 0.028)));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (rand() > 0.45) continue;
      const bright = 0.35 + rand() * 0.65;
      ctx.fillStyle = rand() > 0.25 ? `rgba(255,${200 + Math.floor(rand() * 40)},140,${bright})` : `rgba(160,225,255,${bright})`;
      ctx.fillRect(tx + w * 0.008 + c * (tw - w * 0.016) / cols, h * 0.68 - th + h * 0.012 + r * (th - h * 0.02) / rows, w * 0.008, h * 0.011);
    }
  }
  ctx.restore();
  glow(ctx, w * 0.5, h * 0.55, w * 0.55, '#ffb37a', 0.16);
  // water with broken shimmering reflections
  vGrad(ctx, 0, h * 0.68, w, h * 0.32, [[0, '#3a3a6e'], [0.3, '#232550'], [1, '#0a0e28']]);
  for (let i = 0; i < 650; i++) {
    const x = rand() * w, y = h * 0.69 + Math.pow(rand(), 1.4) * h * 0.29;
    const n = noise.fbm(x * 0.03, y * 0.09, 3);
    const col = rand() > 0.3 ? '255,190,120' : '150,210,255';
    ctx.fillStyle = `rgba(${col},${0.08 + n * 0.4})`;
    ctx.fillRect(x, y, 2 + n * 10 * (0.4 + (y / h - 0.68)), 1.5);
  }
  // a small lit ferry crossing
  ctx.fillStyle = '#0d1230'; ctx.fillRect(w * 0.60, h * 0.655, w * 0.13, h * 0.02);
  ctx.fillStyle = '#ffd98c'; for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.615 + i * w * 0.018, h * 0.66, w * 0.008, h * 0.008);
  glow(ctx, w * 0.665, h * 0.66, w * 0.05, '#ffd98c', 0.5);
}

function sceneCoastalRoad(ctx, w, h, noise, rand) {
  vGrad(ctx, 0, 0, w, h, [[0, '#5a7ec2'], [0.34, '#e89a6e'], [0.52, '#ffc98a'], [0.60, '#e88a5a'], [1, '#7a4a3e']]);
  glow(ctx, w * 0.24, h * 0.52, w * 0.36, '#ffd9a0', 0.8);
  ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.arc(w * 0.24, h * 0.52, w * 0.035, 0, Math.PI * 2); ctx.fill();
  // sea to the left, cliffs to the right (atmospheric layers)
  vGrad(ctx, 0, h * 0.56, w * 0.42, h * 0.2, [[0, '#e8a06e'], [1, '#3a7e9e']]);
  ctx.fillStyle = 'rgba(122,74,80,0.8)';
  ctx.beginPath(); ctx.moveTo(w * 0.62, h * 0.56);
  ctx.quadraticCurveTo(w * 0.8, h * 0.42, w, h * 0.48); ctx.lineTo(w, h * 0.76); ctx.lineTo(w * 0.62, h * 0.76); ctx.closePath(); ctx.fill();
  texturePass(ctx, w, h, noise, 10, 0.4, 31);
  // road sweeping in perspective
  ctx.fillStyle = '#2c2c34';
  ctx.beginPath();
  ctx.moveTo(w * 0.40, h * 0.60); ctx.lineTo(w * 0.52, h * 0.60);
  ctx.lineTo(w * 0.98, h); ctx.lineTo(w * 0.05, h); ctx.closePath(); ctx.fill();
  const roadG = ctx.createLinearGradient(0, h * 0.6, 0, h);
  roadG.addColorStop(0, 'rgba(255,170,110,0.10)'); roadG.addColorStop(1, 'rgba(255,140,90,0.30)');
  ctx.fillStyle = roadG; ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,170,0.9)'; ctx.lineWidth = Math.max(1.4, w * 0.004);
  ctx.setLineDash([w * 0.03, w * 0.025]);
  ctx.beginPath(); ctx.moveTo(w * 0.46, h * 0.605); ctx.lineTo(w * 0.52, h); ctx.stroke();
  ctx.setLineDash([]);
  // guardrail posts receding
  ctx.fillStyle = '#d8d4cc';
  for (let i = 0; i < 8; i++) {
    const t = i / 7, px = w * (0.55 + t * 0.40), py = h * (0.615 + t * 0.36), ps = 2 + t * t * w * 0.016;
    ctx.fillRect(px, py - ps * 1.6, ps * 0.32, ps * 1.6);
  }
  ctx.strokeStyle = 'rgba(230,228,220,0.85)'; ctx.lineWidth = Math.max(1, w * 0.003);
  ctx.beginPath(); ctx.moveTo(w * 0.55, h * 0.60); ctx.lineTo(w * 0.96, h * 0.955); ctx.stroke();
  // small shaded car driving into the light + long shadow
  drawShadedCar(ctx, w * 0.40, h * 0.70, w * 0.17, { body: '#e8e2d2', bodyDark: '#6e6258' });
  ctx.save(); ctx.translate(w * 0.40, h * 0.70); ctx.rotate(0.06); ctx.scale(1, 0.14);
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.2);
  cg.addColorStop(0, 'rgba(30,10,20,0.4)'); cg.addColorStop(1, 'rgba(30,10,20,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(w * 0.05, 0, w * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // heat shimmer band + palms on the cliff
  const hz = ctx.createLinearGradient(0, h * 0.52, 0, h * 0.60);
  hz.addColorStop(0, 'rgba(255,220,170,0)'); hz.addColorStop(0.5, 'rgba(255,220,170,0.22)'); hz.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, h * 0.52, w, h * 0.08);
  palmFronds(ctx, w * 0.88, h * 0.47, w * 0.09, rand, '#4a2438', 6);
}

export const SCENES = [
  { id: 'portrait', name: 'Portrait at Magenta Bay', paint: scenePortrait },
  { id: 'beach', name: 'Dawn Beach Walk', paint: sceneDawnBeach },
  { id: 'neon', name: 'Neon Street After Rain', paint: sceneNeonStreet },
  { id: 'aerial', name: 'Turquoise Aerial Coast', paint: sceneAerialCoast },
  { id: 'skyline', name: 'Blue-Hour Skyline Bay', paint: sceneSkylineBay },
  { id: 'road', name: 'Golden Coastal Road', paint: sceneCoastalRoad },
];

const sceneCache = new Map();
export function renderScene(id, w, h) {
  const key = `${id}:${Math.round(w)}x${Math.round(h)}`;
  if (sceneCache.has(key)) return sceneCache.get(key);
  const def = SCENES.find((s) => s.id === id) || SCENES[0];
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const seed = 1000 + SCENES.indexOf(def) * 977;
  const noise = new NoiseField(seed);
  const rand = mulberry32(seed * 3 + 17);
  def.paint(ctx, canvas.width, canvas.height, noise, rand);
  grainAndVignette(ctx, canvas.width, canvas.height, seed + 5, 8, 0.30);
  if (sceneCache.size > 40) sceneCache.clear();
  sceneCache.set(key, canvas);
  return canvas;
}
