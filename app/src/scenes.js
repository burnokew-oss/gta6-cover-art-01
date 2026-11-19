// scenes.js — six original procedural scenes, each with its own sky and light.
// Round 7 pushes every scene toward a photograph: form is modelled from many
// small tonal steps, texture lives at the smallest scale, one warm key light
// rules each scene, and every foot, wheel and hull gets a contact shadow.

import { NoiseField, mulberry, clamp, lerp, mixHex, rgba, vGrad, blob, speckle } from './noise.js';

const TAU = Math.PI * 2;

function sky(ctx, w, h, stops) { vGrad(ctx, 0, 0, w, h, stops); }

function sunDisc(ctx, x, y, r, core, halo) {
  blob(ctx, x, y, r * 4.2, halo, 0.55);
  blob(ctx, x, y, r * 1.9, halo, 0.5);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#fffdf4'); g.addColorStop(0.55, core); g.addColorStop(1, rgba(core, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// Clouds as layered noise-shaped soft masses, never hard ellipses alone.
function clouds(ctx, rand, noise, w, horizonY, tint, shadow, count, scale = 1) {
  for (let i = 0; i < count; i++) {
    const cx = rand() * w, cy = rand() * horizonY * 0.92;
    const cw = (40 + rand() * 130) * scale, ch = cw * (0.2 + rand() * 0.12);
    for (let b = 0; b < 9; b++) {
      const bx = cx + (rand() - 0.5) * cw, by = cy + (rand() - 0.5) * ch;
      const br = cw * (0.16 + rand() * 0.2) * (0.6 + noise.fbm(bx * 0.02, by * 0.02, 3) * 0.7);
      blob(ctx, bx, by + br * 0.28, br, shadow, 0.16);
      blob(ctx, bx, by, br, tint, 0.34);
    }
  }
}

function seaSparkle(ctx, rand, x, y, w, h, color, count) {
  for (let i = 0; i < count; i++) {
    const px = x + rand() * w, py = y + rand() * h;
    const len = 2 + rand() * 9 * ((py - y) / h + 0.3);
    ctx.strokeStyle = rgba(color, 0.25 + rand() * 0.55);
    ctx.lineWidth = 1 + rand() * 1.4;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + len, py); ctx.stroke();
  }
}

// A palm built frond by frond: each frond is an arc carrying many tapered
// leaflets, so the silhouette breaks up like a real crown against the sky.
export function palm(ctx, rand, x, baseY, height, lean, dark, lit) {
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(2, height * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * 0.3, baseY - height * 0.6, x + lean, baseY - height);
  ctx.stroke();
  // trunk ring shading
  ctx.strokeStyle = rgba(lit, 0.35);
  ctx.lineWidth = Math.max(1, height * 0.012);
  for (let i = 1; i < 7; i++) {
    const t = i / 7, ty = baseY - height * t;
    ctx.beginPath(); ctx.moveTo(x + lean * 0.3 * t - height * 0.02, ty); ctx.lineTo(x + lean * 0.3 * t + height * 0.02, ty - 2); ctx.stroke();
  }
  const topX = x + lean, topY = baseY - height;
  const fronds = 11;
  for (let f = 0; f < fronds; f++) {
    const ang = -Math.PI * (0.08 + (f / (fronds - 1)) * 0.84) + (rand() - 0.5) * 0.14;
    const len = height * (0.34 + rand() * 0.16);
    const ex = topX + Math.cos(ang) * len, ey = topY + Math.sin(ang) * len * 0.55 + len * 0.22;
    const mx = topX + Math.cos(ang) * len * 0.5, my = topY + Math.sin(ang) * len * 0.4 - len * 0.1;
    const leaflets = 15;
    for (let l = 1; l <= leaflets; l++) {
      const t = l / leaflets;
      const px = lerp(lerp(topX, mx, t), lerp(mx, ex, t), t);
      const py = lerp(lerp(topY, my, t), lerp(my, ey, t), t);
      const droop = 6 + t * height * 0.07;
      ctx.strokeStyle = rgba(l % 3 ? dark : lit, 0.75);
      ctx.lineWidth = Math.max(0.7, height * 0.006 * (1 - t * 0.5));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (px - topX) * 0.06, py + droop);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(dark, 0.9);
    ctx.lineWidth = Math.max(1, height * 0.008);
    ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  }
}

// A whole small person: shaded head with hair, clothed torso, arms and legs
// with real width, shoes, and a soft contact shadow pooled at the feet.
// Simplified by haze when distant — anatomy is never removed.
export function figure(ctx, rand, x, groundY, hgt, opt = {}) {
  const skin = opt.skin || '#b5764a';
  const shirt = opt.shirt || '#e8e3d8';
  const pants = opt.pants || '#33566b';
  const hairC = opt.hair || '#2c1c12';
  const rim = opt.rim || '#ffd9a0';
  const walk = opt.walk || 0;
  blob(ctx, x, groundY, hgt * 0.16, '#1c1410', 0.34); // contact shadow
  const headR = hgt * 0.072;
  const hipY = groundY - hgt * 0.52, shY = groundY - hgt * 0.86;
  const cx = x;
  ctx.lineCap = 'round';
  // legs (trousers, real width, a stride offset when walking)
  ctx.strokeStyle = pants; ctx.lineWidth = hgt * 0.052;
  ctx.beginPath(); ctx.moveTo(cx - hgt * 0.03, hipY); ctx.lineTo(cx - hgt * 0.045 + walk * hgt * 0.05, groundY - hgt * 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + hgt * 0.03, hipY); ctx.lineTo(cx + hgt * 0.05 - walk * hgt * 0.05, groundY - hgt * 0.02); ctx.stroke();
  // shoes
  ctx.fillStyle = '#26221f';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * hgt * 0.048 + (s < 0 ? walk : -walk) * hgt * 0.05, groundY - hgt * 0.012, hgt * 0.035, hgt * 0.014, 0, 0, TAU);
    ctx.fill();
  }
  // torso in cloth: a tapered shape with fold shading
  const tw = hgt * 0.105;
  const tg = ctx.createLinearGradient(cx - tw, shY, cx + tw, shY);
  tg.addColorStop(0, mixHex(shirt, '#000000', 0.18)); tg.addColorStop(0.45, shirt); tg.addColorStop(1, mixHex(shirt, '#000000', 0.3));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(cx - tw * 0.82, shY);
  ctx.lineTo(cx + tw * 0.82, shY);
  ctx.lineTo(cx + tw * 0.62, hipY + hgt * 0.03);
  ctx.lineTo(cx - tw * 0.62, hipY + hgt * 0.03);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = Math.max(0.7, hgt * 0.006);
  for (let f = 0; f < 3; f++) {
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.4 + f * tw * 0.4, shY + hgt * 0.05);
    ctx.lineTo(cx - tw * 0.3 + f * tw * 0.36, hipY);
    ctx.stroke();
  }
  // arms: sleeve then forearm skin, hands as small ellipses
  ctx.strokeStyle = shirt; ctx.lineWidth = hgt * 0.04;
  for (const s of [-1, 1]) {
    const sw = s * walk * hgt * 0.04;
    ctx.beginPath(); ctx.moveTo(cx + s * tw * 0.8, shY + hgt * 0.03); ctx.lineTo(cx + s * tw * 1.05 + sw, shY + hgt * 0.2); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = hgt * 0.03;
    ctx.beginPath(); ctx.moveTo(cx + s * tw * 1.05 + sw, shY + hgt * 0.2); ctx.lineTo(cx + s * tw * 1.12 - sw, shY + hgt * 0.36); ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(cx + s * tw * 1.12 - sw, shY + hgt * 0.38, hgt * 0.016, hgt * 0.022, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = shirt;
  }
  // head: shaded sphere of skin planes + hair cap
  const hy = shY - headR * 1.15;
  const hg = ctx.createRadialGradient(cx - headR * 0.4, hy - headR * 0.4, headR * 0.2, cx, hy, headR * 1.25);
  hg.addColorStop(0, mixHex(skin, '#ffffff', 0.22)); hg.addColorStop(0.6, skin); hg.addColorStop(1, mixHex(skin, '#20100a', 0.35));
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(cx, hy, headR, 0, TAU); ctx.fill();
  ctx.fillStyle = hairC;
  ctx.beginPath(); ctx.arc(cx, hy - headR * 0.12, headR * 0.98, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  // rim light on the sun side
  ctx.strokeStyle = rgba(rim, 0.85); ctx.lineWidth = Math.max(1, hgt * 0.008);
  ctx.beginPath(); ctx.arc(cx, hy, headR * 0.96, -0.9, 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + tw * 0.82, shY); ctx.lineTo(cx + tw * 0.62, hipY); ctx.stroke();
}

// ---- the car -------------------------------------------------------------
// Drawn onto whatever context is passed, so the neon scene can render it once
// more into a small canvas and flip that copy into the wet road.
export function drawCar(ctx, rand, x, y, len, body = '#c22633', glassTint = '#9fd4e8') {
  const hgt = len * 0.30;
  const top = y - hgt;
  // ambient-occlusion pool under the body
  blob(ctx, x + len * 0.5, y + hgt * 0.05, len * 0.52, '#05070c', 0.5);
  ctx.fillStyle = 'rgba(4,6,10,0.55)';
  ctx.beginPath(); ctx.ellipse(x + len * 0.5, y + hgt * 0.03, len * 0.47, hgt * 0.13, 0, 0, TAU); ctx.fill();

  // glasshouse first: cabin, reflected-sky glass, pillars, hinted interior
  const cabX = x + len * 0.26, cabW = len * 0.44;
  ctx.fillStyle = '#14100e';
  ctx.beginPath();
  ctx.moveTo(cabX, y - hgt * 0.52);
  ctx.quadraticCurveTo(cabX + cabW * 0.1, top + hgt * 0.02, cabX + cabW * 0.34, top);
  ctx.lineTo(cabX + cabW * 0.78, top);
  ctx.quadraticCurveTo(cabX + cabW * 0.97, top + hgt * 0.1, cabX + cabW, y - hgt * 0.52);
  ctx.closePath(); ctx.fill();
  const gg = ctx.createLinearGradient(cabX, top, cabX + cabW * 0.4, y);
  gg.addColorStop(0, mixHex(glassTint, '#ffffff', 0.5));
  gg.addColorStop(0.45, glassTint);
  gg.addColorStop(1, mixHex(glassTint, '#1b2a3a', 0.55));
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.moveTo(cabX + len * 0.015, y - hgt * 0.55);
  ctx.quadraticCurveTo(cabX + cabW * 0.14, top + hgt * 0.1, cabX + cabW * 0.36, top + hgt * 0.07);
  ctx.lineTo(cabX + cabW * 0.5, top + hgt * 0.07);
  ctx.lineTo(cabX + cabW * 0.47, y - hgt * 0.55);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cabX + cabW * 0.53, top + hgt * 0.07);
  ctx.lineTo(cabX + cabW * 0.76, top + hgt * 0.07);
  ctx.quadraticCurveTo(cabX + cabW * 0.93, top + hgt * 0.14, cabX + cabW * 0.97, y - hgt * 0.55);
  ctx.lineTo(cabX + cabW * 0.53, y - hgt * 0.55);
  ctx.closePath(); ctx.fill();
  // seat tops and a head silhouette hinted behind the glass
  ctx.fillStyle = 'rgba(20,12,10,0.55)';
  ctx.fillRect(cabX + cabW * 0.18, y - hgt * 0.56, cabW * 0.16, hgt * 0.2);
  ctx.fillRect(cabX + cabW * 0.6, y - hgt * 0.56, cabW * 0.16, hgt * 0.2);
  // diagonal glare streak across the glass
  ctx.save();
  ctx.beginPath(); ctx.rect(cabX, top, cabW, hgt * 0.55); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(cabX + cabW * 0.2, top + hgt * 0.55); ctx.lineTo(cabX + cabW * 0.55, top);
  ctx.lineTo(cabX + cabW * 0.72, top); ctx.lineTo(cabX + cabW * 0.37, top + hgt * 0.55);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // body: one smooth curve, shaded vertically — dark rocker, bright shoulder
  const bg = ctx.createLinearGradient(0, top + hgt * 0.3, 0, y);
  bg.addColorStop(0, mixHex(body, '#ffffff', 0.28));
  bg.addColorStop(0.35, body);
  bg.addColorStop(0.75, mixHex(body, '#000000', 0.28));
  bg.addColorStop(1, mixHex(body, '#000000', 0.55));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x, y - hgt * 0.28);
  ctx.quadraticCurveTo(x + len * 0.01, y - hgt * 0.52, x + len * 0.1, y - hgt * 0.56);
  ctx.lineTo(x + len * 0.24, y - hgt * 0.58);
  ctx.lineTo(cabX + cabW, y - hgt * 0.58);
  ctx.quadraticCurveTo(x + len * 0.94, y - hgt * 0.56, x + len * 0.985, y - hgt * 0.42);
  ctx.quadraticCurveTo(x + len, y - hgt * 0.2, x + len * 0.97, y - hgt * 0.1);
  ctx.lineTo(x + len * 0.03, y - hgt * 0.08);
  ctx.quadraticCurveTo(x - len * 0.005, y - hgt * 0.16, x, y - hgt * 0.28);
  ctx.closePath(); ctx.fill();
  // clearcoat highlight band along the shoulder line
  ctx.strokeStyle = 'rgba(255,235,220,0.5)'; ctx.lineWidth = Math.max(1, hgt * 0.045);
  ctx.beginPath();
  ctx.moveTo(x + len * 0.03, y - hgt * 0.5);
  ctx.quadraticCurveTo(x + len * 0.5, y - hgt * 0.6, x + len * 0.96, y - hgt * 0.44);
  ctx.stroke();
  // panel seams, door line, handle, mirror, badge
  ctx.strokeStyle = 'rgba(10,4,4,0.5)'; ctx.lineWidth = Math.max(0.8, hgt * 0.016);
  ctx.beginPath(); ctx.moveTo(x + len * 0.52, y - hgt * 0.56); ctx.lineTo(x + len * 0.53, y - hgt * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + len * 0.13, y - hgt * 0.55); ctx.quadraticCurveTo(x + len * 0.12, y - hgt * 0.3, x + len * 0.13, y - hgt * 0.1); ctx.stroke();
  ctx.fillStyle = 'rgba(240,240,245,0.85)';
  ctx.fillRect(x + len * 0.44, y - hgt * 0.47, len * 0.05, hgt * 0.035);
  ctx.fillStyle = mixHex(body, '#000000', 0.25);
  ctx.beginPath(); ctx.ellipse(cabX - len * 0.005, y - hgt * 0.6, len * 0.02, hgt * 0.07, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f4d06f';
  ctx.beginPath(); ctx.arc(x + len * 0.86, y - hgt * 0.34, hgt * 0.045, 0, TAU); ctx.fill();
  // lights with bloom
  blob(ctx, x + len * 0.985, y - hgt * 0.36, hgt * 0.22, '#ffe9b0', 0.8);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.ellipse(x + len * 0.975, y - hgt * 0.36, len * 0.018, hgt * 0.05, 0, 0, TAU); ctx.fill();
  blob(ctx, x + len * 0.012, y - hgt * 0.38, hgt * 0.16, '#ff4d5e', 0.7);
  ctx.fillStyle = '#ff5a4e';
  ctx.fillRect(x + len * 0.004, y - hgt * 0.42, len * 0.014, hgt * 0.07);
  // wheel arches cut dark, then detailed wheels
  for (const wx of [x + len * 0.185, x + len * 0.815]) {
    ctx.fillStyle = '#07080a';
    ctx.beginPath(); ctx.arc(wx, y - hgt * 0.06, len * 0.085, Math.PI, TAU); ctx.fill();
    wheel(ctx, wx, y - hgt * 0.05, len * 0.072);
  }
}

function wheel(ctx, cx, cy, r) {
  const tg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
  tg.addColorStop(0, '#3a3d42'); tg.addColorStop(0.8, '#17181c'); tg.addColorStop(1, '#050506');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(200,205,215,0.25)'; ctx.lineWidth = Math.max(0.7, r * 0.05);
  for (let t = 0; t < 12; t++) {
    const a = (t / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    ctx.lineTo(cx + Math.cos(a + 0.2) * r * 0.97, cy + Math.sin(a + 0.2) * r * 0.97);
    ctx.stroke();
  }
  const rg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r * 0.55);
  rg.addColorStop(0, '#e8ecf2'); rg.addColorStop(0.6, '#9aa2ae'); rg.addColorStop(1, '#565d68');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.52, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2c3037';
  for (let s = 0; s < 5; s++) {
    const a = (s / 5) * TAU + 0.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - 0.22) * r * 0.5, cy + Math.sin(a - 0.22) * r * 0.5);
    ctx.lineTo(cx + Math.cos(a + 0.22) * r * 0.5, cy + Math.sin(a + 0.22) * r * 0.5);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#d7dce4';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.13, 0, TAU); ctx.fill();
}

// ---- (b) the hero portrait ------------------------------------------------
// A head-and-shoulders figure modelled from shaded planes: brow ridge, nose
// with its cast shadow, cheekbones in the key light, jaw shadow, ears set in
// the side plane — then pore noise, freckles, sweat sheen, stranded hair.
function portraitBay(ctx, w, h, rand, noise) {
  sky(ctx, w, h, [[0, '#3d1d5e'], [0.3, '#a02c6e'], [0.52, '#e5487c'], [0.68, '#ff8a5c'], [0.8, '#ffc46b'], [1, '#7a2d4d']]);
  sunDisc(ctx, w * 0.78, h * 0.6, w * 0.055, '#ffd9a0', '#ff9a5c');
  clouds(ctx, rand, noise, w, h * 0.62, '#ffb3c8', '#5e2350', 5, 1.1);
  // sea band and a hazy far shore behind the figure
  vGrad(ctx, 0, h * 0.66, w, h * 0.34, [[0, '#ff9e64'], [0.25, '#c94f6d'], [1, '#3d1d4e']]);
  seaSparkle(ctx, rand, 0, h * 0.68, w, h * 0.3, '#ffd9a0', 130);
  ctx.fillStyle = 'rgba(40,16,48,0.65)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.66);
  for (let x = 0; x <= w; x += w / 24) ctx.lineTo(x, h * 0.66 - 4 - noise.fbm(x * 0.02, 3.3, 3) * h * 0.03);
  ctx.lineTo(w, h * 0.7); ctx.lineTo(0, h * 0.7); ctx.closePath(); ctx.fill();
  // out-of-focus bokeh behind the head
  for (let i = 0; i < 26; i++) {
    const bx = rand() * w, by = rand() * h * 0.6, br = 6 + rand() * w * 0.05;
    blob(ctx, bx, by, br, rand() > 0.5 ? '#ffb37a' : '#ff7ab0', 0.10 + rand() * 0.12);
  }

  const cx = w * 0.5, headW = w * 0.44, headH = headW * 1.3;
  const headCY = h * 0.40, headTop = headCY - headH / 2;
  const skinL = '#e8a878', skin = '#cf8452', skinS = '#8a4f30';

  // neck, with the jaw's shadow falling across it
  const neckW = headW * 0.34;
  const ng = ctx.createLinearGradient(cx, headCY + headH * 0.32, cx, h * 0.86);
  ng.addColorStop(0, skinS); ng.addColorStop(0.35, mixHex(skin, skinS, 0.4)); ng.addColorStop(1, skin);
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(cx - neckW / 2, headCY + headH * 0.3);
  ctx.lineTo(cx + neckW / 2, headCY + headH * 0.3);
  ctx.lineTo(cx + neckW * 0.62, h * 0.88);
  ctx.lineTo(cx - neckW * 0.62, h * 0.88);
  ctx.closePath(); ctx.fill();
  blob(ctx, cx, headCY + headH * 0.36, neckW * 0.62, '#5e3018', 0.4); // jaw shadow on neck

  // shoulders and garment: a textured open shirt over a dark tee
  const shY = h * 0.845;
  ctx.fillStyle = '#20242c';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.46, h);
  ctx.quadraticCurveTo(cx - w * 0.44, shY, cx - neckW * 0.7, shY - h * 0.015);
  ctx.lineTo(cx + neckW * 0.7, shY - h * 0.015);
  ctx.quadraticCurveTo(cx + w * 0.44, shY, cx + w * 0.46, h);
  ctx.closePath(); ctx.fill();
  // shirt panels in a warm ivory weave, collar opening to the tee
  for (const s of [-1, 1]) {
    const pg = ctx.createLinearGradient(cx + s * w * 0.4, shY, cx, h);
    pg.addColorStop(0, '#efe6d4'); pg.addColorStop(1, '#c9b696');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(cx + s * neckW * 0.55, shY - h * 0.01);
    ctx.lineTo(cx + s * w * 0.455, h);
    ctx.lineTo(cx + s * w * 0.13, h);
    ctx.lineTo(cx + s * neckW * 0.18, shY + h * 0.06);
    ctx.closePath(); ctx.fill();
  }
  // weave noise + fold shading on the garment
  ctx.save();
  ctx.beginPath(); ctx.rect(0, shY - h * 0.03, w, h - shY + h * 0.03); ctx.clip();
  speckle(ctx, rand, 0, shY, w, h - shY, 1500, ['#8a7a5c', '#ffffff', '#5e5340'], 1.1, 0.14);
  ctx.strokeStyle = 'rgba(90,70,50,0.35)'; ctx.lineWidth = Math.max(1, w * 0.004);
  for (let f = 0; f < 6; f++) {
    ctx.beginPath();
    ctx.moveTo(cx + (f - 2.5) * w * 0.09, shY + h * 0.01);
    ctx.quadraticCurveTo(cx + (f - 2.5) * w * 0.1, h * 0.93, cx + (f - 2.5) * w * 0.13, h);
    ctx.stroke();
  }
  ctx.restore();
  // a thin gold chain catching the light
  ctx.strokeStyle = '#e8b64c'; ctx.lineWidth = Math.max(1.2, w * 0.006);
  ctx.beginPath(); ctx.moveTo(cx - neckW * 0.3, shY - h * 0.005); ctx.quadraticCurveTo(cx, shY + h * 0.055, cx + neckW * 0.3, shY - h * 0.005); ctx.stroke();

  // ---- head, clipped so every plane and speck stays inside the face
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, headCY, headW / 2, headH / 2, 0, 0, TAU);
  ctx.clip();
  const base = ctx.createLinearGradient(cx - headW / 2, headTop, cx + headW / 2, headCY + headH / 2);
  base.addColorStop(0, skinL); base.addColorStop(0.5, skin); base.addColorStop(1, skinS);
  ctx.fillStyle = base;
  ctx.fillRect(cx - headW / 2, headTop, headW, headH);
  // large soft planes, stacked in small tonal steps
  blob(ctx, cx - headW * 0.1, headTop + headH * 0.16, headW * 0.42, '#f4c08a', 0.5);  // forehead key light
  blob(ctx, cx + headW * 0.3, headCY + headH * 0.1, headW * 0.4, '#7a4023', 0.58);   // cool shadow side
  blob(ctx, cx - headW * 0.27, headCY + headH * 0.1, headW * 0.2, '#f0b57e', 0.7); // left cheekbone
  blob(ctx, cx + headW * 0.24, headCY + headH * 0.12, headW * 0.16, '#e8a878', 0.45); // right cheek
  blob(ctx, cx, headCY + headH * 0.42, headW * 0.3, '#6e3a1e', 0.58);               // jaw shadow
  blob(ctx, cx, headCY + headH * 0.34, headW * 0.14, '#e8a878', 0.5);              // chin light
  // the jaw is modelled with tone, not a line: a deep soft shadow pooled
  // under the chin, and the side plane of the face turned away from the key
  blob(ctx, cx + headW * 0.05, headCY + headH * 0.47, headW * 0.26, '#5e3018', 0.5);
  blob(ctx, cx + headW * 0.42, headCY + headH * 0.05, headW * 0.17, '#6e3a1e', 0.45);
  blob(ctx, cx - headW * 0.43, headCY + headH * 0.02, headW * 0.1, '#ffdcae', 0.35);
  // temple and eye-socket shading above the sunglasses line
  blob(ctx, cx - headW * 0.22, headCY - headH * 0.06, headW * 0.13, '#8a4f30', 0.35);
  blob(ctx, cx + headW * 0.22, headCY - headH * 0.06, headW * 0.13, '#8a4f30', 0.35);
  // brow ridge shadow band
  const brow = ctx.createLinearGradient(0, headCY - headH * 0.1, 0, headCY + headH * 0.02);
  brow.addColorStop(0, 'rgba(90,45,20,0)');
  brow.addColorStop(0.6, 'rgba(90,45,20,0.4)');
  brow.addColorStop(1, 'rgba(90,45,20,0)');
  ctx.fillStyle = brow;
  ctx.fillRect(cx - headW / 2, headCY - headH * 0.1, headW, headH * 0.12);
  // nose: bridge highlight, side shadow, base shadow, cast shadow to one side
  const noseX = cx - headW * 0.01, noseTop = headCY - headH * 0.02, noseBot = headCY + headH * 0.2;
  const nb = ctx.createLinearGradient(noseX - headW * 0.03, 0, noseX + headW * 0.03, 0);
  nb.addColorStop(0, 'rgba(255,220,175,0)');
  nb.addColorStop(0.5, 'rgba(255,220,175,0.75)');
  nb.addColorStop(1, 'rgba(255,220,175,0)');
  ctx.fillStyle = nb;
  ctx.fillRect(noseX - headW * 0.032, noseTop, headW * 0.064, noseBot - noseTop);
  blob(ctx, noseX + headW * 0.075, noseBot - headH * 0.03, headW * 0.085, '#7a4023', 0.62); // cast shadow
  blob(ctx, noseX, noseBot, headW * 0.08, '#8a4a28', 0.68);                            // nose base
  blob(ctx, noseX - headW * 0.055, noseBot - headH * 0.07, headW * 0.045, '#7a4023', 0.4); // left nostril wing shadow
  blob(ctx, noseX - headW * 0.012, noseBot - headH * 0.012, headW * 0.028, '#ffdcae', 0.7); // tip highlight
  ctx.fillStyle = 'rgba(70,32,14,0.65)';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(noseX + s * headW * 0.038, noseBot + headH * 0.008, headW * 0.014, headH * 0.008, 0, 0, TAU); ctx.fill();
  }
  // lips: darker parting line, shaded upper lip, lit lower lip
  const lipY = headCY + headH * 0.315, lipW = headW * 0.15;
  ctx.fillStyle = '#a34a38';
  ctx.beginPath(); ctx.ellipse(cx, lipY, lipW, headH * 0.028, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c96a52';
  ctx.beginPath(); ctx.ellipse(cx, lipY + headH * 0.012, lipW * 0.8, headH * 0.016, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(70,25,18,0.8)'; ctx.lineWidth = Math.max(1, headH * 0.006);
  ctx.beginPath(); ctx.moveTo(cx - lipW, lipY); ctx.quadraticCurveTo(cx, lipY + headH * 0.008, cx + lipW, lipY); ctx.stroke();
  blob(ctx, cx, lipY + headH * 0.016, lipW * 0.5, '#ffb59a', 0.5);
  // ears set into the side plane, inner shadow included
  for (const s of [-1, 1]) {
    const ex = cx + s * headW * 0.485, ey = headCY + headH * 0.05;
    const eg = ctx.createRadialGradient(ex - s * headW * 0.01, ey - headH * 0.02, 2, ex, ey, headW * 0.07);
    eg.addColorStop(0, skinL); eg.addColorStop(1, skinS);
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.ellipse(ex, ey, headW * 0.055, headH * 0.075, 0, 0, TAU); ctx.fill();
    blob(ctx, ex, ey, headW * 0.03, '#6e3a1e', 0.5);
  }
  // pore-level micro texture, freckles across nose and cheeks, sweat sheen
  speckle(ctx, rand, cx - headW / 2, headTop, headW, headH, 2600, ['#7a4023', '#ffdcae', '#5e3018'], 1.0, 0.10);
  ctx.fillStyle = 'rgba(110,58,28,0.55)';
  for (let i = 0; i < 70; i++) {
    const fx = cx + (rand() - 0.5) * headW * 0.55, fy = headCY + headH * (0.06 + rand() * 0.16);
    ctx.beginPath(); ctx.arc(fx, fy, 0.6 + rand() * 1.3, 0, TAU); ctx.fill();
  }
  blob(ctx, cx - headW * 0.08, headTop + headH * 0.1, headW * 0.16, '#ffffff', 0.20); // sweat sheen, forehead
  blob(ctx, noseX, noseTop + headH * 0.08, headW * 0.05, '#ffffff', 0.22);           // sweat sheen, nose
  ctx.restore();

  // hair: a parted mass, then thousands of fine strands following the curve
  const hairTop = headTop - headH * 0.04;
  ctx.fillStyle = '#241207';
  ctx.beginPath();
  ctx.ellipse(cx, headCY - headH * 0.1, headW * 0.54, headH * 0.44, 0, Math.PI * 1.0, Math.PI * 2.0);
  ctx.quadraticCurveTo(cx - headW * 0.56, headCY - headH * 0.02, cx - headW * 0.5, headCY + headH * 0.16);
  ctx.lineTo(cx - headW * 0.4, headCY + headH * 0.1);
  ctx.quadraticCurveTo(cx - headW * 0.42, headCY - headH * 0.3, cx - headW * 0.2, headCY - headH * 0.42);
  ctx.lineTo(cx + headW * 0.34, headCY - headH * 0.44);
  ctx.quadraticCurveTo(cx + headW * 0.46, headCY - headH * 0.28, cx + headW * 0.42, headCY + headH * 0.08);
  ctx.lineTo(cx + headW * 0.52, headCY + headH * 0.14);
  ctx.quadraticCurveTo(cx + headW * 0.58, headCY - headH * 0.05, cx + headW * 0.54, headCY - headH * 0.3);
  ctx.closePath(); ctx.fill();
  // soft shadow where hair meets forehead
  blob(ctx, cx, headTop + headH * 0.1, headW * 0.4, '#3a1c0c', 0.35);
  const strandCols = ['#3a2410', '#54371c', '#6e4a26', '#8a5f30', '#1c0e04'];
  for (let i = 0; i < 2400; i++) {
    const a = Math.PI * (1.02 + rand() * 0.96);
    const rr = 0.86 + rand() * 0.16;
    const sx = cx + Math.cos(a) * headW * 0.52 * rr, sy = (headCY - headH * 0.06) + Math.sin(a) * headH * 0.48 * rr;
    const lenS = headH * (0.1 + rand() * 0.3);
    ctx.strokeStyle = strandCols[(rand() * strandCols.length) | 0];
    ctx.globalAlpha = 0.25 + rand() * 0.4;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + (sx - cx) * 0.12, sy + lenS * 0.5, sx + (sx - cx) * 0.2 + (rand() - 0.5) * 3, sy + lenS);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // two face-framing locks falling beside the cheeks, so the hair reads as a
  // styled mass around the face rather than a dome sitting on top of it
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#2c180a';
    ctx.lineCap = 'round';
    ctx.lineWidth = headW * 0.045;
    ctx.beginPath();
    ctx.moveTo(cx + s * headW * 0.42, headCY - headH * 0.28);
    ctx.quadraticCurveTo(cx + s * headW * 0.48, headCY + headH * 0.02, cx + s * headW * 0.38, headCY + headH * 0.22);
    ctx.stroke();
    ctx.strokeStyle = '#54371c';
    ctx.lineWidth = headW * 0.018;
    ctx.beginPath();
    ctx.moveTo(cx + s * headW * 0.44, headCY - headH * 0.24);
    ctx.quadraticCurveTo(cx + s * headW * 0.49, headCY + headH * 0.02, cx + s * headW * 0.41, headCY + headH * 0.19);
    ctx.stroke();
  }
  // the parting: a narrow lit line offset from centre
  ctx.strokeStyle = 'rgba(232,168,120,0.8)'; ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.1, hairTop + headH * 0.02);
  ctx.quadraticCurveTo(cx - headW * 0.13, headCY - headH * 0.34, cx - headW * 0.2, headCY - headH * 0.2);
  ctx.stroke();
  // bright flyaways against the light
  ctx.strokeStyle = 'rgba(255,205,140,0.75)'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 46; i++) {
    const a = Math.PI * (1.05 + rand() * 0.9);
    const sx = cx + Math.cos(a) * headW * 0.55, sy = (headCY - headH * 0.06) + Math.sin(a) * headH * 0.5;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (rand() - 0.5) * 14, sy - 4 - rand() * 12);
    ctx.stroke();
  }
  // rim light along the sun side of hair and face
  ctx.strokeStyle = 'rgba(255,190,120,0.85)'; ctx.lineWidth = Math.max(1.4, w * 0.006);
  ctx.beginPath(); ctx.ellipse(cx, headCY, headW * 0.52, headH * 0.5, 0, -0.7, 0.75); ctx.stroke();

  drawSunglasses(ctx, cx, headCY - headH * 0.03, headW * 0.86, headH * 0.16);
}

// Reflective sunglasses: each lens is a tiny mirrored sunset with a skyline.
function drawSunglasses(ctx, cx, cy, wdt, hgt) {
  // frame shadow falling on the cheeks
  blob(ctx, cx, cy + hgt * 0.95, wdt * 0.5, '#5e3018', 0.28);
  for (const s of [-1, 1]) {
    const lx = cx + s * wdt * 0.26;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(lx - wdt * 0.23, cy - hgt * 0.5, wdt * 0.46, hgt, hgt * 0.32);
    ctx.clip();
    const lg = ctx.createLinearGradient(0, cy - hgt * 0.5, 0, cy + hgt * 0.5);
    lg.addColorStop(0, '#7ec8e8'); lg.addColorStop(0.45, '#e5487c'); lg.addColorStop(0.7, '#ff8a5c'); lg.addColorStop(1, '#2c1a3e');
    ctx.fillStyle = lg;
    ctx.fillRect(lx - wdt * 0.23, cy - hgt * 0.5, wdt * 0.46, hgt);
    blob(ctx, lx + wdt * 0.08, cy + hgt * 0.12, wdt * 0.07, '#ffd9a0', 0.95); // mirrored sun
    ctx.fillStyle = 'rgba(20,10,30,0.85)'; // mirrored skyline strip
    ctx.fillRect(lx - wdt * 0.23, cy + hgt * 0.18, wdt * 0.46, hgt * 0.2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; // glass glare
    ctx.beginPath();
    ctx.moveTo(lx - wdt * 0.16, cy + hgt * 0.5); ctx.lineTo(lx + wdt * 0.02, cy - hgt * 0.5);
    ctx.lineTo(lx + wdt * 0.1, cy - hgt * 0.5); ctx.lineTo(lx - wdt * 0.08, cy + hgt * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#17110c'; ctx.lineWidth = Math.max(1.6, hgt * 0.09);
    ctx.beginPath();
    ctx.roundRect(lx - wdt * 0.23, cy - hgt * 0.5, wdt * 0.46, hgt, hgt * 0.32);
    ctx.stroke();
  }
  ctx.strokeStyle = '#17110c'; ctx.lineWidth = Math.max(1.6, hgt * 0.09);
  ctx.beginPath(); ctx.moveTo(cx - wdt * 0.05, cy - hgt * 0.18); ctx.lineTo(cx + wdt * 0.05, cy - hgt * 0.18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - wdt * 0.49, cy - hgt * 0.3); ctx.lineTo(cx - wdt * 0.56, cy - hgt * 0.42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + wdt * 0.49, cy - hgt * 0.3); ctx.lineTo(cx + wdt * 0.56, cy - hgt * 0.42); ctx.stroke();
}

// ---- (a) dawn beach -------------------------------------------------------
function dawnBeach(ctx, w, h, rand, noise) {
  sky(ctx, w, h, [[0, '#8fb6d9'], [0.3, '#f2c9a0'], [0.52, '#ffd9a8'], [0.62, '#ffb37a'], [1, '#e88a5c']]);
  sunDisc(ctx, w * 0.3, h * 0.585, w * 0.045, '#ffe9b0', '#ffc46b');
  clouds(ctx, rand, noise, w, h * 0.5, '#fff0dd', '#d99a7a', 5, 0.9);
  // sea with a bright sun path
  vGrad(ctx, 0, h * 0.6, w, h * 0.22, [[0, '#ffb37a'], [0.3, '#7ab6c9'], [1, '#3f7a94']]);
  seaSparkle(ctx, rand, w * 0.08, h * 0.62, w * 0.45, h * 0.18, '#fff3d0', 170);
  seaSparkle(ctx, rand, 0, h * 0.66, w, h * 0.14, '#cfeaf2', 60);
  // wet sand foreground with reflected sky sheen
  vGrad(ctx, 0, h * 0.8, w, h * 0.2, [[0, '#e8b088'], [0.4, '#d99a6b'], [1, '#b5764a']]);
  speckle(ctx, rand, 0, h * 0.82, w, h * 0.18, 900, ['#8a5a34', '#ffe0b8', '#6e4525'], 1.2, 0.3);
  blob(ctx, w * 0.3, h * 0.86, w * 0.2, '#ffd9a0', 0.3);
  // the two walkers: full shaded figures, rim-lit, long soft shadows
  for (const [fx, fh, opt] of [
    [0.58, 0.34, { shirt: '#f2ead8', pants: '#7a3b2e', skin: '#a8663c', walk: 1 }],
    [0.68, 0.31, { shirt: '#5e8aa6', pants: '#e8e0cc', skin: '#7a4a2a', hair: '#17100a', walk: -1 }],
  ]) {
    ctx.save();
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#7a4525';
    ctx.beginPath(); ctx.ellipse(w * fx + w * 0.03, h * 0.845, w * 0.09, h * 0.012, 0.15, 0, TAU); ctx.fill();
    ctx.restore();
    figure(ctx, rand, w * fx, h * 0.845, h * fh, opt);
  }
  palm(ctx, rand, w * 0.1, h * 0.86, h * 0.52, w * 0.05, '#3f4a2a', '#7a8a4a');
  palm(ctx, rand, w * 0.94, h * 0.88, h * 0.42, -w * 0.04, '#46522e', '#87985a');
  // gulls
  ctx.strokeStyle = 'rgba(60,50,50,0.7)'; ctx.lineWidth = Math.max(1, w * 0.003);
  for (let i = 0; i < 5; i++) {
    const gx = w * (0.15 + rand() * 0.6), gy = h * (0.12 + rand() * 0.2), gs = w * (0.012 + rand() * 0.01);
    ctx.beginPath(); ctx.moveTo(gx - gs, gy); ctx.quadraticCurveTo(gx, gy - gs * 0.7, gx, gy); ctx.quadraticCurveTo(gx, gy - gs * 0.7, gx + gs, gy); ctx.stroke();
  }
}

// ---- (c) neon night street after rain --------------------------------------
function neonStreet(ctx, w, h, rand, noise) {
  sky(ctx, w, h, [[0, '#0a0e24'], [0.5, '#1c1440'], [1, '#3a1650']]);
  // building faces with neon signs
  const horizon = h * 0.62;
  for (let i = 0; i < 7; i++) {
    const bx = (i / 7) * w, bw = w / 7 + 4, bh = h * (0.3 + rand() * 0.3);
    ctx.fillStyle = mixHex('#141a30', '#05070f', rand() * 0.5);
    ctx.fillRect(bx, horizon - bh, bw, bh);
    for (let wy = horizon - bh + 6; wy < horizon - 8; wy += h * 0.045) {
      for (let wx = bx + 5; wx < bx + bw - 8; wx += w * 0.028) {
        if (rand() > 0.55) { ctx.fillStyle = rgba(rand() > 0.7 ? '#ffd9a0' : '#9fd4e8', 0.25 + rand() * 0.6); ctx.fillRect(wx, wy, w * 0.014, h * 0.02); }
      }
    }
  }
  const signs = [['#ff2e88', 0.06, 0.2], ['#22d3ee', 0.3, 0.3], ['#ffb020', 0.55, 0.16], ['#b26bff', 0.78, 0.26], ['#ff5a4e', 0.45, 0.42]];
  for (const [col, sx, sy] of signs) {
    blob(ctx, w * sx + w * 0.05, h * sy, w * 0.09, col, 0.5);
    ctx.fillStyle = col;
    ctx.fillRect(w * sx, h * sy - h * 0.02, w * 0.1, h * 0.04);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(w * sx + w * 0.012, h * sy - h * 0.012, w * 0.076, h * 0.008);
  }
  // wet asphalt
  vGrad(ctx, 0, horizon, w, h - horizon, [[0, '#1a1626'], [0.3, '#120e1e'], [1, '#070510']]);
  speckle(ctx, rand, 0, horizon, w, h - horizon, 700, ['#3a3450', '#57506e', '#0a0812'], 1.4, 0.35);
  // vertically smeared reflections of every sign and light
  for (const [col, sx, sy] of signs) {
    for (let s = 0; s < 12; s++) {
      ctx.fillStyle = rgba(col, 0.10 + rand() * 0.12);
      const rx = w * sx + (rand() - 0.5) * w * 0.05;
      ctx.fillRect(rx, horizon + rand() * h * 0.05, w * 0.012 + rand() * w * 0.02, h * (0.06 + rand() * 0.2));
    }
  }
  // the car, and its flipped, smeared, rippled reflection
  const carLen = w * 0.86, carX = w * 0.06, carY = h * 0.82;
  const tmp = document.createElement('canvas');
  tmp.width = Math.ceil(carLen * 1.1); tmp.height = Math.ceil(carLen * 0.42);
  const tctx = tmp.getContext('2d');
  drawCar(tctx, mulberry(99), carLen * 0.05, carLen * 0.36, carLen, '#d92638', '#8fd0e8');
  ctx.drawImage(tmp, carX - carLen * 0.05, carY - carLen * 0.36);
  ctx.save();
  ctx.globalAlpha = 0.4;
  const reflH = carLen * 0.3;
  for (let strip = 0; strip < 14; strip++) {
    const sy2 = (strip / 14) * tmp.height;
    const dy = carY + (strip / 14) * reflH;
    const ripple = Math.sin(strip * 1.7) * w * 0.006 * (strip / 14);
    ctx.drawImage(tmp, 0, tmp.height - sy2 - tmp.height / 14, tmp.width, tmp.height / 14,
      carX - carLen * 0.05 + ripple, dy, tmp.width, reflH / 14);
  }
  ctx.restore();
  blob(ctx, carX + carLen * 0.5, carY + reflH * 0.4, carLen * 0.4, '#ff2e88', 0.10);
  // steam haze and rain streaks
  for (let i = 0; i < 7; i++) blob(ctx, rand() * w, horizon - rand() * h * 0.1, w * (0.05 + rand() * 0.08), '#8a7ab8', 0.07);
  ctx.strokeStyle = 'rgba(190,210,240,0.18)'; ctx.lineWidth = 1;
  for (let i = 0; i < 130; i++) {
    const rx = rand() * w, ry = rand() * h;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 8 + rand() * 10); ctx.stroke();
  }
  // a bystander with an umbrella, fully shaded, neon rim
  figure(ctx, rand, w * 0.9, h * 0.78, h * 0.3, { shirt: '#2e4a66', pants: '#1c1c22', skin: '#8a5a34', rim: '#ff7ab0' });
  ctx.fillStyle = '#c22650';
  ctx.beginPath(); ctx.ellipse(w * 0.9, h * 0.78 - h * 0.315, w * 0.075, h * 0.03, 0, Math.PI, TAU); ctx.fill();
}

// ---- (d) midday aerial coast, recomposed: land first -----------------------
function aerialCoast(ctx, w, h, rand, noise) {
  // rich turquoise water as the base, deep at the edges
  vGrad(ctx, 0, 0, w, h, [[0, '#0e7a8a'], [0.5, '#14a0a8'], [1, '#0a5e74']]);
  speckle(ctx, rand, 0, 0, w, h, 1600, ['#7fe0d4', '#0a4a5e', '#2ec4b6'], 1.3, 0.2);
  // shallow sand patches glowing under the surface
  for (let i = 0; i < 9; i++) blob(ctx, rand() * w * 0.5, rand() * h, w * (0.06 + rand() * 0.12), '#a8e6c8', 0.25);
  // the landmass: a big curving peninsula taking most of the frame
  const coast = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    coast.push([w * (0.34 + 0.14 * Math.sin(t * 2.4 + 0.4) + t * 0.1), t * h]);
  }
  ctx.fillStyle = '#caa25e';
  ctx.beginPath();
  ctx.moveTo(w, 0);
  for (const [px, py] of coast) ctx.lineTo(px, py);
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  speckle(ctx, rand, w * 0.4, 0, w * 0.6, h, 2200, ['#a87f3e', '#ffe9b0', '#8a652c'], 1.4, 0.3); // sand grain
  // green-gold inland over the sand base
  ctx.fillStyle = '#6e8a3e';
  ctx.beginPath();
  ctx.moveTo(w, 0);
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    ctx.lineTo(coast[i][0] + w * 0.1 + Math.sin(t * 5) * w * 0.012, coast[i][1]);
  }
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  speckle(ctx, rand, w * 0.5, 0, w * 0.5, h, 2600, ['#4a6428', '#8aa650', '#b8c46a', '#3c5420'], 1.8, 0.4); // foliage texture
  // rooftops and beach blocks inland: warm roofs, tiny shadows
  for (let i = 0; i < 90; i++) {
    const rx = w * (0.56 + rand() * 0.4), ry = rand() * h;
    const rw = w * (0.02 + rand() * 0.035), rh = rw * (0.6 + rand() * 0.5);
    ctx.fillStyle = 'rgba(40,30,16,0.35)'; ctx.fillRect(rx + 2, ry + 2, rw, rh);
    ctx.fillStyle = ['#c95f3a', '#d97b4a', '#b84a30', '#e0e6ea', '#c9a24a'][(rand() * 5) | 0];
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(rx, ry, rw, rh * 0.3);
  }
  // the coast road following the shore, with tiny shaded cars
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3c3f45'; ctx.lineWidth = Math.max(3, w * 0.02);
  ctx.beginPath();
  coast.forEach(([px, py], i) => { const ox = px + w * 0.045; i ? ctx.lineTo(ox, py) : ctx.moveTo(ox, py); });
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.8)'; ctx.lineWidth = Math.max(1, w * 0.003);
  ctx.setLineDash([w * 0.02, w * 0.016]);
  ctx.beginPath();
  coast.forEach(([px, py], i) => { const ox = px + w * 0.045; i ? ctx.lineTo(ox, py) : ctx.moveTo(ox, py); });
  ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 7; i++) {
    const t = 0.08 + rand() * 0.85, idx = Math.floor(t * 20);
    const [px, py] = coast[idx];
    ctx.save();
    ctx.translate(px + w * 0.045 + (rand() - 0.5) * w * 0.012, py);
    ctx.rotate(0.22 + rand() * 0.2);
    ctx.fillStyle = 'rgba(20,16,10,0.4)'; ctx.fillRect(-w * 0.011, -w * 0.004, w * 0.024, w * 0.011);
    ctx.fillStyle = ['#e8e6e0', '#d92638', '#2e6ea6', '#f2b13c'][(rand() * 4) | 0];
    ctx.fillRect(-w * 0.012, -w * 0.006, w * 0.024, w * 0.011);
    ctx.fillStyle = 'rgba(30,50,66,0.9)'; ctx.fillRect(-w * 0.004, -w * 0.005, w * 0.009, w * 0.009);
    ctx.restore();
  }
  // beach crowd and umbrella texture along the sand band
  for (let i = 0; i < 260; i++) {
    const t = rand(), idx = Math.floor(t * 20);
    const bx = coast[idx][0] + w * 0.012 + rand() * w * 0.02, by = t * h + (rand() - 0.5) * 8;
    ctx.fillStyle = ['#ff5a4e', '#ffd23c', '#2ec4b6', '#ff7ab0', '#ffffff'][(rand() * 5) | 0];
    ctx.beginPath(); ctx.arc(bx, by, w * (0.004 + rand() * 0.004), 0, TAU); ctx.fill();
  }
  // two boats with foaming wakes on the open water
  for (const [bx, by, bs, ang] of [[0.16, 0.3, 1, 0.5], [0.24, 0.72, 0.7, 0.9]]) {
    ctx.save(); ctx.translate(w * bx, h * by); ctx.rotate(ang);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = Math.max(1, w * 0.004);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-w * 0.03 * bs, 0);
      ctx.lineTo(-w * 0.11 * bs, s * w * 0.035 * bs); ctx.stroke();
    }
    speckle(ctx, rand, -w * 0.12 * bs, -w * 0.03 * bs, w * 0.09 * bs, w * 0.06 * bs, 40, ['#ffffff'], 1.4, 0.5);
    ctx.fillStyle = '#f2f0ea';
    ctx.beginPath();
    ctx.moveTo(w * 0.035 * bs, 0); ctx.lineTo(-w * 0.025 * bs, -w * 0.011 * bs); ctx.lineTo(-w * 0.025 * bs, w * 0.011 * bs);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c22633'; ctx.fillRect(-w * 0.008 * bs, -w * 0.008 * bs, w * 0.016 * bs, w * 0.005 * bs);
    ctx.restore();
  }
  // sparkle on the water
  seaSparkle(ctx, rand, 0, 0, w * 0.4, h, '#dffcf4', 140);
}

// ---- (e) blue-hour skyline across water -------------------------------------
function skylineBlue(ctx, w, h, rand, noise) {
  sky(ctx, w, h, [[0, '#101c44'], [0.4, '#2c3a72'], [0.58, '#7a4a8a'], [0.68, '#e87a5c'], [1, '#2c2440']]);
  clouds(ctx, rand, noise, w, h * 0.4, '#5a4a8a', '#1c1440', 4, 0.9);
  const horizon = h * 0.66;
  // skyline: varied towers, hundreds of lit windows with bloom
  let bx = -w * 0.02;
  const towers = [];
  while (bx < w * 1.02) {
    const bw = w * (0.05 + rand() * 0.07), bh = h * (0.2 + rand() * 0.38);
    towers.push([bx, bw, bh]);
    ctx.fillStyle = mixHex('#0c1024', '#1c2444', rand() * 0.6);
    ctx.fillRect(bx, horizon - bh, bw, bh);
    if (rand() > 0.5) ctx.fillRect(bx + bw * 0.3, horizon - bh - h * 0.03, bw * 0.2, h * 0.03);
    bx += bw + w * 0.006;
  }
  for (const [tx, tw, th] of towers) {
    for (let wy = horizon - th + 5; wy < horizon - 6; wy += h * 0.032) {
      for (let wx = tx + 4; wx < tx + tw - 5; wx += w * 0.02) {
        if (rand() > 0.42) {
          ctx.fillStyle = rgba(rand() > 0.75 ? '#9fd4e8' : '#ffd9a0', 0.3 + rand() * 0.7);
          ctx.fillRect(wx, wy, w * 0.009, h * 0.014);
        }
      }
    }
  }
  blob(ctx, w * 0.5, horizon - h * 0.2, w * 0.5, '#ffb37a', 0.12);
  // water with broken shimmering reflections
  vGrad(ctx, 0, horizon, w, h - horizon, [[0, '#2c2444'], [0.2, '#1c2a4e'], [1, '#0a0e24']]);
  for (const [tx, tw] of towers) {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = rgba(rand() > 0.7 ? '#9fd4e8' : '#ffd9a0', 0.08 + rand() * 0.25);
      const rx = tx + rand() * tw, ry = horizon + rand() * (h - horizon) * 0.9;
      ctx.fillRect(rx, ry, w * (0.008 + rand() * 0.02), 1.6);
    }
  }
  seaSparkle(ctx, rand, 0, horizon + 4, w, h - horizon - 8, '#e87a8a', 60);
  // a small lit boat crossing
  ctx.fillStyle = '#0c0e1c';
  ctx.beginPath(); ctx.moveTo(w * 0.6, h * 0.78); ctx.lineTo(w * 0.72, h * 0.78); ctx.lineTo(w * 0.7, h * 0.8); ctx.lineTo(w * 0.62, h * 0.8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd9a0'; ctx.fillRect(w * 0.64, h * 0.765, w * 0.03, h * 0.014);
  blob(ctx, w * 0.66, h * 0.79, w * 0.05, '#ffd9a0', 0.3);
}

// ---- (f) golden-hour coastal road -------------------------------------------
function goldenRoad(ctx, w, h, rand, noise) {
  sky(ctx, w, h, [[0, '#5e7ab8'], [0.35, '#e8a06b'], [0.55, '#ffc46b'], [0.66, '#ff9a5c'], [1, '#c95f3a']]);
  sunDisc(ctx, w * 0.5, h * 0.6, w * 0.05, '#ffe9b0', '#ffb020');
  clouds(ctx, rand, noise, w, h * 0.5, '#ffd9a8', '#a05a4a', 5, 1);
  // sea to the left, scrub land to the right
  vGrad(ctx, 0, h * 0.62, w * 0.42, h * 0.38, [[0, '#ff9a5c'], [0.3, '#4a8aa6'], [1, '#2c5e7a']]);
  seaSparkle(ctx, rand, 0, h * 0.64, w * 0.4, h * 0.3, '#ffd9a0', 110);
  ctx.fillStyle = '#7a6a34';
  ctx.beginPath(); ctx.moveTo(w * 0.62, h * 0.62); ctx.lineTo(w, h * 0.58); ctx.lineTo(w, h); ctx.lineTo(w * 0.58, h); ctx.closePath(); ctx.fill();
  speckle(ctx, rand, w * 0.6, h * 0.6, w * 0.4, h * 0.4, 1400, ['#4a6428', '#a87f3e', '#8aa650'], 1.8, 0.4);
  // the road: a perspective sweep to the vanishing point
  ctx.fillStyle = '#33363e';
  ctx.beginPath();
  ctx.moveTo(w * 0.485, h * 0.615); ctx.lineTo(w * 0.545, h * 0.615);
  ctx.lineTo(w * 0.98, h); ctx.lineTo(w * 0.3, h);
  ctx.closePath(); ctx.fill();
  speckle(ctx, rand, w * 0.3, h * 0.62, w * 0.68, h * 0.38, 800, ['#575c66', '#1e2026', '#8a8f99'], 1.2, 0.3);
  ctx.strokeStyle = 'rgba(255,240,200,0.85)';
  for (let i = 0; i < 7; i++) {
    const t = i / 7, y0 = lerp(h * 0.63, h, t * t), y1 = lerp(h * 0.63, h, Math.pow(t + 0.07, 2));
    ctx.lineWidth = 1 + t * w * 0.008;
    ctx.beginPath(); ctx.moveTo(lerp(w * 0.515, w * 0.64, t * t), y0); ctx.lineTo(lerp(w * 0.515, w * 0.64, Math.pow(t + 0.07, 2)), y1); ctx.stroke();
  }
  // guardrail posts receding with perspective, long shadows
  for (let i = 0; i < 9; i++) {
    const t = i / 9, px = lerp(w * 0.56, w * 0.99, Math.pow(t, 1.6)), py = lerp(h * 0.63, h * 0.97, Math.pow(t, 1.6));
    const ph = h * (0.012 + t * 0.05);
    ctx.fillStyle = 'rgba(60,30,16,0.4)';
    ctx.beginPath(); ctx.ellipse(px + ph, py, ph * 1.6, ph * 0.22, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9ccd2'; ctx.fillRect(px, py - ph, Math.max(1.4, w * 0.006), ph);
    ctx.fillStyle = '#ff5a4e'; ctx.fillRect(px, py - ph, Math.max(1.4, w * 0.006), ph * 0.3);
  }
  ctx.strokeStyle = 'rgba(220,224,230,0.8)'; ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.beginPath(); ctx.moveTo(w * 0.56, h * 0.622); ctx.quadraticCurveTo(w * 0.75, h * 0.72, w * 0.99, h * 0.93); ctx.stroke();
  // a small car from behind, shaded, with a long shadow and brake glow
  const carW = w * 0.21, carX = w * 0.54, carY = h * 0.78;
  ctx.fillStyle = 'rgba(50,20,10,0.45)';
  ctx.beginPath(); ctx.ellipse(carX + carW * 0.62, carY + carW * 0.3, carW * 0.55, carW * 0.09, 0.25, 0, TAU); ctx.fill();
  const cg = ctx.createLinearGradient(carX, carY - carW * 0.42, carX, carY + carW * 0.2);
  cg.addColorStop(0, '#e8e2d4'); cg.addColorStop(0.4, '#b8b0a0'); cg.addColorStop(1, '#6e685c');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.roundRect(carX, carY - carW * 0.3, carW, carW * 0.42, carW * 0.07); ctx.fill();
  const wg = ctx.createLinearGradient(carX, carY - carW * 0.52, carX, carY - carW * 0.28);
  wg.addColorStop(0, '#a8d4e8'); wg.addColorStop(1, '#3a5a74');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.roundRect(carX + carW * 0.1, carY - carW * 0.52, carW * 0.8, carW * 0.24, carW * 0.06); ctx.fill();
  blob(ctx, carX + carW * 0.08, carY + carW * 0.02, carW * 0.12, '#ff4d5e', 0.8);
  blob(ctx, carX + carW * 0.92, carY + carW * 0.02, carW * 0.12, '#ff4d5e', 0.8);
  ctx.fillStyle = '#ff6a5e';
  ctx.fillRect(carX + carW * 0.03, carY - carW * 0.02, carW * 0.14, carW * 0.06);
  ctx.fillRect(carX + carW * 0.83, carY - carW * 0.02, carW * 0.14, carW * 0.06);
  ctx.fillStyle = '#14161a';
  ctx.beginPath(); ctx.roundRect(carX + carW * 0.02, carY + carW * 0.08, carW * 0.2, carW * 0.12, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(carX + carW * 0.78, carY + carW * 0.08, carW * 0.2, carW * 0.12, 3); ctx.fill();
  palm(ctx, rand, w * 0.9, h * 0.72, h * 0.3, -w * 0.03, '#4a3a1c', '#8a7a3a');
  // heat shimmer lines above the asphalt
  ctx.strokeStyle = 'rgba(255,240,210,0.14)'; ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const yy = h * (0.66 + rand() * 0.2);
    ctx.beginPath();
    for (let x = w * 0.36; x < w * 0.9; x += 14) ctx.lineTo(x, yy + Math.sin(x * 0.05 + i) * 1.6);
    ctx.stroke();
  }
}

export const SCENES = [
  { id: 'portrait', name: 'Portrait Bay', draw: portraitBay },
  { id: 'dawn', name: 'Dawn Walkers', draw: dawnBeach },
  { id: 'neon', name: 'Neon Wheels', draw: neonStreet },
  { id: 'aerial', name: 'Aerial Coast', draw: aerialCoast },
  { id: 'skyline', name: 'Blue Hour Skyline', draw: skylineBlue },
  { id: 'road', name: 'Golden Mile Road', draw: goldenRoad },
];

export function paintScene(ctx, w, h, scene) {
  const rand = mulberry(1000 + SCENES.indexOf(scene) * 777 + 13);
  const noise = new NoiseField(400 + SCENES.indexOf(scene) * 31, 48);
  scene.draw(ctx, w, h, rand, noise);
}
