// scenes.js — the six original sample scenes of Vice Coast Cover Studio
// (round 8), painted procedurally on a 2D canvas. Every scene is built
// as a continuous-tone photograph first: many-step gradients, a seeded
// multi-octave noise field modulating clouds, water, foliage, asphalt,
// skin and cloth down to a micro scale, one soft key light with gentle
// falloff, a cool sky fill, bright rims on sun-side edges and ambient
// occlusion pooled in creases and contacts. The poster finish is applied
// later, lightly, by poster.js — never inside a scene.
//
// Scenes: dawnBeach, portrait (the hero), neonCar, aerial, skyline,
// goldenRoad. Each carries its own sky and light recipe so no two
// panels of a cover ever share a sky.

import { NoiseField, clamp01, lerp, mixHex, mulberry32, smoothstep, steppedGradient, steppedRadial } from './noise.js';

// ---------- shared painting helpers ----------

function sky(ctx, w, h, colours, horizon = 0.62) {
  ctx.fillStyle = steppedGradient(ctx, 0, 0, 0, h * horizon, colours, 32);
  ctx.fillRect(0, 0, w, h * horizon + 1);
}

function sunDisc(ctx, x, y, r, core, halo) {
  const g = steppedRadial(ctx, x, y, 0, x, y, r * 3.4, [core, halo, 'rgba(255,255,255,0)'], 18);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3.4, y - r * 3.4, r * 6.8, r * 6.8);
  ctx.restore();
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function clouds(ctx, w, h, field, seed, tint, yBase, ySpread, count, alpha) {
  const rand = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const cx = rand() * w;
    const cy = yBase + rand() * ySpread;
    const cw = w * (0.16 + rand() * 0.3);
    const ch = cw * (0.16 + rand() * 0.1);
    const n = field.fbm(cx * 0.004 + seed, cy * 0.004, 3);
    const g = steppedRadial(ctx, cx, cy, 0, cx, cy, cw * 0.5, [tint, 'rgba(255,255,255,0)'], 12);
    ctx.globalAlpha = alpha * (0.5 + n * 0.8);
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ch / cw);
    ctx.beginPath();
    ctx.arc(0, 0, cw * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function bokeh(ctx, w, h, rand, colours, count, rMax, alpha) {
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 3 + rand() * rMax;
    ctx.globalAlpha = alpha * (0.3 + rand() * 0.7);
    ctx.fillStyle = colours[Math.floor(rand() * colours.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function grainOverlay(ctx, w, h, field, strength, scale = 0.35) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const n = field.fbm(x * scale, y * scale, 3) - 0.5;
      const i = (y * w + x) * 4;
      const delta = n * strength * 255;
      d[i] += delta;
      d[i + 1] += delta;
      d[i + 2] += delta;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function contactShadow(ctx, x, y, rx, ry, alpha = 0.4) {
  const g = steppedRadial(ctx, x, y, 0, x, y, rx, ['rgba(10,4,18,0.9)', 'rgba(10,4,18,0)'], 10);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// A fully shaded small figure: head with hair, torso and limbs in
// clothing tones with fold shading, feet, and a soft contact shadow.
// Never a stick figure: limbs are tapered strokes with round caps and
// the torso is a filled, shaded shape.
export function drawFigure(ctx, x, y, height, opt) {
  const { skin = '#b97a56', hair = '#2a1a12', top = '#e8e2d4', bottom = '#31435c', rim = '#ffd9a0', pose = 0 } = opt || {};
  const u = height / 100;
  contactShadow(ctx, x, y, 16 * u, 4 * u, 0.45);
  const hipY = y - 46 * u;
  const shoulderY = y - 78 * u;
  const headY = y - 90 * u;
  const sway = pose * 4 * u;
  ctx.lineCap = 'round';
  // legs
  ctx.strokeStyle = bottom;
  ctx.lineWidth = 7.5 * u;
  ctx.beginPath();
  ctx.moveTo(x - 3 * u, hipY);
  ctx.lineTo(x - 6 * u + sway, y - 2 * u);
  ctx.moveTo(x + 3 * u, hipY);
  ctx.lineTo(x + 7 * u - sway, y - 2 * u);
  ctx.stroke();
  // arms
  ctx.strokeStyle = mixHex(top, '#000000', 0.12);
  ctx.lineWidth = 6 * u;
  ctx.beginPath();
  ctx.moveTo(x - 8 * u, shoulderY + 3 * u);
  ctx.lineTo(x - 13 * u - sway, hipY + 6 * u);
  ctx.moveTo(x + 8 * u, shoulderY + 3 * u);
  ctx.lineTo(x + 13 * u + sway, hipY + 4 * u);
  ctx.stroke();
  // torso with fold shading
  const torso = steppedGradient(ctx, x - 10 * u, shoulderY, x + 10 * u, shoulderY, [mixHex(top, '#000000', 0.25), top, mixHex(top, '#ffffff', 0.18), mixHex(top, '#000000', 0.18)], 16);
  ctx.fillStyle = torso;
  ctx.beginPath();
  ctx.moveTo(x - 9 * u, shoulderY);
  ctx.quadraticCurveTo(x, shoulderY - 4 * u, x + 9 * u, shoulderY);
  ctx.lineTo(x + 7 * u, hipY + 2 * u);
  ctx.quadraticCurveTo(x, hipY + 5 * u, x - 7 * u, hipY + 2 * u);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,20,0.25)';
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.moveTo(x - 4 * u, shoulderY + 8 * u);
  ctx.quadraticCurveTo(x - 2 * u, (shoulderY + hipY) / 2, x - 4 * u, hipY - 4 * u);
  ctx.moveTo(x + 4 * u, shoulderY + 8 * u);
  ctx.quadraticCurveTo(x + 2 * u, (shoulderY + hipY) / 2, x + 4 * u, hipY - 4 * u);
  ctx.stroke();
  // head: shaded sphere planes
  const head = steppedRadial(ctx, x - 3 * u, headY - 3 * u, 1, x, headY, 10.5 * u, [mixHex(skin, '#ffffff', 0.22), skin, mixHex(skin, '#1a0c14', 0.35)], 16);
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(x, headY, 10 * u, 0, Math.PI * 2);
  ctx.fill();
  // hair cap with rim: covers the crown and dips at the sides so the
  // head never reads as a bald ball at panel size
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(x, headY - 1.5 * u, 10.3 * u, Math.PI * 0.95, Math.PI * 2.05);
  ctx.quadraticCurveTo(x + 6 * u, headY - 13 * u, x, headY - 13.5 * u);
  ctx.quadraticCurveTo(x - 6 * u, headY - 13 * u, x - 10.3 * u, headY - 1.5 * u);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.4 * u;
  ctx.beginPath();
  ctx.arc(x, headY - 1 * u, 10.4 * u, Math.PI * 1.55, Math.PI * 1.95);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function palmFronds(ctx, x, y, size, tone, rimTone, rand) {
  // trunk
  ctx.strokeStyle = mixHex(tone, '#000000', 0.3);
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + size * 0.08, y - size * 0.5, x + size * 0.2, y - size);
  ctx.stroke();
  const topX = x + size * 0.2;
  const topY = y - size;
  // fronds: many individual tapered leaflets along curved spines
  for (let f = 0; f < 9; f += 1) {
    const ang = -Math.PI * (0.08 + (f / 9) * 0.85);
    const len = size * (0.55 + rand() * 0.3);
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len * 0.55 + len * 0.22;
    const mx = topX + Math.cos(ang) * len * 0.5;
    const my = topY + Math.sin(ang) * len * 0.4 - len * 0.12;
    ctx.strokeStyle = tone;
    ctx.lineWidth = size * 0.016;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    for (let lf = 0; lf < 12; lf += 1) {
      const t = lf / 12;
      const px = lerp(lerp(topX, mx, t), lerp(mx, ex, t), t);
      const py = lerp(lerp(topY, my, t), lerp(my, ey, t), t);
      ctx.strokeStyle = lf % 3 === 0 ? rimTone : tone;
      ctx.lineWidth = size * 0.008;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (ex - topX) * 0.03 + size * 0.02, py + size * (0.03 + t * 0.05));
      ctx.stroke();
    }
  }
}

// ---------- (a) dawn beach ----------

function paintDawnBeach(ctx, w, h, seed) {
  const field = new NoiseField(seed);
  const rand = mulberry32(seed + 7);
  sky(ctx, w, h, ['#2e4a7d', '#7d6aa8', '#e8907c', '#ffc98a', '#ffe9bb'], 0.58);
  clouds(ctx, w, h, field, seed + 1, '#ffd9b0', h * 0.06, h * 0.3, 14, 0.5);
  sunDisc(ctx, w * 0.68, h * 0.52, w * 0.045, '#fff3cf', '#ffb37a');
  // sea
  ctx.fillStyle = steppedGradient(ctx, 0, h * 0.58, 0, h * 0.8, ['#e8a37e', '#7d7ba8', '#3d6a8d', '#2a5578'], 24);
  ctx.fillRect(0, h * 0.58, w, h * 0.22);
  // sparkle noise on the water
  ctx.save();
  for (let i = 0; i < 900; i += 1) {
    const x = rand() * w;
    const y = h * 0.58 + rand() * h * 0.2;
    const n = field.fbm(x * 0.05, y * 0.05, 2);
    ctx.globalAlpha = 0.12 + n * 0.5;
    ctx.fillStyle = rand() > 0.5 ? '#ffe9bb' : '#ffd9a0';
    ctx.fillRect(x, y, 1 + rand() * 3, 1);
  }
  ctx.restore();
  // wet sand with sky reflection
  ctx.fillStyle = steppedGradient(ctx, 0, h * 0.78, 0, h, ['#d99a76', '#b97a5e', '#8d5a4a'], 20);
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ffc98a';
  ctx.fillRect(w * 0.6, h * 0.78, w * 0.16, h * 0.2);
  ctx.restore();
  // two walkers with rim light and long shadows
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#5e3428';
  ctx.beginPath();
  ctx.ellipse(w * 0.36, h * 0.93, w * 0.1, h * 0.012, 0.2, 0, Math.PI * 2);
  ctx.ellipse(w * 0.47, h * 0.9, w * 0.08, h * 0.01, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawFigure(ctx, w * 0.38, h * 0.94, h * 0.34, { skin: '#c98a5e', hair: '#3a2418', top: '#f2e3c8', bottom: '#7d3a4a', rim: '#ffe0ae', pose: 1 });
  drawFigure(ctx, w * 0.48, h * 0.91, h * 0.3, { skin: '#8d5a3a', hair: '#140c08', top: '#7db8c9', bottom: '#e8e2d4', rim: '#ffe0ae', pose: -1 });
  palmFronds(ctx, w * 0.08, h * 0.86, h * 0.34, '#2a4a34', '#e8a37e', rand);
  palmFronds(ctx, w * 0.9, h * 0.84, h * 0.26, '#223d2c', '#ffc98a', rand);
  grainOverlay(ctx, w, h, field, 0.05, 0.5);
}

// ---------- (b) the hero portrait ----------

function paintPortrait(ctx, w, h, seed) {
  const field = new NoiseField(seed + 31);
  const rand = mulberry32(seed + 77);
  // magenta sunset bay behind, hazy and bright
  sky(ctx, w, h, ['#5e2a6e', '#a83a7d', '#e85a7d', '#ff8a5e', '#ffc46e'], 0.66);
  clouds(ctx, w, h, field, seed + 3, '#ffb37a', h * 0.04, h * 0.34, 12, 0.55);
  sunDisc(ctx, w * 0.8, h * 0.4, w * 0.05, '#fff0c0', '#ff9a6e');
  ctx.fillStyle = steppedGradient(ctx, 0, h * 0.66, 0, h, ['#c94a6e', '#7d2a5e', '#3a1a4a'], 20);
  ctx.fillRect(0, h * 0.66, w, h * 0.34);
  // distant palms, hazy silhouettes
  ctx.save();
  ctx.globalAlpha = 0.5;
  palmFronds(ctx, w * 0.06, h * 0.7, h * 0.22, '#2a1030', '#ff8a5e', rand);
  palmFronds(ctx, w * 0.94, h * 0.68, h * 0.18, '#2a1030', '#ffb37a', rand);
  ctx.restore();
  bokeh(ctx, w, h, rand, ['#ffd9a0', '#ff8ab0', '#fff3cf'], 26, w * 0.03, 0.16);

  // ----- figure geometry -----
  const cx = w * 0.5;
  const headW = w * 0.46;
  const headH = h * 0.52;
  const headTop = h * 0.1;
  const headCY = headTop + headH * 0.46;
  const chinY = headTop + headH;
  const neckW = headW * 0.34;
  const shoulderY = h * 0.94;

  // shoulders and upper chest in a textured garment
  const garment = steppedGradient(ctx, cx - headW, shoulderY - h * 0.2, cx + headW, shoulderY - h * 0.2, ['#123a4a', '#1d5a6e', '#2a7d8d', '#1d5a6e', '#0e2e3d'], 24);
  ctx.fillStyle = garment;
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.7, chinY + h * 0.05);
  ctx.quadraticCurveTo(cx - headW * 1.05, shoulderY - h * 0.1, cx - headW * 1.12, h + 2);
  ctx.lineTo(cx + headW * 1.12, h + 2);
  ctx.quadraticCurveTo(cx + headW * 1.05, shoulderY - h * 0.1, cx + neckW * 0.7, chinY + h * 0.05);
  ctx.closePath();
  ctx.fill();
  // garment weave: fine cross-hatch noise + fold shading
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 2600; i += 1) {
    const x = cx - headW * 1.1 + rand() * headW * 2.2;
    const y = chinY + rand() * (h - chinY);
    const n = field.fbm(x * 0.08, y * 0.08, 2);
    ctx.globalAlpha = 0.05 + n * 0.12;
    ctx.fillStyle = rand() > 0.5 ? '#bfe8ee' : '#061820';
    ctx.fillRect(x, y, 2.2, 1);
  }
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#061820';
  for (let f = 0; f < 7; f += 1) {
    const fx = cx - headW * 0.8 + f * headW * 0.27;
    ctx.beginPath();
    ctx.ellipse(fx, shoulderY, headW * 0.05, h * 0.1, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // collar line and strap
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#0a222e';
  ctx.lineWidth = h * 0.012;
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.72, chinY + h * 0.055);
  ctx.quadraticCurveTo(cx, chinY + h * 0.13, cx + neckW * 0.72, chinY + h * 0.055);
  ctx.stroke();
  ctx.strokeStyle = '#e8b13a';
  ctx.lineWidth = h * 0.006;
  ctx.beginPath();
  ctx.moveTo(cx + neckW * 0.2, chinY + h * 0.06);
  ctx.quadraticCurveTo(cx + headW * 0.4, shoulderY - h * 0.02, cx + headW * 0.62, h);
  ctx.stroke();
  ctx.restore();

  // neck with the jaw's shadow pooled on it
  const neckGrad = steppedGradient(ctx, 0, chinY - h * 0.04, 0, chinY + h * 0.1, ['#7d4630', '#9a5a3a', '#b97a4e'], 16);
  ctx.fillStyle = neckGrad;
  ctx.fillRect(cx - neckW / 2, chinY - h * 0.05, neckW, h * 0.13);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = steppedGradient(ctx, 0, chinY - h * 0.05, 0, chinY + h * 0.03, ['rgba(40,14,10,0.9)', 'rgba(40,14,10,0)'], 10);
  ctx.fillRect(cx - neckW / 2, chinY - h * 0.05, neckW, h * 0.09);
  ctx.restore();

  // ----- head: many small shaded planes -----
  // base skull shape
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.5, headCY - headH * 0.1);
  ctx.bezierCurveTo(cx - headW * 0.52, headTop + headH * 0.02, cx - headW * 0.3, headTop - headH * 0.04, cx, headTop - headH * 0.03);
  ctx.bezierCurveTo(cx + headW * 0.3, headTop - headH * 0.04, cx + headW * 0.52, headTop + headH * 0.02, cx + headW * 0.5, headCY - headH * 0.1);
  ctx.bezierCurveTo(cx + headW * 0.46, headCY + headH * 0.3, cx + headW * 0.3, chinY - headH * 0.06, cx + headW * 0.16, chinY);
  ctx.quadraticCurveTo(cx, chinY + headH * 0.03, cx - headW * 0.16, chinY);
  ctx.bezierCurveTo(cx - headW * 0.3, chinY - headH * 0.06, cx - headW * 0.46, headCY + headH * 0.3, cx - headW * 0.5, headCY - headH * 0.1);
  ctx.closePath();
  const skinBase = steppedRadial(ctx, cx - headW * 0.18, headTop + headH * 0.2, headW * 0.05, cx, headCY, headW * 0.85, ['#e8a878', '#d18d5a', '#b06a3e', '#7d4630'], 28);
  ctx.fillStyle = skinBase;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // lit forehead plane
  let plane = steppedRadial(ctx, cx - headW * 0.05, headTop + headH * 0.16, 2, cx - headW * 0.05, headTop + headH * 0.16, headW * 0.42, ['rgba(255,205,150,0.36)', 'rgba(255,205,150,0)'], 14);
  ctx.fillStyle = plane;
  ctx.fillRect(cx - headW * 0.5, headTop, headW, headH * 0.4);
  // cool shadow zone on the shade side
  plane = steppedGradient(ctx, cx + headW * 0.08, 0, cx + headW * 0.55, 0, ['rgba(70,40,80,0)', 'rgba(70,40,80,0.5)'], 16);
  ctx.fillStyle = plane;
  ctx.fillRect(cx, headTop, headW * 0.55, headH);
  // cheekbones catching the key light
  plane = steppedRadial(ctx, cx - headW * 0.26, headCY + headH * 0.1, 1, cx - headW * 0.26, headCY + headH * 0.1, headW * 0.2, ['rgba(255,190,130,0.6)', 'rgba(255,190,130,0)'], 12);
  ctx.fillStyle = plane;
  ctx.fillRect(cx - headW * 0.5, headCY - headH * 0.1, headW * 0.55, headH * 0.45);
  plane = steppedRadial(ctx, cx + headW * 0.24, headCY + headH * 0.12, 1, cx + headW * 0.24, headCY + headH * 0.12, headW * 0.16, ['rgba(240,160,110,0.4)', 'rgba(240,160,110,0)'], 12);
  ctx.fillStyle = plane;
  ctx.fillRect(cx + headW * 0.05, headCY - headH * 0.05, headW * 0.45, headH * 0.4);
  // temple planes: cooler, slightly hollow, stepping the forehead
  // down into the side planes where the ears sit
  plane = steppedRadial(ctx, cx - headW * 0.4, headTop + headH * 0.3, 1, cx - headW * 0.4, headTop + headH * 0.3, headW * 0.17, ['rgba(90,50,60,0.4)', 'rgba(90,50,60,0)'], 12);
  ctx.fillStyle = plane;
  ctx.fillRect(cx - headW * 0.58, headTop + headH * 0.1, headW * 0.36, headH * 0.4);
  plane = steppedRadial(ctx, cx + headW * 0.4, headTop + headH * 0.3, 1, cx + headW * 0.4, headTop + headH * 0.3, headW * 0.17, ['rgba(80,44,54,0.45)', 'rgba(80,44,54,0)'], 12);
  ctx.fillStyle = plane;
  ctx.fillRect(cx + headW * 0.22, headTop + headH * 0.1, headW * 0.36, headH * 0.4);
  // brow ridge shadow beneath it
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = steppedGradient(ctx, 0, headTop + headH * 0.3, 0, headTop + headH * 0.42, ['rgba(60,26,16,0)', 'rgba(60,26,16,0.85)', 'rgba(60,26,16,0)'], 12);
  ctx.fillRect(cx - headW * 0.42, headTop + headH * 0.3, headW * 0.84, headH * 0.13);
  ctx.globalAlpha = 1;
  // nose: bridge highlight, side shadow, nostril shadow, cast shadow
  const noseX = cx - headW * 0.02;
  const noseTop = headTop + headH * 0.38;
  const noseTip = headTop + headH * 0.62;
  plane = steppedGradient(ctx, noseX - headW * 0.045, 0, noseX + headW * 0.05, 0, ['rgba(90,40,22,0.35)', 'rgba(255,200,140,0.75)', 'rgba(120,60,30,0.4)'], 14);
  ctx.fillStyle = plane;
  ctx.beginPath();
  ctx.moveTo(noseX - headW * 0.045, noseTop);
  ctx.lineTo(noseX + headW * 0.05, noseTop);
  ctx.lineTo(noseX + headW * 0.075, noseTip);
  ctx.quadraticCurveTo(noseX, noseTip + headH * 0.035, noseX - headW * 0.07, noseTip);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#4a2010';
  ctx.beginPath();
  ctx.ellipse(noseX - headW * 0.035, noseTip + headH * 0.012, headW * 0.016, headH * 0.01, 0, 0, Math.PI * 2);
  ctx.ellipse(noseX + headW * 0.04, noseTip + headH * 0.012, headW * 0.016, headH * 0.01, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(noseX + headW * 0.1, noseTip + headH * 0.05, headW * 0.06, headH * 0.025, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // lips: darker line, lower-lip highlight
  const lipY = headTop + headH * 0.76;
  ctx.fillStyle = steppedGradient(ctx, 0, lipY - headH * 0.025, 0, lipY + headH * 0.03, ['#a34a3a', '#c96a54', '#8d3a2e'], 12);
  ctx.beginPath();
  ctx.ellipse(cx - headW * 0.01, lipY, headW * 0.13, headH * 0.028, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(50,14,10,0.8)';
  ctx.lineWidth = Math.max(1.2, h * 0.0035);
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.13, lipY);
  ctx.quadraticCurveTo(cx - headW * 0.01, lipY + headH * 0.008, cx + headW * 0.11, lipY);
  ctx.stroke();
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#ffb08d';
  ctx.beginPath();
  ctx.ellipse(cx - headW * 0.01, lipY + headH * 0.016, headW * 0.07, headH * 0.008, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // jaw shadow pooled beneath the chin
  ctx.fillStyle = steppedGradient(ctx, 0, chinY - headH * 0.05, 0, chinY + headH * 0.02, ['rgba(50,20,12,0)', 'rgba(50,20,12,0.55)'], 10);
  ctx.fillRect(cx - headW * 0.3, chinY - headH * 0.05, headW * 0.6, headH * 0.08);
  // ears, shaded, set into the side planes
  for (const side of [-1, 1]) {
    const earX = cx + side * headW * 0.52;
    const earY = headCY + headH * 0.1;
    const earG = steppedRadial(ctx, earX - side * headW * 0.015, earY - headH * 0.02, 1, earX, earY, headW * 0.07, ['#e0a06c', '#b06a3e', '#7d4630'], 12);
    ctx.fillStyle = earG;
    ctx.beginPath();
    ctx.ellipse(earX, earY, headW * 0.048, headH * 0.078, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,44,20,0.45)';
    ctx.lineWidth = Math.max(1, h * 0.0026);
    ctx.beginPath();
    ctx.ellipse(earX, earY, headW * 0.026, headH * 0.04, 0, Math.PI * 0.2, Math.PI * 1.4);
    ctx.stroke();
  }
  // pore-level micro-noise, freckles and stubble specks, sweat sheen
  for (let i = 0; i < 5200; i += 1) {
    const x = cx - headW * 0.5 + rand() * headW;
    const y = headTop + rand() * headH;
    const n = field.fbm(x * 0.14, y * 0.14, 3);
    ctx.globalAlpha = 0.04 + n * 0.1;
    ctx.fillStyle = rand() > 0.45 ? '#ffe0b8' : '#5e2c16';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 130; i += 1) {
    const x = cx - headW * 0.34 + rand() * headW * 0.68;
    const y = headCY + headH * 0.05 + rand() * headH * 0.3;
    ctx.globalAlpha = 0.16 + rand() * 0.2;
    ctx.fillStyle = '#6e3418';
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rand() * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // sheen differs per zone: forehead broad, nose bright, cheek soft
  plane = steppedRadial(ctx, cx - headW * 0.04, headTop + headH * 0.14, 1, cx - headW * 0.04, headTop + headH * 0.14, headW * 0.3, ['rgba(255,235,200,0.34)', 'rgba(255,235,200,0)'], 12);
  ctx.fillStyle = plane;
  ctx.fillRect(cx - headW * 0.4, headTop, headW * 0.8, headH * 0.35);
  plane = steppedRadial(ctx, noseX, noseTip - headH * 0.04, 1, noseX, noseTip - headH * 0.04, headW * 0.07, ['rgba(255,240,210,0.55)', 'rgba(255,240,210,0)'], 10);
  ctx.fillStyle = plane;
  ctx.fillRect(noseX - headW * 0.08, noseTop, headW * 0.16, headH * 0.3);
  ctx.restore(); // unclip head

  // ----- sunglasses: reflective lenses with a mirrored sunset -----
  const lensY = headTop + headH * 0.4;
  const lensW = headW * 0.34;
  const lensH = headH * 0.17;
  for (const side of [-1, 1]) {
    const lx = cx + side * headW * 0.21 - lensW / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lx + lensW * 0.06, lensY);
    ctx.lineTo(lx + lensW * 0.94, lensY + lensH * 0.06);
    ctx.quadraticCurveTo(lx + lensW, lensY + lensH * 0.6, lx + lensW * 0.78, lensY + lensH);
    ctx.lineTo(lx + lensW * 0.2, lensY + lensH * 0.96);
    ctx.quadraticCurveTo(lx, lensY + lensH * 0.5, lx + lensW * 0.06, lensY);
    ctx.closePath();
    ctx.clip();
    const refl = steppedGradient(ctx, 0, lensY, 0, lensY + lensH, ['#ffe9a8', '#ff9a5e', '#c94a7d', '#3a2a6e'], 20);
    ctx.fillStyle = refl;
    ctx.fillRect(lx, lensY, lensW, lensH);
    // mirrored skyline and sun inside the lens
    ctx.fillStyle = 'rgba(30,10,40,0.85)';
    const base = lensY + lensH * 0.62;
    for (let b = 0; b < 6; b += 1) {
      const bw = lensW * (0.08 + rand() * 0.1);
      const bh = lensH * (0.14 + rand() * 0.3);
      ctx.fillRect(lx + lensW * 0.08 + b * lensW * 0.15, base - bh, bw, bh);
    }
    ctx.fillRect(lx, base, lensW, lensH * 0.06);
    ctx.fillStyle = 'rgba(255,246,210,0.95)';
    ctx.beginPath();
    ctx.arc(lx + lensW * 0.68, lensY + lensH * 0.34, lensW * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // diagonal glare streak
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(lx + lensW * 0.1, lensY + lensH);
    ctx.lineTo(lx + lensW * 0.5, lensY);
    ctx.lineTo(lx + lensW * 0.68, lensY);
    ctx.lineTo(lx + lensW * 0.28, lensY + lensH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    // frame
    ctx.strokeStyle = '#160a18';
    ctx.lineWidth = Math.max(2, h * 0.007);
    ctx.beginPath();
    ctx.moveTo(lx + lensW * 0.06, lensY);
    ctx.lineTo(lx + lensW * 0.94, lensY + lensH * 0.06);
    ctx.quadraticCurveTo(lx + lensW, lensY + lensH * 0.6, lx + lensW * 0.78, lensY + lensH);
    ctx.lineTo(lx + lensW * 0.2, lensY + lensH * 0.96);
    ctx.quadraticCurveTo(lx, lensY + lensH * 0.5, lx + lensW * 0.06, lensY);
    ctx.stroke();
    // thin frame shadow on the cheek
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#3a1408';
    ctx.fillRect(lx + lensW * 0.1, lensY + lensH + 2, lensW * 0.7, headH * 0.02);
    ctx.restore();
  }
  // bridge
  ctx.strokeStyle = '#160a18';
  ctx.lineWidth = Math.max(2, h * 0.008);
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.045, lensY + lensH * 0.12);
  ctx.quadraticCurveTo(cx, lensY - lensH * 0.06, cx + headW * 0.045, lensY + lensH * 0.12);
  ctx.stroke();

  // ----- hair: shaped mass, parting, thousands of strands, flyaways -----
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.53, headCY + headH * 0.05);
  ctx.bezierCurveTo(cx - headW * 0.56, headTop - headH * 0.1, cx - headW * 0.28, headTop - headH * 0.2, cx + headW * 0.02, headTop - headH * 0.19);
  ctx.bezierCurveTo(cx + headW * 0.34, headTop - headH * 0.18, cx + headW * 0.56, headTop - headH * 0.08, cx + headW * 0.53, headCY + headH * 0.02);
  ctx.bezierCurveTo(cx + headW * 0.5, headTop + headH * 0.1, cx + headW * 0.44, headTop + headH * 0.16, cx + headW * 0.4, headTop + headH * 0.2);
  ctx.bezierCurveTo(cx + headW * 0.2, headTop + headH * 0.05, cx + headW * 0.05, headTop + headH * 0.1, cx - headW * 0.08, headTop + headH * 0.14);
  ctx.bezierCurveTo(cx - headW * 0.24, headTop + headH * 0.18, cx - headW * 0.4, headTop + headH * 0.14, cx - headW * 0.47, headTop + headH * 0.24);
  ctx.bezierCurveTo(cx - headW * 0.52, headTop + headH * 0.16, cx - headW * 0.53, headCY - headH * 0.05, cx - headW * 0.53, headCY + headH * 0.05);
  ctx.closePath();
  const hairBase = steppedRadial(ctx, cx - headW * 0.15, headTop - headH * 0.05, 2, cx, headTop, headW * 0.8, ['#4a2c1a', '#2e1a10', '#180c06'], 20);
  ctx.fillStyle = hairBase;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // cast shadow of hair on the forehead
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = steppedGradient(ctx, 0, headTop + headH * 0.12, 0, headTop + headH * 0.26, ['rgba(10,4,2,0.9)', 'rgba(10,4,2,0)'], 10);
  ctx.fillRect(cx - headW * 0.5, headTop + headH * 0.1, headW, headH * 0.18);
  ctx.globalAlpha = 1;
  // strands following the head's curve, several tones
  const tones = ['#120a06', '#241408', '#3d2412', '#5e3a1e', '#7d5228'];
  for (let i = 0; i < 2400; i += 1) {
    const t = rand();
    const sx = cx - headW * 0.52 + t * headW * 1.04;
    const sy = headTop - headH * 0.16 + (rand() * 0.3) * headH * 0.3 + Math.sin(t * Math.PI) * -headH * 0.02;
    const len = headH * (0.1 + rand() * 0.22);
    const drift = (t - 0.42) * headW * 0.22;
    ctx.strokeStyle = tones[Math.floor(rand() * tones.length)];
    ctx.globalAlpha = 0.25 + rand() * 0.5;
    ctx.lineWidth = 0.7 + rand() * 0.9;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + drift * 0.4, sy + len * 0.55, sx + drift, sy + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // parting line
  ctx.strokeStyle = 'rgba(12,6,3,0.9)';
  ctx.lineWidth = Math.max(1.4, h * 0.004);
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.1, headTop - headH * 0.17);
  ctx.quadraticCurveTo(cx - headW * 0.02, headTop + headH * 0.02, cx - headW * 0.06, headTop + headH * 0.13);
  ctx.stroke();
  ctx.restore();
  // loose strands crossing the hairline, so the hair's lower edge is
  // irregular like real hair instead of one smooth cap curve
  ctx.save();
  for (let i = 0; i < 130; i += 1) {
    const t = rand();
    const sx = cx - headW * 0.46 + t * headW * 0.92;
    const sy = headTop + headH * (0.15 + Math.sin(t * Math.PI) * 0.04) + (rand() - 0.5) * headH * 0.02;
    const slant = (t - 0.45) * headW * 0.05 + (rand() - 0.5) * 5;
    ctx.strokeStyle = tones[Math.floor(rand() * tones.length)];
    ctx.globalAlpha = 0.18 + rand() * 0.3;
    ctx.lineWidth = 0.6 + rand() * 0.7;
    ctx.beginPath();
    ctx.moveTo(sx, sy - headH * 0.025);
    ctx.quadraticCurveTo(sx + slant * 0.4, sy + headH * 0.012, sx + slant, sy + headH * (0.02 + rand() * 0.028));
    ctx.stroke();
  }
  ctx.restore();
  // bright flyaway strands along the rim
  ctx.save();
  for (let i = 0; i < 80; i += 1) {
    const t = rand();
    const sx = cx - headW * 0.54 + t * headW * 0.5;
    const sy = headTop - headH * 0.12 + rand() * headH * 0.3;
    ctx.strokeStyle = rand() > 0.4 ? '#ffc98a' : '#e8a878';
    ctx.globalAlpha = 0.35 + rand() * 0.5;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - 6 - rand() * 10, sy - 4 - rand() * 8, sx - 10 - rand() * 16, sy + 2 + rand() * 8);
    ctx.stroke();
  }
  ctx.restore();
  // rim light along the sun side of face, hair and shoulder
  ctx.save();
  ctx.strokeStyle = '#ffd9a0';
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(1.6, h * 0.005);
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.5, headCY - headH * 0.05);
  ctx.bezierCurveTo(cx - headW * 0.47, headCY + headH * 0.28, cx - headW * 0.32, chinY - headH * 0.05, cx - headW * 0.18, chinY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - headW * 1.05, shoulderY - h * 0.06);
  ctx.quadraticCurveTo(cx - headW * 0.9, shoulderY + h * 0.02, cx - headW * 0.6, h * 0.99);
  ctx.stroke();
  ctx.restore();
  grainOverlay(ctx, w, h, field, 0.045, 0.5);
}

// ---------- (c) neon night street car ----------

export function drawCar(ctx, x, y, wdt, opt) {
  const { body = '#c22a4a', dark = '#5e1024', glass = ['#bfe8ff', '#3a7db8', '#14243d'] } = opt || {};
  const hgt = wdt * 0.34;
  const top = y - hgt;
  // ambient occlusion pooled under the body
  contactShadow(ctx, x + wdt * 0.5, y + hgt * 0.06, wdt * 0.52, hgt * 0.1, 0.65);
  // body: smooth curves, vertical shading gradient
  const bodyGrad = steppedGradient(ctx, 0, top, 0, y, [mixHex(body, '#ffffff', 0.3), body, mixHex(body, '#000000', 0.25), dark], 22);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(x + wdt * 0.02, y - hgt * 0.18);
  ctx.quadraticCurveTo(x + wdt * 0.04, top + hgt * 0.34, x + wdt * 0.2, top + hgt * 0.3);
  ctx.quadraticCurveTo(x + wdt * 0.3, top + hgt * 0.02, x + wdt * 0.46, top);
  ctx.lineTo(x + wdt * 0.68, top);
  ctx.quadraticCurveTo(x + wdt * 0.84, top + hgt * 0.04, x + wdt * 0.93, top + hgt * 0.3);
  ctx.quadraticCurveTo(x + wdt * 0.99, top + hgt * 0.36, x + wdt * 0.98, y - hgt * 0.16);
  ctx.quadraticCurveTo(x + wdt * 0.9, y - hgt * 0.04, x + wdt * 0.8, y - hgt * 0.03);
  ctx.lineTo(x + wdt * 0.2, y - hgt * 0.03);
  ctx.quadraticCurveTo(x + wdt * 0.06, y - hgt * 0.04, x + wdt * 0.02, y - hgt * 0.18);
  ctx.closePath();
  ctx.fill();
  // clearcoat highlight band
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = steppedGradient(ctx, 0, top + hgt * 0.2, 0, top + hgt * 0.44, ['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)'], 12);
  ctx.fillRect(x, top + hgt * 0.2, wdt, hgt * 0.24);
  ctx.restore();
  // glasshouse: reflected-sky gradients, pillars, interior hint
  const glassGrad = steppedGradient(ctx, x + wdt * 0.3, top, x + wdt * 0.34, top + hgt * 0.34, glass, 16);
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(x + wdt * 0.31, top + hgt * 0.3);
  ctx.quadraticCurveTo(x + wdt * 0.36, top + hgt * 0.06, x + wdt * 0.47, top + hgt * 0.04);
  ctx.lineTo(x + wdt * 0.66, top + hgt * 0.04);
  ctx.quadraticCurveTo(x + wdt * 0.8, top + hgt * 0.08, x + wdt * 0.86, top + hgt * 0.3);
  ctx.closePath();
  ctx.fill();
  // seat tops behind the glass
  ctx.fillStyle = 'rgba(16,10,20,0.75)';
  ctx.fillRect(x + wdt * 0.42, top + hgt * 0.17, wdt * 0.09, hgt * 0.13);
  ctx.fillRect(x + wdt * 0.6, top + hgt * 0.17, wdt * 0.09, hgt * 0.13);
  // centre pillar + diagonal glare
  ctx.fillStyle = 'rgba(10,6,14,0.9)';
  ctx.fillRect(x + wdt * 0.565, top + hgt * 0.03, wdt * 0.018, hgt * 0.28);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + wdt * 0.38, top + hgt * 0.3);
  ctx.lineTo(x + wdt * 0.56, top + hgt * 0.03);
  ctx.lineTo(x + wdt * 0.64, top + hgt * 0.03);
  ctx.lineTo(x + wdt * 0.46, top + hgt * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // panel gaps, door line, handle, mirror, badge
  ctx.strokeStyle = 'rgba(12,4,10,0.55)';
  ctx.lineWidth = Math.max(1, wdt * 0.0035);
  ctx.beginPath();
  ctx.moveTo(x + wdt * 0.58, top + hgt * 0.32);
  ctx.lineTo(x + wdt * 0.58, y - hgt * 0.05);
  ctx.moveTo(x + wdt * 0.2, top + hgt * 0.34);
  ctx.quadraticCurveTo(x + wdt * 0.5, top + hgt * 0.4, x + wdt * 0.93, top + hgt * 0.34);
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,240,250,0.8)';
  ctx.fillRect(x + wdt * 0.62, top + hgt * 0.42, wdt * 0.055, hgt * 0.045);
  ctx.beginPath();
  ctx.ellipse(x + wdt * 0.3, top + hgt * 0.3, wdt * 0.028, hgt * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = mixHex(body, '#000000', 0.2);
  ctx.fill();
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath();
  ctx.arc(x + wdt * 0.88, top + hgt * 0.52, wdt * 0.012, 0, Math.PI * 2);
  ctx.fill();
  // headlight and taillight blooms
  for (const [lx, col] of [[x + wdt * 0.955, '#ffeec2'], [x + wdt * 0.035, '#ff5a6e']]) {
    const g = steppedRadial(ctx, lx, top + hgt * 0.48, 0, lx, top + hgt * 0.48, wdt * 0.05, [col, 'rgba(255,255,255,0)'], 10);
    ctx.fillStyle = g;
    ctx.fillRect(lx - wdt * 0.05, top + hgt * 0.48 - wdt * 0.05, wdt * 0.1, wdt * 0.1);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(lx, top + hgt * 0.48, wdt * 0.014, hgt * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // wheels: dark arches, radial tyres, multi-spoke rims, bright hub
  for (const wx of [x + wdt * 0.21, x + wdt * 0.79]) {
    ctx.fillStyle = '#0a060c';
    ctx.beginPath();
    ctx.arc(wx, y - hgt * 0.04, wdt * 0.085, Math.PI, Math.PI * 2);
    ctx.fill();
    const tyre = steppedRadial(ctx, wx - wdt * 0.015, y - hgt * 0.1, 1, wx, y - hgt * 0.04, wdt * 0.072, ['#3d3d46', '#17171d', '#060608'], 14);
    ctx.fillStyle = tyre;
    ctx.beginPath();
    ctx.arc(wx, y - hgt * 0.04, wdt * 0.068, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,200,215,0.25)';
    ctx.lineWidth = 1;
    for (let s = 0; s < 10; s += 1) {
      const a = (s / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(a) * wdt * 0.055, y - hgt * 0.04 + Math.sin(a) * wdt * 0.055);
      ctx.lineTo(wx + Math.cos(a) * wdt * 0.066, y - hgt * 0.04 + Math.sin(a) * wdt * 0.066);
      ctx.stroke();
    }
    ctx.fillStyle = '#9aa2b5';
    ctx.beginPath();
    ctx.arc(wx, y - hgt * 0.04, wdt * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#454c5e';
    ctx.lineWidth = Math.max(1.4, wdt * 0.006);
    for (let s = 0; s < 6; s += 1) {
      const a = (s / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(wx, y - hgt * 0.04);
      ctx.lineTo(wx + Math.cos(a) * wdt * 0.038, y - hgt * 0.04 + Math.sin(a) * wdt * 0.038);
      ctx.stroke();
    }
    ctx.fillStyle = '#e8ecf5';
    ctx.beginPath();
    ctx.arc(wx, y - hgt * 0.04, wdt * 0.011, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintNeonCar(ctx, w, h, seed) {
  const field = new NoiseField(seed + 53);
  const rand = mulberry32(seed + 91);
  // night sky and skyline
  ctx.fillStyle = steppedGradient(ctx, 0, 0, 0, h * 0.7, ['#070418', '#1d0f3d', '#3d1660', '#6e1d5e'], 26);
  ctx.fillRect(0, 0, w, h * 0.7);
  for (let b = 0; b < 26; b += 1) {
    const bw = w * (0.03 + rand() * 0.05);
    const bh = h * (0.18 + rand() * 0.34);
    const bx = rand() * w;
    ctx.fillStyle = '#0c0618';
    ctx.fillRect(bx, h * 0.68 - bh, bw, bh);
    for (let wn = 0; wn < 22; wn += 1) {
      if (rand() > 0.45) continue;
      ctx.fillStyle = rand() > 0.3 ? 'rgba(255,205,120,0.9)' : 'rgba(140,230,255,0.9)';
      ctx.fillRect(bx + rand() * (bw - 3), h * 0.68 - bh + rand() * (bh - 4), 2.4, 3.2);
    }
  }
  // neon signs
  const signs = [['#ff2e88', 0.1], ['#22d8ee', 0.3], ['#ffb02e', 0.55], ['#b45eff', 0.78], ['#ff5a3c', 0.92]];
  for (const [col, fx] of signs) {
    const sx = w * fx;
    const sy = h * (0.2 + rand() * 0.2);
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.fillStyle = col;
    ctx.fillRect(sx, sy, w * 0.035, h * 0.16);
    ctx.restore();
  }
  // wet asphalt
  ctx.fillStyle = steppedGradient(ctx, 0, h * 0.68, 0, h, ['#241233', '#150a24', '#08040f'], 18);
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  // the car, then its mirrored, smeared, rippled reflection
  const carW = w * 0.78;
  const carX = w * 0.11;
  const carY = h * 0.86;
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.floor(w));
  off.height = Math.max(2, Math.floor(h * 0.4));
  const octx = off.getContext('2d');
  drawCar(octx, carX, h * 0.36, carW, { body: '#c22a4a', dark: '#4a0d20', glass: ['#ffe9f6', '#b45eff', '#1d0f3d'] });
  ctx.drawImage(off, 0, h * 0.5);
  // reflection: the car layer flipped at its ground line, drawn in thin
  // horizontal strips that drift sideways with a sine ripple driven by
  // the noise field, fading as they stretch down the wet asphalt
  ctx.save();
  const stripH = 3;
  const groundLocal = h * 0.36;
  for (let s = 0; s < h * 0.13; s += stripH) {
    const srcY = groundLocal - s - stripH;
    if (srcY < 0) break;
    const ripple = Math.sin(s * 0.24 + field.fbm(s * 0.05, 3, 2) * 7) * (1.2 + s * 0.03);
    ctx.globalAlpha = 0.52 * (1 - s / (h * 0.16));
    ctx.drawImage(off, 0, srcY, w, stripH, ripple, carY + s * 0.92, w, stripH);
  }
  ctx.restore();
  // smeared neon reflections on the wet ground
  ctx.save();
  ctx.globalAlpha = 0.4;
  for (const [col, fx] of signs) {
    const g = steppedGradient(ctx, 0, h * 0.7, 0, h, [col, 'rgba(0,0,0,0)'], 12);
    ctx.fillStyle = g;
    ctx.fillRect(w * fx - w * 0.012, h * 0.7, w * 0.06, h * 0.3);
  }
  ctx.restore();
  // steam haze
  clouds(ctx, w, h, field, seed + 5, '#8d7db8', h * 0.55, h * 0.2, 8, 0.2);
  const walker = mulberry32(seed + 3);
  void walker;
  drawFigure(ctx, w * 0.9, h * 0.8, h * 0.2, { skin: '#9a6242', hair: '#0e0a08', top: '#3d1660', bottom: '#14101f', rim: '#ff2e88', pose: 1 });
  grainOverlay(ctx, w, h, field, 0.06, 0.5);
}

// ---------- (d) aerial coast, land first ----------

function paintAerial(ctx, w, h, seed) {
  const field = new NoiseField(seed + 71);
  const rand = mulberry32(seed + 113);
  // rich turquoise water base
  ctx.fillStyle = steppedGradient(ctx, 0, 0, w, h, ['#0e6e8d', '#129aba', '#1db8c9', '#0e8d9a'], 26);
  ctx.fillRect(0, 0, w, h);
  // shallow-sand patches and sparkle
  for (let i = 0; i < 40; i += 1) {
    const x = rand() * w * 0.7;
    const y = rand() * h;
    const r = w * (0.04 + rand() * 0.12);
    const g = steppedRadial(ctx, x, y, 0, x, y, r, ['rgba(140,230,190,0.35)', 'rgba(140,230,190,0)'], 10);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.save();
  for (let i = 0; i < 1600; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const n = field.fbm(x * 0.03, y * 0.03, 3);
    ctx.globalAlpha = 0.08 + n * 0.4;
    ctx.fillStyle = '#dffaff';
    ctx.fillRect(x, y, 1.6, 1);
  }
  ctx.restore();
  // landmass: curving coast from top-right to bottom-left
  ctx.beginPath();
  ctx.moveTo(w * 0.52, 0);
  ctx.bezierCurveTo(w * 0.6, h * 0.2, w * 0.44, h * 0.38, w * 0.5, h * 0.58);
  ctx.bezierCurveTo(w * 0.55, h * 0.76, w * 0.72, h * 0.86, w, h * 0.92);
  ctx.lineTo(w, 0);
  ctx.closePath();
  const land = steppedGradient(ctx, w * 0.4, 0, w, h, ['#4e7d33', '#6e9a44', '#94ad54', '#5e8a3a'], 22);
  ctx.fillStyle = land;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // land texture: foliage noise at several scales
  for (let i = 0; i < 5200; i += 1) {
    const x = w * 0.42 + rand() * w * 0.58;
    const y = rand() * h;
    const n = field.fbm(x * 0.05, y * 0.05, 3);
    ctx.globalAlpha = 0.06 + n * 0.2;
    ctx.fillStyle = rand() > 0.5 ? '#3d6e2a' : '#e8d98a';
    ctx.fillRect(x, y, 2.4, 2.4);
  }
  // beach blocks and rooftops with warm roofs
  for (let i = 0; i < 90; i += 1) {
    const x = w * 0.58 + rand() * w * 0.4;
    const y = rand() * h * 0.9;
    const bw = w * (0.02 + rand() * 0.035);
    const bh = bw * (0.6 + rand() * 0.6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.7);
    ctx.fillStyle = 'rgba(40,40,20,0.3)';
    ctx.fillRect(-bw / 2 + 2, -bh / 2 + 3, bw, bh);
    ctx.fillStyle = ['#e8e0cc', '#dccfb2', '#f2e8d4'][Math.floor(rand() * 3)];
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = ['#c96a3a', '#b8542e', '#d98a4a'][Math.floor(rand() * 3)];
    ctx.beginPath();
    ctx.moveTo(-bw / 2, -bh / 2);
    ctx.lineTo(0, -bh / 2 - bh * 0.4);
    ctx.lineTo(bw / 2, -bh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // sand band along the shore
  ctx.beginPath();
  ctx.moveTo(w * 0.52, 0);
  ctx.bezierCurveTo(w * 0.6, h * 0.2, w * 0.44, h * 0.38, w * 0.5, h * 0.58);
  ctx.bezierCurveTo(w * 0.55, h * 0.76, w * 0.72, h * 0.86, w, h * 0.92);
  ctx.bezierCurveTo(w * 0.7, h * 0.84, w * 0.52, h * 0.74, w * 0.46, h * 0.56);
  ctx.bezierCurveTo(w * 0.4, h * 0.36, w * 0.56, h * 0.18, w * 0.48, 0);
  ctx.closePath();
  ctx.fillStyle = steppedGradient(ctx, w * 0.4, 0, w * 0.8, h, ['#f2dd9e', '#e8c87e', '#d9b264'], 16);
  ctx.fill();
  // dense umbrella and crowd texture on the sand
  for (let i = 0; i < 240; i += 1) {
    const t = rand();
    const x = w * (0.47 + t * 0.45) + (rand() - 0.5) * w * 0.06;
    const y = t * h * 0.88 + rand() * h * 0.04;
    ctx.fillStyle = ['#e83a5e', '#ffb02e', '#22b8d8', '#f2f2f2', '#7d4ae8'][Math.floor(rand() * 5)];
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + rand() * 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (rand() > 0.5) {
      ctx.fillStyle = 'rgba(90,50,30,0.8)';
      ctx.fillRect(x + 2, y + 1, 1.6, 1.6);
    }
  }
  // foam line where the water meets the sand, broken by noise
  ctx.save();
  ctx.strokeStyle = 'rgba(245,255,252,0.8)';
  ctx.lineWidth = 2;
  for (let s = 0; s < 26; s += 1) {
    const t = s / 26;
    const fx = lerp(w * 0.5, w * 0.86, t) + Math.sin(t * 11) * w * 0.05;
    const fy = t * h * 0.9 + field.fbm(t * 9, 4, 2) * 8;
    ctx.globalAlpha = 0.25 + field.fbm(t * 14, 8, 2) * 0.6;
    ctx.beginPath();
    ctx.arc(fx, fy, 3 + field.fbm(t * 20, 2, 2) * 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // shoreline road with tiny shaded cars
  ctx.strokeStyle = '#3d3d46';
  ctx.lineWidth = w * 0.016;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.56, -4);
  ctx.bezierCurveTo(w * 0.64, h * 0.2, w * 0.48, h * 0.38, w * 0.54, h * 0.58);
  ctx.bezierCurveTo(w * 0.59, h * 0.76, w * 0.76, h * 0.86, w + 4, h * 0.93);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,190,0.75)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([7, 9]);
  ctx.beginPath();
  ctx.moveTo(w * 0.56, -4);
  ctx.bezierCurveTo(w * 0.64, h * 0.2, w * 0.48, h * 0.38, w * 0.54, h * 0.58);
  ctx.bezierCurveTo(w * 0.59, h * 0.76, w * 0.76, h * 0.86, w + 4, h * 0.93);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 12; i += 1) {
    const t = rand();
    const x = w * (0.56 + t * 0.42) + Math.sin(t * 9) * w * 0.05;
    const y = t * h * 0.9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.5 + t * 0.5);
    ctx.fillStyle = 'rgba(20,20,26,0.4)';
    ctx.fillRect(-4, -1.6, 9, 4.4);
    ctx.fillStyle = ['#e83a3a', '#f2f2f2', '#2a6ec9', '#ffb02e'][Math.floor(rand() * 4)];
    ctx.fillRect(-4.5, -2.2, 9, 4);
    ctx.fillStyle = 'rgba(180,230,255,0.9)';
    ctx.fillRect(0.4, -1.6, 2.6, 2.8);
    ctx.restore();
  }
  // two boats with foaming wakes
  for (const [bx, by, s] of [[w * 0.2, h * 0.3, 1], [w * 0.32, h * 0.68, 0.7]]) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(240,255,255,0.75)';
    ctx.lineWidth = 2.4;
    for (let wk = 0; wk < 3; wk += 1) {
      ctx.globalAlpha = 0.6 - wk * 0.18;
      ctx.beginPath();
      ctx.moveTo(-6, 2 + wk * 2);
      ctx.quadraticCurveTo(-w * 0.09, 8 + wk * 7, -w * 0.17, 3 + wk * 11);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f2f4f6';
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(11, -2);
    ctx.lineTo(7, 4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c22a4a';
    ctx.fillRect(-3, -5, 7, 3.4);
    ctx.restore();
  }
  grainOverlay(ctx, w, h, field, 0.04, 0.4);
}

// ---------- (e) blue-hour skyline across water ----------

function paintSkyline(ctx, w, h, seed) {
  const field = new NoiseField(seed + 97);
  const rand = mulberry32(seed + 131);
  sky(ctx, w, h, ['#0e1d4a', '#274a8d', '#4a6eb8', '#7d94c9', '#c9a87d'], 0.6);
  clouds(ctx, w, h, field, seed + 9, '#5e7db8', h * 0.03, h * 0.2, 8, 0.4);
  // tower silhouettes with hundreds of lit windows
  let bx = -w * 0.02;
  const tops = [];
  while (bx < w * 1.02) {
    const bw = w * (0.05 + rand() * 0.08);
    const bh = h * (0.3 + rand() * 0.3);
    const top = h * 0.62 - bh;
    tops.push([bx, top, bw]);
    const tower = steppedGradient(ctx, bx, top, bx + bw, top, ['#1a2a52', '#101c3a', '#0a1226'], 12);
    ctx.fillStyle = tower;
    ctx.fillRect(bx, top, bw, bh);
    const cols = Math.max(2, Math.floor(bw / 7));
    const rows = Math.max(4, Math.floor(bh / 9));
    for (let cxI = 0; cxI < cols; cxI += 1) {
      for (let cyI = 0; cyI < rows; cyI += 1) {
        if (rand() > 0.52) continue;
        const warm = rand() > 0.25;
        ctx.fillStyle = warm ? `rgba(255,${195 + Math.floor(rand() * 40)},120,${0.5 + rand() * 0.5})` : `rgba(170,225,255,${0.5 + rand() * 0.5})`;
        ctx.fillRect(bx + 3 + cxI * 7, top + 4 + cyI * 9, 3.4, 4.6);
      }
    }
    // soft bloom over the brightest cluster
    if (rand() > 0.55) {
      const g = steppedRadial(ctx, bx + bw / 2, top + bh * 0.4, 0, bx + bw / 2, top + bh * 0.4, bw * 0.9, ['rgba(255,210,130,0.20)', 'rgba(255,210,130,0)'], 10);
      ctx.fillStyle = g;
      ctx.fillRect(bx - bw * 0.4, top, bw * 1.8, bh);
    }
    bx += bw + w * 0.008;
  }
  // water with shimmering broken reflections
  ctx.fillStyle = steppedGradient(ctx, 0, h * 0.62, 0, h, ['#16294f', '#0e1d3a', '#060d1f'], 18);
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  for (let i = 0; i < 1500; i += 1) {
    const x = rand() * w;
    const y = h * 0.62 + Math.pow(rand(), 1.4) * h * 0.36;
    const n = field.fbm(x * 0.02, y * 0.06, 2);
    ctx.globalAlpha = 0.1 + n * 0.5;
    ctx.fillStyle = rand() > 0.3 ? '#ffd98a' : '#9ad8ff';
    ctx.fillRect(x, y, 2 + rand() * (4 + (y - h * 0.62) * 0.06), 1.3);
  }
  ctx.globalAlpha = 1;
  grainOverlay(ctx, w, h, field, 0.05, 0.5);
}

// ---------- (f) golden-hour coastal road ----------

function paintGoldenRoad(ctx, w, h, seed) {
  const field = new NoiseField(seed + 113);
  const rand = mulberry32(seed + 149);
  sky(ctx, w, h, ['#7d3a6e', '#c9544a', '#f2823c', '#ffb02e', '#ffe08a'], 0.52);
  clouds(ctx, w, h, field, seed + 11, '#ffb98a', h * 0.04, h * 0.26, 10, 0.5);
  sunDisc(ctx, w * 0.3, h * 0.44, w * 0.04, '#fff3cf', '#ff9a3c');
  // sea strip left, land right
  ctx.fillStyle = steppedGradient(ctx, 0, h * 0.52, 0, h * 0.66, ['#f2823c', '#c9546e', '#7d3a6e'], 16);
  ctx.fillRect(0, h * 0.52, w * 0.4, h * 0.14);
  ctx.fillStyle = steppedGradient(ctx, 0, h * 0.52, 0, h, ['#8d6a34', '#6e5226', '#4a3a1a'], 16);
  ctx.fillRect(w * 0.4, h * 0.52, w * 0.6, h * 0.48);
  ctx.fillRect(0, h * 0.66, w * 0.4, h * 0.34);
  // road sweeping to the horizon with perspective
  ctx.fillStyle = steppedGradient(ctx, w * 0.55, h * 0.54, w * 0.2, h, ['#5e4a3a', '#3d3230', '#241d20'], 16);
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.54);
  ctx.lineTo(w * 0.6, h * 0.54);
  ctx.lineTo(w * 0.98, h);
  ctx.lineTo(w * 0.08, h);
  ctx.closePath();
  ctx.fill();
  // centre dashes converging
  ctx.fillStyle = 'rgba(255,230,160,0.85)';
  for (let i = 0; i < 7; i += 1) {
    const t = i / 7;
    const y0 = lerp(h * 0.56, h * 0.99, Math.pow(t, 1.6));
    const y1 = y0 + lerp(2, 26, Math.pow(t, 1.6));
    const cxr = lerp(w * 0.56, w * 0.53, t);
    const dw = lerp(1.4, 9, Math.pow(t, 1.6));
    ctx.fillRect(cxr - dw / 2, y0, dw, y1 - y0);
  }
  // guardrail posts receding
  for (let i = 0; i < 9; i += 1) {
    const t = i / 9;
    const y = lerp(h * 0.55, h * 0.98, Math.pow(t, 1.5));
    const x = lerp(w * 0.615, w * 0.99, Math.pow(t, 1.5));
    const ph = lerp(3, 30, Math.pow(t, 1.5));
    ctx.fillStyle = '#2a2226';
    ctx.fillRect(x, y - ph, Math.max(1.2, ph * 0.14), ph);
    ctx.fillStyle = 'rgba(255,200,130,0.7)';
    ctx.fillRect(x, y - ph, Math.max(1.2, ph * 0.14), ph * 0.2);
  }
  // heat shimmer band above the road
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffe9bb';
  ctx.fillRect(w * 0.1, h * 0.5, w * 0.85, h * 0.03);
  ctx.restore();
  // the small shaded car, long shadow ahead of it
  ctx.save();
  ctx.translate(w * 0.56, h * 0.78);
  ctx.fillStyle = 'rgba(20,8,10,0.4)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.1, h * 0.1, w * 0.16, h * 0.014, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawCar(ctx, w * 0.42, h * 0.8, w * 0.3, { body: '#e8e4da', dark: '#6e6a5e', glass: ['#ffe9bb', '#f2823c', '#4a2a4a'] });
  palmFronds(ctx, w * 0.86, h * 0.72, h * 0.3, '#33241a', '#ffb02e', rand);
  grainOverlay(ctx, w, h, field, 0.05, 0.5);
}

export const SCENE_PAINTERS = {
  dawn: { name: 'Dawn Beach', paint: paintDawnBeach },
  portrait: { name: 'Sunset Portrait', paint: paintPortrait },
  neon: { name: 'Neon Night Car', paint: paintNeonCar },
  aerial: { name: 'Aerial Coast', paint: paintAerial },
  skyline: { name: 'Blue-Hour Skyline', paint: paintSkyline },
  golden: { name: 'Golden Road', paint: paintGoldenRoad },
};

export const SCENE_ORDER = ['portrait', 'dawn', 'neon', 'aerial', 'skyline', 'golden'];
