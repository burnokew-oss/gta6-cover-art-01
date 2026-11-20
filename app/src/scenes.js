// scenes.js — the painted world of Vice Coast Cover Studio.
// Six landscape scenes, each with its own sky and light, plus a cast of
// five original characters painted as shaded head-and-shoulders portraits.
// Everything is procedural continuous tone: layered gradients, seeded
// noise, soft shadows. Heads are modelled skulls that narrow to the chin,
// hair is a stranded mass with a broken hairline, skin carries pore-scale
// grain — never a dot screen, never a bare ball head at any size.

import { makeRng, fbm, speckle, vGrad, clamp01, lerp } from './noise.js';

function softEllipse(ctx, cx, cy, rx, ry, colour, alpha) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.translate(cx, cy); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); ctx.translate(-cx, -cy);
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function palmSilhouette(ctx, x, y, s, colour, seed) {
  const rng = makeRng(seed);
  ctx.save(); ctx.strokeStyle = colour; ctx.fillStyle = colour;
  ctx.lineWidth = s * 0.07; ctx.beginPath();
  ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.06, y - s * 0.6, x - s * 0.04, y - s * 1.05); ctx.stroke();
  const tx = x - s * 0.04, ty = y - s * 1.05;
  for (let f = 0; f < 7; f++) {
    const ang = -Math.PI * (0.08 + f * 0.13) + (rng() - 0.5) * 0.1;
    const len = s * (0.55 + rng() * 0.3);
    ctx.lineWidth = s * 0.016;
    for (let l = 0; l < 9; l++) {
      const t = l / 9, bx = tx + Math.cos(ang) * len * t, by = ty + Math.sin(ang) * len * t + t * t * s * 0.22;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx + s * 0.05, by + s * (0.03 + t * 0.05)); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(ang) * len * 0.6, ty + Math.sin(ang) * len * 0.6 - s * 0.05, tx + Math.cos(ang) * len, ty + Math.sin(ang) * len + s * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

// A whole small person: haired head, neck, clothed torso and limbs, feet,
// contact shadow. Used at every distance — simpler and hazier far away,
// never a stick figure, never a bare ball.
export function drawFigure(ctx, x, y, h, cfg, seed) {
  const rng = makeRng(seed);
  const headR = h * 0.11, hipY = y - h * 0.52, shY = y - h * 0.86;
  ctx.save();
  softEllipse(ctx, x, y, h * 0.2, h * 0.045, 'rgba(20,10,20,1)', 0.35);
  ctx.strokeStyle = cfg.pants; ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.075;
  const stride = (rng() - 0.5) * h * 0.16;
  ctx.beginPath(); ctx.moveTo(x - h * 0.03, hipY); ctx.lineTo(x - h * 0.05 + stride, y - h * 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + h * 0.03, hipY); ctx.lineTo(x + h * 0.06 - stride, y - h * 0.02); ctx.stroke();
  ctx.fillStyle = cfg.shirt;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.13, shY + h * 0.05);
  ctx.quadraticCurveTo(x, shY - h * 0.05, x + h * 0.13, shY + h * 0.05);
  ctx.lineTo(x + h * 0.09, hipY + h * 0.04); ctx.lineTo(x - h * 0.09, hipY + h * 0.04);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = cfg.shirt; ctx.lineWidth = h * 0.06;
  ctx.beginPath(); ctx.moveTo(x - h * 0.12, shY + h * 0.08); ctx.lineTo(x - h * 0.19, hipY - h * 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + h * 0.12, shY + h * 0.08); ctx.lineTo(x + h * 0.18, hipY + h * 0.04); ctx.stroke();
  ctx.fillStyle = cfg.skin; ctx.fillRect(x - h * 0.035, shY - h * 0.06, h * 0.07, h * 0.09);
  ctx.beginPath(); ctx.arc(x, shY - headR - h * 0.03, headR, 0, Math.PI * 2); ctx.fillStyle = cfg.skin; ctx.fill();
  ctx.beginPath(); ctx.arc(x, shY - headR - h * 0.055, headR * 1.02, Math.PI * 0.95, Math.PI * 2.05);
  ctx.quadraticCurveTo(x + headR * 0.9, shY - headR * 0.6, x + headR * 0.75, shY - headR * 0.25);
  ctx.lineTo(x - headR * 0.75, shY - headR * 0.25);
  ctx.quadraticCurveTo(x - headR * 0.9, shY - headR * 0.6, x - headR * 1.02, shY - headR - h * 0.055);
  ctx.fillStyle = cfg.hair; ctx.fill();
  if (cfg.rim) { ctx.strokeStyle = cfg.rim; ctx.lineWidth = h * 0.014; ctx.beginPath(); ctx.arc(x, shY - headR - h * 0.03, headR, -0.9, 0.7); ctx.stroke(); }
  ctx.restore();
}

// ---------- the cast ----------
// One modelled head: skull narrowing to the chin, brow shadow, a nose made
// of light and shadow planes, cheekbones, lips, jaw shadow, a shaded ear.
function paintHead(ctx, cx, topY, hw, hh, c, seed) {
  const rng = makeRng(seed);
  const chinY = topY + hh, templeY = topY + hh * 0.34, jawY = topY + hh * 0.78;
  const skull = new Path2D();
  skull.moveTo(cx - hw * 0.82, templeY);
  skull.bezierCurveTo(cx - hw * 0.95, topY + hh * 0.08, cx - hw * 0.45, topY - hh * 0.04, cx, topY);
  skull.bezierCurveTo(cx + hw * 0.45, topY - hh * 0.04, cx + hw * 0.95, topY + hh * 0.08, cx + hw * 0.82, templeY);
  skull.bezierCurveTo(cx + hw * 0.8, topY + hh * 0.6, cx + hw * 0.52, jawY, cx + hw * 0.3, topY + hh * 0.92);
  skull.bezierCurveTo(cx + hw * 0.12, chinY, cx - hw * 0.12, chinY, cx - hw * 0.3, topY + hh * 0.92);
  skull.bezierCurveTo(cx - hw * 0.52, jawY, cx - hw * 0.8, topY + hh * 0.6, cx - hw * 0.82, templeY);
  const g = ctx.createLinearGradient(cx - hw, topY, cx + hw, chinY);
  g.addColorStop(0, c.skinShadow); g.addColorStop(0.42, c.skin); g.addColorStop(0.75, c.skinLight); g.addColorStop(1, c.skin);
  ctx.save(); ctx.fillStyle = g; ctx.fill(skull); ctx.clip(skull);
  // pore-scale grain that follows the light, denser in shadow
  speckle(ctx, cx - hw, topY, hw * 2, hh, Math.floor(hw * hh * 0.05), seed + 3, 'rgba(60,25,15,1)', 0.05, Math.max(0.7, hw * 0.012));
  speckle(ctx, cx - hw, topY, hw * 2, hh, Math.floor(hw * hh * 0.03), seed + 9, 'rgba(255,235,210,1)', 0.05, Math.max(0.7, hw * 0.01));
  if (c.stubble) speckle(ctx, cx - hw * 0.7, jawY - hh * 0.1, hw * 1.4, hh * 0.24, 260, seed + 21, 'rgba(40,30,28,1)', 0.16, hw * 0.014);
  if (c.freckles) speckle(ctx, cx - hw * 0.6, topY + hh * 0.5, hw * 1.2, hh * 0.18, 90, seed + 27, 'rgba(120,60,30,1)', 0.2, hw * 0.013);
  // sheen: forehead and nose catch more light than the cheek
  softEllipse(ctx, cx, topY + hh * 0.2, hw * 0.55, hh * 0.16, 'rgba(255,240,215,1)', 0.20);
  softEllipse(ctx, cx + hw * 0.28, topY + hh * 0.58, hw * 0.3, hh * 0.1, 'rgba(255,240,215,1)', 0.16);
  // brow ridge shadow, then eyes (or sunglasses drawn by the caller)
  softEllipse(ctx, cx, topY + hh * 0.42, hw * 0.8, hh * 0.09, 'rgba(70,30,20,1)', 0.20);
  if (!c.shades) {
    for (const s of [-1, 1]) {
      const ex = cx + s * hw * 0.36, ey = topY + hh * 0.46;
      ctx.fillStyle = 'rgba(255,250,244,0.92)';
      ctx.beginPath(); ctx.ellipse(ex, ey, hw * 0.128, hh * 0.044, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.iris;
      ctx.beginPath(); ctx.arc(ex + c.gaze * hw * 0.05, ey, hh * 0.027, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(15,10,10,1)';
      ctx.beginPath(); ctx.arc(ex + c.gaze * hw * 0.05, ey, hh * 0.019, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(ex + c.gaze * hw * 0.05 - hw * 0.02, ey - hh * 0.014, hh * 0.008, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,30,22,0.75)'; ctx.lineWidth = Math.max(1, hh * 0.012);
      ctx.beginPath(); ctx.ellipse(ex, ey, hw * 0.155, hh * 0.052, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.strokeStyle = c.brow; ctx.lineWidth = Math.max(1.2, hh * 0.02); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - hw * 0.16, ey - hh * 0.085);
      ctx.quadraticCurveTo(ex, ey - hh * 0.115, ex + hw * 0.16, ey - hh * 0.08); ctx.stroke();
    }
  }
  // nose: bridge highlight, one shadow plane, nostril shadow — no outline
  const noseTop = topY + hh * 0.47, noseBot = topY + hh * 0.68;
  softEllipse(ctx, cx - hw * 0.02, (noseTop + noseBot) / 2, hw * 0.075, hh * 0.12, 'rgba(255,242,220,1)', 0.35);
  ctx.fillStyle = 'rgba(90,40,25,0.34)';
  ctx.beginPath();
  ctx.moveTo(cx + hw * 0.07, noseTop + hh * 0.04); ctx.lineTo(cx + hw * 0.16, noseBot - hh * 0.02);
  ctx.lineTo(cx + hw * 0.05, noseBot + hh * 0.015); ctx.closePath(); ctx.fill();
  softEllipse(ctx, cx, noseBot + hh * 0.012, hw * 0.19, hh * 0.032, 'rgba(70,28,18,1)', 0.42);
  ctx.fillStyle = 'rgba(60,24,16,0.55)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * hw * 0.085, noseBot + hh * 0.012, hw * 0.032, hh * 0.013, 0, 0, Math.PI * 2); ctx.fill(); }
  // laugh lines and cheek shading
  ctx.strokeStyle = 'rgba(100,45,28,0.20)'; ctx.lineWidth = Math.max(1, hh * 0.01);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * hw * 0.16, noseBot + hh * 0.03); ctx.quadraticCurveTo(cx + s * hw * 0.3, noseBot + hh * 0.09, cx + s * hw * 0.27, topY + hh * 0.8); ctx.stroke(); }
  // lips: darker meeting line, lit lower lip
  const lipY = topY + hh * 0.815, lipW = hw * (c.lipW || 0.3);
  ctx.fillStyle = c.lip;
  ctx.beginPath(); ctx.ellipse(cx, lipY, lipW, hh * 0.032, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(80,25,25,0.65)'; ctx.lineWidth = Math.max(1, hh * 0.011);
  ctx.beginPath(); ctx.moveTo(cx - lipW, lipY); ctx.quadraticCurveTo(cx, lipY + hh * 0.008, cx + lipW, lipY); ctx.stroke();
  softEllipse(ctx, cx, lipY + hh * 0.02, lipW * 0.55, hh * 0.014, 'rgba(255,220,200,1)', 0.4);
  // ear set into the side plane
  ctx.fillStyle = c.skinShadow;
  ctx.beginPath(); ctx.ellipse(cx + hw * 0.86 * (c.turn || 1), topY + hh * 0.52, hw * 0.09, hh * 0.085, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(90,40,25,0.35)';
  ctx.beginPath(); ctx.ellipse(cx + hw * 0.86 * (c.turn || 1), topY + hh * 0.52, hw * 0.045, hh * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // shadow pooled under the jaw
  softEllipse(ctx, cx, chinY + hh * 0.035, hw * 0.5, hh * 0.05, 'rgba(50,20,15,1)', 0.35);
  return skull;
}

// Hair: a shaped mass on the skull curve, a broken irregular hairline with
// strands of uneven length crossing it, thousands of tapered strands in
// several tones, bright flyaways on the rim, shadow where hair meets skin.
function paintHair(ctx, cx, topY, hw, hh, c, seed) {
  const rng = makeRng(seed);
  const style = c.hairStyle;
  const long_ = style === 'wavy' || style === 'curly';
  const drop = style === 'wavy' ? hh * 1.25 : style === 'curly' ? hh * 0.95 : style === 'tied' ? hh * 0.5 : hh * 0.34;
  ctx.save();
  // Mass silhouette: a CAP, not a curtain — the outer edge runs over the
  // crown and down the sides, then the path returns along the INSIDE of
  // the sides and across the hairline, so the face stays open.
  ctx.beginPath();
  const steps = 14, arc = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, ang = Math.PI * (1 - t);
    const wob = 1 + fbm(t * 5, seed, 3) * (style === 'curly' ? 0.16 : 0.06);
    arc.push([cx + Math.cos(ang) * hw * 1.04 * wob, topY + hh * 0.34 - Math.sin(ang) * hh * 0.42 * wob]);
  }
  ctx.moveTo(cx - hw * 1.02, topY + hh * 0.34 + drop);
  for (const [px, py] of arc) ctx.lineTo(px, py);
  ctx.lineTo(cx + hw * 1.02, topY + hh * 0.34 + drop);
  ctx.lineTo(cx + hw * 0.84, topY + hh * 0.34 + drop * 0.94);
  // the inner edge wanders — waves and curls never fall in a straight curtain
  ctx.lineTo(cx + hw * (0.9 + fbm(3.3, seed, 3) * 0.05), topY + hh * 0.34 + drop * 0.55);
  ctx.lineTo(cx + hw * (0.83 + fbm(7.1, seed, 3) * 0.04), topY + hh * 0.36 + drop * 0.22);
  ctx.lineTo(cx + hw * 0.8, topY + hh * 0.37);
  // hairline across the forehead: high in the middle, jittered by noise
  for (let i = 10; i >= 0; i--) {
    const t = i / 10 * 2 - 1;
    const hy = topY + hh * 0.315 - Math.sqrt(Math.max(0, 1 - t * t)) * hh * 0.028 + fbm(i * 0.7, seed + 5, 3) * hh * 0.018;
    ctx.lineTo(cx + t * hw * 0.79, hy);
  }
  ctx.lineTo(cx - hw * 0.8, topY + hh * 0.37);
  ctx.lineTo(cx - hw * (0.83 + fbm(5.7, seed, 3) * 0.04), topY + hh * 0.36 + drop * 0.22);
  ctx.lineTo(cx - hw * (0.9 + fbm(9.4, seed, 3) * 0.05), topY + hh * 0.34 + drop * 0.55);
  ctx.lineTo(cx - hw * 0.84, topY + hh * 0.34 + drop * 0.94);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx, topY - hh * 0.1, cx, topY + drop);
  g.addColorStop(0, c.hairLight); g.addColorStop(0.5, c.hair); g.addColorStop(1, c.hairDark);
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  // strands following the skull curve, several tones
  const tones = [c.hairDark, c.hair, c.hairLight, c.hair];
  const strandCount = style === 'curly' ? 700 : 950;
  for (let i = 0; i < strandCount; i++) {
    const t = rng(), side = t < 0.5 ? -1 : 1, tt = Math.abs(t - 0.5) * 2;
    const sx = cx + side * hw * (0.12 + tt * 0.85);
    const sy = topY + hh * 0.3 - Math.sqrt(Math.max(0, 1 - tt * tt)) * hh * 0.36 + rng() * hh * 0.05;
    // strands run long only down the sides; over the crown they stop at
    // the hairline so they never veil the face
    const sideRun = tt > 0.55 ? 1 : 0.22;
    const len = (style === 'cropped' ? hh * 0.16 : hh * (0.35 + tt * 0.5)) * (0.7 + rng() * 0.6) * (long_ ? 1.7 * sideRun : 1);
    const wave = style === 'wavy' || style === 'curly' ? Math.sin(i * 1.7) * hw * 0.05 : hw * 0.012;
    ctx.strokeStyle = tones[(rng() * tones.length) | 0];
    ctx.globalAlpha = 0.25 + rng() * 0.45;
    ctx.lineWidth = Math.max(0.5, hw * 0.008);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + side * hw * 0.05 + wave, sy + len * 0.55, sx + side * hw * 0.03 + wave * 1.6, sy + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (style === 'curly') {
    for (let i = 0; i < 260; i++) {
      const a = rng() * Math.PI * 2, r = hw * (0.5 + rng() * 0.55);
      const px = cx + Math.cos(a) * r, py = topY + hh * 0.28 + Math.sin(a) * r * 0.62;
      if (py > topY + hh * 0.75 && Math.abs(px - cx) < hw * 0.6) continue;
      ctx.strokeStyle = tones[(rng() * tones.length) | 0]; ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(0.6, hw * 0.01);
      ctx.beginPath(); ctx.arc(px, py, hw * (0.05 + rng() * 0.05), rng() * 3, rng() * 3 + 3.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // broken hairline: uneven short strands crossing onto the forehead
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const t = (i / 90 - 0.5) * 2;
    const hx = cx + t * hw * 0.78;
    const hy = topY + hh * 0.335 - Math.sqrt(Math.max(0, 1 - t * t)) * hh * 0.045 + fbm(i * 0.4, seed + 5, 3) * hh * 0.02;
    const len = hh * (0.02 + rng() * 0.075) * (1 - Math.abs(t) * 0.3);
    ctx.strokeStyle = rng() > 0.4 ? c.hairDark : c.hair;
    ctx.globalAlpha = 0.55 + rng() * 0.4; ctx.lineWidth = Math.max(0.6, hw * 0.011);
    ctx.beginPath(); ctx.moveTo(hx, hy - len * 0.4); ctx.lineTo(hx + (rng() - 0.5) * hw * 0.03, hy + len); ctx.stroke();
  }
  // flyaways on the lit rim
  ctx.strokeStyle = c.hairLight;
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.15 + rng() * 0.7), side = rng() > 0.5 ? 1 : -1;
    const sx = cx + side * hw * Math.cos(a) * 1.02, sy = topY + hh * 0.3 - Math.sin(a) * hh * 0.4;
    ctx.globalAlpha = 0.35 + rng() * 0.4; ctx.lineWidth = Math.max(0.5, hw * 0.007);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + side * hw * 0.08, sy - hh * 0.05, sx + side * hw * 0.13, sy + hh * 0.01); ctx.stroke();
  }
  ctx.restore();
  // soft shadow where the hair meets the forehead
  softEllipse(ctx, cx, topY + hh * 0.36, hw * 0.72, hh * 0.045, 'rgba(40,18,12,1)', 0.28);
  if (style === 'tied') { // ponytail falling to one side
    ctx.save(); ctx.strokeStyle = c.hair; ctx.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      ctx.globalAlpha = 0.5 + rng() * 0.4; ctx.lineWidth = Math.max(0.7, hw * 0.02 * (1 - i / 60));
      ctx.strokeStyle = tonesPick(c, rng);
      ctx.beginPath(); ctx.moveTo(cx + hw * 0.88, topY + hh * 0.18);
      ctx.quadraticCurveTo(cx + hw * (1.05 + rng() * 0.08), topY + hh * 0.6, cx + hw * (0.92 + rng() * 0.1), topY + hh * (0.95 + rng() * 0.25));
      ctx.stroke();
    }
    ctx.restore();
  }
}
function tonesPick(c, rng) { return [c.hairDark, c.hair, c.hairLight][(rng() * 3) | 0]; }

function paintSunglasses(ctx, cx, topY, hw, hh, seed) {
  const rng = makeRng(seed + 41);
  for (const s of [-1, 1]) {
    const lx = cx + s * hw * 0.37, ly = topY + hh * 0.45;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(lx, ly, hw * 0.27, hh * 0.105, s * -0.06, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(lx, ly - hh * 0.1, lx, ly + hh * 0.1);
    g.addColorStop(0, '#2b1050'); g.addColorStop(0.45, '#c73e7d'); g.addColorStop(0.72, '#ff9a3c'); g.addColorStop(1, '#3a2a6e');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    // mirrored skyline inside the lens
    ctx.fillStyle = 'rgba(20,8,40,0.85)';
    let bx = lx - hw * 0.27;
    while (bx < lx + hw * 0.27) { const bw = hw * (0.05 + rng() * 0.08), bh = hh * (0.03 + rng() * 0.07); ctx.fillRect(bx, ly + hh * 0.055 - bh, bw, bh); bx += bw + hw * 0.015; }
    palmSilhouette(ctx, lx + s * hw * 0.1, ly + hh * 0.06, hh * 0.16, 'rgba(15,5,30,0.9)', seed + (s > 0 ? 5 : 6));
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.moveTo(lx - hw * 0.16, ly + hh * 0.09); ctx.lineTo(lx + hw * 0.02, ly - hh * 0.1); ctx.lineTo(lx + hw * 0.1, ly - hh * 0.1); ctx.lineTo(lx - hw * 0.08, ly + hh * 0.09); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(25,12,30,0.95)'; ctx.lineWidth = Math.max(1.2, hh * 0.016);
    ctx.beginPath(); ctx.ellipse(lx, ly, hw * 0.27, hh * 0.105, s * -0.06, 0, Math.PI * 2); ctx.stroke();
    softEllipse(ctx, lx, ly + hh * 0.16, hw * 0.2, hh * 0.03, 'rgba(40,15,35,1)', 0.22);
  }
  ctx.strokeStyle = 'rgba(25,12,30,0.95)'; ctx.lineWidth = Math.max(1.2, hh * 0.014);
  ctx.beginPath(); ctx.moveTo(cx - hw * 0.1, topY + hh * 0.44); ctx.lineTo(cx + hw * 0.1, topY + hh * 0.44); ctx.stroke();
}

function paintShoulders(ctx, cx, baseY, hw, hh, c, seed) {
  const rng = makeRng(seed + 77);
  const topY = baseY - hh * 0.98; // shoulder line sits just under the chin
  // neck
  ctx.fillStyle = c.skinShadow;
  ctx.beginPath(); ctx.moveTo(cx - hw * 0.2, topY - hh * 0.1); ctx.lineTo(cx + hw * 0.2, topY - hh * 0.1);
  ctx.lineTo(cx + hw * 0.24, baseY); ctx.lineTo(cx - hw * 0.24, baseY); ctx.closePath(); ctx.fill();
  softEllipse(ctx, cx - hw * 0.08, topY + hh * 0.02, hw * 0.16, hh * 0.1, 'rgba(255,240,215,1)', 0.18);
  // a warm rim of light along the lit shoulder edge
  ctx.strokeStyle = 'rgba(255,225,180,0.5)'; ctx.lineWidth = Math.max(1, hh * 0.02);
  ctx.beginPath(); ctx.moveTo(cx + hw * 0.95, topY - hh * 0.02);
  ctx.quadraticCurveTo(cx + hw * 1.9, topY + hh * 0.02, cx + hw * 2.05, baseY); ctx.stroke();
  // shoulders and clothing
  ctx.beginPath();
  ctx.moveTo(cx - hw * 2.1, baseY);
  ctx.quadraticCurveTo(cx - hw * 1.9, topY + hh * 0.02, cx - hw * 0.95, topY - hh * 0.02);
  ctx.quadraticCurveTo(cx - hw * 0.4, topY - hh * 0.1, cx, topY - hh * 0.08);
  ctx.quadraticCurveTo(cx + hw * 0.4, topY - hh * 0.1, cx + hw * 0.95, topY - hh * 0.02);
  ctx.quadraticCurveTo(cx + hw * 1.9, topY + hh * 0.02, cx + hw * 2.1, baseY);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - hw * 2, topY, cx + hw * 2, baseY);
  g.addColorStop(0, c.clothDark); g.addColorStop(0.5, c.cloth); g.addColorStop(1, c.clothDark);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  speckle(ctx, cx - hw * 2.1, topY - hh * 0.1, hw * 4.2, hh * 0.5, 900, seed + 31, 'rgba(0,0,0,1)', 0.06, hw * 0.012);
  speckle(ctx, cx - hw * 2.1, topY - hh * 0.1, hw * 4.2, hh * 0.5, 500, seed + 33, 'rgba(255,255,255,1)', 0.05, hw * 0.01);
  ctx.strokeStyle = 'rgba(0,0,0,0.20)'; ctx.lineWidth = Math.max(1, hh * 0.012);
  for (let i = 0; i < 7; i++) {
    const fx = cx + (rng() - 0.5) * hw * 3.2;
    ctx.beginPath(); ctx.moveTo(fx, topY); ctx.quadraticCurveTo(fx + hw * 0.1, topY + hh * 0.14, fx - hw * 0.04, baseY); ctx.stroke();
  }
  if (c.clothKind === 'sequin') speckle(ctx, cx - hw * 2, topY, hw * 4, hh * 0.45, 420, seed + 37, 'rgba(255,250,220,1)', 0.75, hw * 0.02);
  if (c.clothKind === 'floral') {
    for (let i = 0; i < 26; i++) {
      const fx = cx + (rng() - 0.5) * hw * 3.6, fy = topY + rng() * hh * 0.3;
      ctx.fillStyle = ['#ff5d7a', '#ffd166', '#7ae0c3'][(rng() * 3) | 0]; ctx.globalAlpha = 0.8;
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * hw * 0.045, fy + Math.sin(a) * hw * 0.045, hw * 0.032, hw * 0.02, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  if (c.clothKind === 'open') { // open shirt over a tee: V opening + collar lines
    ctx.fillStyle = c.under || '#20242e';
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.34, topY - hh * 0.06); ctx.lineTo(cx + hw * 0.34, topY - hh * 0.06); ctx.lineTo(cx, baseY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, hh * 0.014);
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.34, topY - hh * 0.06); ctx.lineTo(cx, baseY); ctx.moveTo(cx + hw * 0.34, topY - hh * 0.06); ctx.lineTo(cx, baseY); ctx.stroke();
  }
  if (c.clothKind === 'jacket') {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = Math.max(1.2, hh * 0.016);
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.3, topY - hh * 0.08); ctx.lineTo(cx - hw * 0.05, baseY); ctx.moveTo(cx + hw * 0.3, topY - hh * 0.08); ctx.lineTo(cx + hw * 0.05, baseY); ctx.stroke();
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.moveTo(cx - hw * 0.28, topY - hh * 0.08); ctx.lineTo(cx + hw * 0.28, topY - hh * 0.08); ctx.lineTo(cx, topY + hh * 0.16); ctx.closePath(); ctx.fill();
  }
}

function envBackdrop(ctx, x, y, w, h, kind, seed) {
  const rng = makeRng(seed + 101);
  if (kind === 'club') {
    vGrad(ctx, x, y, w, h, [[0, '#3d0f4e'], [0.6, '#7a1660'], [1, '#2a0a38']]);
    ctx.fillStyle = 'rgba(255,90,200,0.30)'; ctx.fillRect(x + w * 0.08, y, w * 0.1, h);
    ctx.fillStyle = 'rgba(255,220,150,0.32)'; ctx.fillRect(x + w * 0.66, y + h * 0.12, w * 0.13, h * 0.36);
    for (let i = 0; i < 16; i++) softEllipse(ctx, x + rng() * w, y + rng() * h * 0.6, w * 0.05, w * 0.05, rng() > 0.5 ? 'rgba(255,120,220,1)' : 'rgba(140,220,255,1)', 0.25);
  } else if (kind === 'skyline') {
    vGrad(ctx, x, y, w, h, [[0, '#2c3a7a'], [0.55, '#7a4a9e'], [1, '#e8765a']]);
    ctx.fillStyle = 'rgba(18,16,48,0.9)';
    let bx = x;
    while (bx < x + w) { const bw = w * (0.05 + rng() * 0.09), bh = h * (0.25 + rng() * 0.4); ctx.fillRect(bx, y + h * 0.62 - bh, bw, bh); bx += bw + w * 0.012; }
    for (let i = 0; i < 130; i++) { ctx.fillStyle = `rgba(255,${200 + (rng() * 40) | 0},130,${0.35 + rng() * 0.6})`; ctx.fillRect(x + rng() * w, y + h * (0.25 + rng() * 0.35), Math.max(1.4, w * 0.006), Math.max(1.4, w * 0.006)); }
    for (let i = 0; i < 10; i++) softEllipse(ctx, x + rng() * w, y + rng() * h * 0.5, w * 0.06, w * 0.06, 'rgba(255,190,120,1)', 0.18);
  } else if (kind === 'beach') {
    vGrad(ctx, x, y, w, h, [[0, '#ffd98a'], [0.45, '#ff9e64'], [0.72, '#7ad0d8'], [1, '#3f9db8']]);
    softEllipse(ctx, x + w * 0.78, y + h * 0.3, w * 0.2, w * 0.2, 'rgba(255,246,200,1)', 0.8);
    palmSilhouette(ctx, x + w * 0.1, y + h * 0.66, h * 0.4, 'rgba(40,30,60,0.75)', seed + 3);
    palmSilhouette(ctx, x + w * 0.94, y + h * 0.6, h * 0.3, 'rgba(40,30,60,0.6)', seed + 4);
  } else if (kind === 'neon') {
    vGrad(ctx, x, y, w, h, [[0, '#12082b'], [0.7, '#33124f'], [1, '#180a30']]);
    const cols = ['rgba(255,45,150,0.75)', 'rgba(40,220,255,0.7)', 'rgba(255,190,60,0.7)'];
    for (let i = 0; i < 5; i++) { ctx.fillStyle = cols[i % 3]; ctx.fillRect(x + w * (0.06 + i * 0.19), y + h * (0.05 + (i % 2) * 0.12), w * 0.045, h * (0.3 + rng() * 0.2)); }
    for (let i = 0; i < 12; i++) softEllipse(ctx, x + rng() * w, y + rng() * h, w * 0.05, w * 0.05, cols[i % 3], 0.2);
  } else { // pier day
    vGrad(ctx, x, y, w, h, [[0, '#aee3f5'], [0.55, '#d9f2f2'], [0.56, '#4fc3c9'], [1, '#2b8fa8']]);
    speckle(ctx, x, y + h * 0.56, w, h * 0.44, 300, seed + 8, 'rgba(255,255,255,1)', 0.35, 1.3);
    ctx.fillStyle = 'rgba(120,84,50,0.9)'; ctx.fillRect(x, y + h * 0.86, w, h * 0.05);
  }
}

// A cast member: environment, then head-and-shoulders at moderate scale —
// the head is about a third of the panel height, world visible around it.
export function paintCharacter(ctx, x, y, w, h, c, seed) {
  envBackdrop(ctx, x, y, w, h, c.env, seed);
  const headH = h * 0.52, headW = headH * 0.4;
  const cx = x + w * (c.cx || 0.5), topY = y + h * Math.min(c.top || 0.16, 0.13);
  paintShoulders(ctx, cx, y + h * 1.02, headW, headH, c, seed);
  paintHead(ctx, cx, topY, headW, headH, c, seed);
  paintHair(ctx, cx, topY, headW, headH, c, seed);
  if (c.shades) paintSunglasses(ctx, cx, topY, headW, headH, seed);
}

export const CHARACTERS = [
  { id: 'poet', tag: 'THE TIDE POET', env: 'beach', cx: 0.5, top: 0.15, hairStyle: 'wavy', hair: '#5a2e1a', hairLight: '#a06638', hairDark: '#2e1509', skin: '#c98a5e', skinLight: '#eebd93', skinShadow: '#9c5f3a', iris: '#4a2c14', brow: '#3a1e0e', lip: '#b45a52', lipW: 0.3, gaze: 0.4, freckles: true, shades: true, clothKind: 'open', cloth: '#f2ead8', clothDark: '#c9bda2', under: '#26303c' },
  { id: 'captain', tag: 'THE FERRY CAPTAIN', env: 'skyline', cx: 0.52, top: 0.17, hairStyle: 'cropped', hair: '#b9bcc2', hairLight: '#e8eaee', hairDark: '#7e828c', skin: '#d9a075', skinLight: '#f2c9a0', skinShadow: '#b57a4e', iris: '#3c4a55', brow: '#8a8d94', lip: '#a86a58', lipW: 0.26, gaze: -0.2, stubble: true, clothKind: 'jacket', cloth: '#efe9dc', clothDark: '#c8bfa9' },
  { id: 'singer', tag: 'THE CASINO SINGER', env: 'club', cx: 0.48, top: 0.14, hairStyle: 'curly', hair: '#241014', hairLight: '#5c2e3a', hairDark: '#0e0608', skin: '#8a5638', skinLight: '#bd855c', skinShadow: '#63391f', iris: '#241408', brow: '#180a0c', lip: '#c04a5e', lipW: 0.32, gaze: 0.15, clothKind: 'sequin', cloth: '#7a1e4e', clothDark: '#47102e' },
  { id: 'chaser', tag: 'THE STORM CHASER', env: 'neon', cx: 0.5, top: 0.18, hairStyle: 'cropped', hair: '#33231a', hairLight: '#6b4a30', hairDark: '#170d08', skin: '#cf9468', skinLight: '#eec39c', skinShadow: '#a06a42', iris: '#2e2015', brow: '#241610', lip: '#a56652', lipW: 0.25, gaze: 0.55, stubble: true, clothKind: 'floral', cloth: '#31556e', clothDark: '#1d3547' },
  { id: 'chef', tag: 'THE DOCKSIDE CHEF', env: 'pier', cx: 0.46, top: 0.16, hairStyle: 'tied', hair: '#7a4416', hairLight: '#c07f36', hairDark: '#46250a', skin: '#e0aa76', skinLight: '#f7d3a6', skinShadow: '#bb7f4c', iris: '#54401e', brow: '#5c3410', lip: '#c06a5c', lipW: 0.29, gaze: 0.85, turn: 1, freckles: true, clothKind: 'plain', cloth: '#e8e2d2', clothDark: '#bdb29a' },
];

// ---------- the car, in its own panel ----------
export function paintCar(ctx, x, y, w, h, seed, body = '#e8487f') {
  const rng = makeRng(seed + 55);
  const gy = y + h * 0.8, cw = Math.min(w * 0.9, h * 2.45), cx0 = x + (w - cw) / 2, ch = h * 0.58;
  const topY = gy - ch;
  // wet reflection: flipped, smeared, darkened silhouette
  ctx.save(); ctx.globalAlpha = 0.4;
  ctx.translate(0, gy * 2 + ch * 0.32); ctx.scale(1, -0.5);
  carBodyPath(ctx, cx0, topY, cw, ch); ctx.fillStyle = 'rgba(30,16,44,0.9)'; ctx.fill();
  ctx.restore();
  for (let i = 0; i < 26; i++) { // ripple streaks in the reflection
    ctx.fillStyle = `rgba(${200 + rng() * 55},${90 + rng() * 60},${160 + rng() * 60},${0.05 + rng() * 0.12})`;
    ctx.fillRect(cx0 + rng() * cw, gy + rng() * h * 0.16, w * (0.02 + rng() * 0.09), Math.max(1, h * 0.006));
  }
  softEllipse(ctx, cx0 + cw / 2, gy + h * 0.015, cw * 0.52, h * 0.05, 'rgba(8,4,18,1)', 0.55);
  carBodyPath(ctx, cx0, topY, cw, ch);
  const g = ctx.createLinearGradient(0, topY, 0, gy);
  g.addColorStop(0, '#ffd7e8'); g.addColorStop(0.18, body); g.addColorStop(0.55, body); g.addColorStop(0.8, shadeOf(body, -38)); g.addColorStop(1, shadeOf(body, -70));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); carBodyPath(ctx, cx0, topY, cw, ch); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(cx0, topY + ch * 0.3, cw, ch * 0.07); // clearcoat band
  speckle(ctx, cx0, topY, cw, ch, 260, seed + 6, 'rgba(255,255,255,1)', 0.08, 1.1);
  // glasshouse: reflected sky, pillars, hinted seats
  const gx = cx0 + cw * 0.24, gw = cw * 0.46, gtop = topY + ch * 0.06, gbot = topY + ch * 0.4;
  ctx.beginPath();
  ctx.moveTo(gx, gbot); ctx.quadraticCurveTo(gx + gw * 0.08, gtop, gx + gw * 0.3, gtop + ch * 0.02);
  ctx.lineTo(gx + gw * 0.78, gtop + ch * 0.03); ctx.quadraticCurveTo(gx + gw * 0.97, gtop + ch * 0.1, gx + gw, gbot);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, gtop, 0, gbot);
  gg.addColorStop(0, '#ffe9b8'); gg.addColorStop(0.5, '#e88bb8'); gg.addColorStop(1, '#4a5f9e');
  ctx.fillStyle = gg; ctx.fill();
  ctx.fillStyle = 'rgba(30,20,40,0.55)';
  ctx.fillRect(gx + gw * 0.2, gbot - ch * 0.1, gw * 0.16, ch * 0.1); ctx.fillRect(gx + gw * 0.55, gbot - ch * 0.1, gw * 0.16, ch * 0.1);
  ctx.fillStyle = 'rgba(20,12,30,0.9)';
  ctx.fillRect(gx + gw * 0.47, gtop, cw * 0.012, gbot - gtop); ctx.fillRect(gx + gw * 0.06, gtop + ch * 0.04, cw * 0.01, gbot - gtop - ch * 0.04);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath(); ctx.moveTo(gx + gw * 0.1, gbot); ctx.lineTo(gx + gw * 0.42, gtop + ch * 0.02); ctx.lineTo(gx + gw * 0.52, gtop + ch * 0.02); ctx.lineTo(gx + gw * 0.2, gbot); ctx.closePath(); ctx.fill();
  // panel seams, door line, handle, mirror, badge
  ctx.strokeStyle = 'rgba(30,8,25,0.5)'; ctx.lineWidth = Math.max(1, ch * 0.014);
  ctx.beginPath(); ctx.moveTo(gx + gw * 0.52, gbot); ctx.lineTo(gx + gw * 0.52, gy - ch * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx0 + cw * 0.06, topY + ch * 0.52); ctx.quadraticCurveTo(cx0 + cw * 0.5, topY + ch * 0.58, cx0 + cw * 0.94, topY + ch * 0.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(gx + gw * 0.58, topY + ch * 0.47, cw * 0.055, ch * 0.045);
  ctx.fillStyle = shadeOf(body, -30); ctx.beginPath(); ctx.ellipse(gx + gw * 0.02, gbot - ch * 0.04, cw * 0.022, ch * 0.07, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(cx0 + cw * 0.86, topY + ch * 0.62, ch * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // lights with bloom
  softEllipse(ctx, cx0 + cw * 0.965, topY + ch * 0.52, cw * 0.05, ch * 0.16, 'rgba(255,240,190,1)', 0.85);
  softEllipse(ctx, cx0 + cw * 0.03, topY + ch * 0.5, cw * 0.035, ch * 0.12, 'rgba(255,80,90,1)', 0.8);
  // BOTH wheels, fully visible, each in a dark arch cut over the body
  for (const fx of [0.185, 0.815]) {
    ctx.fillStyle = '#0a0810';
    ctx.beginPath(); ctx.arc(cx0 + cw * fx, gy - ch * 0.16, ch * 0.335, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx0 + cw * fx - ch * 0.335, gy - ch * 0.16, ch * 0.67, ch * 0.17);
    paintWheel(ctx, cx0 + cw * fx, gy - ch * 0.16, ch * 0.30, seed + (fx > 0.5 ? 9 : 3));
  }
}
function carBodyPath(ctx, bx, by, bw, bh) {
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.02, by + bh * 0.62);
  ctx.quadraticCurveTo(bx + bw * 0.03, by + bh * 0.4, bx + bw * 0.14, by + bh * 0.36);
  ctx.quadraticCurveTo(bx + bw * 0.24, by + bh * 0.06, bx + bw * 0.42, by + bh * 0.02);
  ctx.lineTo(bx + bw * 0.66, by + bh * 0.03);
  ctx.quadraticCurveTo(bx + bw * 0.86, by + bh * 0.08, bx + bw * 0.95, by + bh * 0.3);
  ctx.quadraticCurveTo(bx + bw * 0.99, by + bh * 0.42, bx + bw * 0.985, by + bh * 0.62);
  ctx.quadraticCurveTo(bx + bw * 0.9, by + bh * 0.72, bx + bw * 0.9, by + bh * 0.84);
  ctx.lineTo(bx + bw * 0.03, by + bh * 0.84);
  ctx.quadraticCurveTo(bx, by + bh * 0.7, bx + bw * 0.02, by + bh * 0.62);
  ctx.closePath();
}
function paintWheel(ctx, cx, cy, r, seed) {
  const rng = makeRng(seed);
  ctx.fillStyle = '#0c0a10'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#4a4a55'); g.addColorStop(0.75, '#1c1a22'); g.addColorStop(1, '#060608');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,160,175,0.35)'; ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.lineTo(cx + Math.cos(a + 0.2) * r * 0.97, cy + Math.sin(a + 0.2) * r * 0.97); ctx.stroke(); }
  const rg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r * 0.62);
  rg.addColorStop(0, '#f4f6fa'); rg.addColorStop(0.6, '#9aa2b2'); rg.addColorStop(1, '#565e6e');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c3038';
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + rng() * 0.1; ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillRect(r * 0.1, -r * 0.075, r * 0.42, r * 0.15); ctx.restore(); }
  ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a828f'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.07, 0, Math.PI * 2); ctx.fill();
}
export function shadeOf(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ---------- six scenes, six skies ----------
function sceneDawn(ctx, x, y, w, h, seed) {
  vGrad(ctx, x, y, w, h, [[0, '#ffe3ae'], [0.34, '#ffb98a'], [0.52, '#ff8f7a'], [0.56, '#8fd4d2'], [0.75, '#4fb0bd'], [1, '#2f7f9d']]);
  softEllipse(ctx, x + w * 0.3, y + h * 0.5, w * 0.24, w * 0.24, 'rgba(255,248,205,1)', 0.95);
  speckle(ctx, x, y + h * 0.56, w, h * 0.3, 500, seed + 2, 'rgba(255,255,240,1)', 0.5, 1.4);
  ctx.fillStyle = '#f7d9a0'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.8);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.72, x + w, y + h * 0.84); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  speckle(ctx, x, y + h * 0.78, w, h * 0.22, 700, seed + 4, 'rgba(190,140,80,1)', 0.25, 1.3);
  palmSilhouette(ctx, x + w * 0.88, y + h * 0.84, h * 0.5, 'rgba(52,32,52,0.85)', seed + 6);
  drawFigure(ctx, x + w * 0.36, y + h * 0.94, h * 0.3, { skin: '#a06a42', hair: '#2c1a10', shirt: '#fdf3e0', pants: '#3a5a78', rim: 'rgba(255,220,170,0.9)' }, seed + 8);
  drawFigure(ctx, x + w * 0.44, y + h * 0.95, h * 0.27, { skin: '#7c4c2a', hair: '#120a06', shirt: '#ff7d9c', pants: '#f2ead8', rim: 'rgba(255,220,170,0.9)' }, seed + 10);
}
function sceneBay(ctx, x, y, w, h, seed) {
  vGrad(ctx, x, y, w, h, [[0, '#ffd166'], [0.3, '#ff7d9c'], [0.52, '#c44fd8'], [0.58, '#5a4fd0'], [0.62, '#3f8fb8'], [1, '#1f5f86']]);
  softEllipse(ctx, x + w * 0.62, y + h * 0.52, w * 0.2, w * 0.2, 'rgba(255,240,190,1)', 0.9);
  ctx.fillStyle = 'rgba(52,20,70,0.9)';
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.6); ctx.quadraticCurveTo(x + w * 0.2, y + h * 0.44, x + w * 0.38, y + h * 0.58); ctx.lineTo(x + w * 0.38, y + h * 0.62); ctx.lineTo(x, y + h * 0.64); ctx.closePath(); ctx.fill();
  palmSilhouette(ctx, x + w * 0.12, y + h * 0.62, h * 0.34, 'rgba(30,10,45,0.95)', seed + 3);
  speckle(ctx, x, y + h * 0.62, w, h * 0.38, 650, seed + 5, 'rgba(255,190,220,1)', 0.4, 1.3);
  const rng = makeRng(seed + 7);
  ctx.strokeStyle = 'rgba(30,15,50,0.8)'; ctx.lineWidth = Math.max(1, h * 0.008);
  for (let i = 0; i < 5; i++) { const bx = x + w * (0.15 + rng() * 0.6), by = y + h * (0.12 + rng() * 0.2), s = w * 0.02; ctx.beginPath(); ctx.moveTo(bx - s, by); ctx.quadraticCurveTo(bx - s * 0.3, by - s * 0.5, bx, by); ctx.quadraticCurveTo(bx + s * 0.3, by - s * 0.5, bx + s, by); ctx.stroke(); }
  // small boat with wake
  ctx.fillStyle = '#fdf6ec'; ctx.beginPath(); ctx.moveTo(x + w * 0.68, y + h * 0.74); ctx.lineTo(x + w * 0.78, y + h * 0.74); ctx.lineTo(x + w * 0.755, y + h * 0.78); ctx.lineTo(x + w * 0.695, y + h * 0.78); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(x + w * 0.68, y + h * 0.79); ctx.quadraticCurveTo(x + w * 0.6, y + h * 0.82, x + w * 0.52, y + h * 0.8); ctx.stroke();
}
function sceneNeon(ctx, x, y, w, h, seed) {
  vGrad(ctx, x, y, w, h, [[0, '#160a33'], [0.55, '#2c1150'], [0.56, '#241a3e'], [1, '#120a24']]);
  const rng = makeRng(seed + 11);
  const cols = ['#ff2d95', '#22d8ff', '#ffb03a', '#8dff57'];
  ctx.fillStyle = 'rgba(10,6,26,0.95)';
  let bx = x;
  while (bx < x + w) { const bw = w * (0.08 + rng() * 0.1), bh = h * (0.3 + rng() * 0.26); ctx.fillRect(bx, y + h * 0.56 - bh, bw, bh); bx += bw + w * 0.015; }
  for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[i % 4]; ctx.globalAlpha = 0.85; ctx.fillRect(x + w * (0.05 + i * 0.14), y + h * (0.1 + (i % 3) * 0.1), w * 0.02, h * (0.14 + rng() * 0.12)); ctx.globalAlpha = 1; softEllipse(ctx, x + w * (0.06 + i * 0.14), y + h * 0.24, w * 0.05, w * 0.05, cols[i % 4], 0.35); }
  // wet asphalt with smeared sign reflections
  for (let i = 0; i < 90; i++) { ctx.fillStyle = cols[(rng() * 4) | 0]; ctx.globalAlpha = 0.05 + rng() * 0.13; ctx.fillRect(x + rng() * w, y + h * (0.6 + rng() * 0.36), w * (0.008 + rng() * 0.02), h * (0.05 + rng() * 0.16)); }
  ctx.globalAlpha = 1;
  speckle(ctx, x, y + h * 0.58, w, h * 0.4, 350, seed + 13, 'rgba(200,210,255,1)', 0.14, 1.1);
  paintCar(ctx, x + w * 0.02, y + h * 0.30, w * 0.96, h * 0.66, seed, '#e8487f');
  for (let i = 0; i < 8; i++) softEllipse(ctx, x + rng() * w, y + h * (0.3 + rng() * 0.3), w * 0.09, h * 0.05, 'rgba(200,210,255,1)', 0.06); // steam haze
}
function sceneAerial(ctx, x, y, w, h, seed) {
  const rng = makeRng(seed + 17);
  vGrad(ctx, x, y, w, h, [[0, '#7fe0d4'], [0.5, '#2fbfae'], [1, '#12749e']]);
  speckle(ctx, x, y, w, h, 500, seed + 1, 'rgba(255,255,255,1)', 0.3, 1.2);
  // shallow sand patches in the water
  for (let i = 0; i < 6; i++) softEllipse(ctx, x + rng() * w, y + rng() * h, w * 0.14, h * 0.08, 'rgba(240,225,170,1)', 0.35);
  // landmass with a noise-eroded coastline — bays and points, never a blob
  const cx = x + w * 0.42, cy = y + h * 0.46;
  const coast = new Path2D();
  const NP = 90;
  for (let i = 0; i <= NP; i++) {
    const a = i / NP * Math.PI * 2;
    const erode = 1 + fbm(Math.cos(a) * 2.4 + 9, Math.sin(a) * 2.4 + 4, seed + 19, 4) * 0.42;
    const rx = w * 0.52 * erode, ry = h * 0.5 * erode;
    const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    if (i === 0) coast.moveTo(px, py); else coast.lineTo(px, py);
  }
  coast.closePath();
  const lg = ctx.createLinearGradient(x, y, x + w, y + h);
  lg.addColorStop(0, '#8fce62'); lg.addColorStop(0.55, '#5da24a'); lg.addColorStop(1, '#3c7d3e');
  ctx.fillStyle = lg; ctx.fill(coast);
  ctx.save(); ctx.clip(coast);
  speckle(ctx, x, y, w, h, 1600, seed + 23, 'rgba(30,70,25,1)', 0.20, 1.6);
  speckle(ctx, x, y, w, h, 700, seed + 29, 'rgba(230,220,150,1)', 0.16, 1.4);
  // rooftops inland
  for (let i = 0; i < 90; i++) {
    const px = cx + (rng() - 0.5) * w * 0.66, py = cy + (rng() - 0.5) * h * 0.6;
    if (fbm(px * 0.01, py * 0.01, seed + 19, 3) < -0.25) continue;
    ctx.save(); ctx.translate(px, py); ctx.rotate((rng() - 0.5) * 0.9);
    ctx.fillStyle = ['#e8e0cc', '#d98d5f', '#b8563f', '#e5cfa0'][(rng() * 4) | 0];
    ctx.fillRect(-w * 0.016, -h * 0.012, w * 0.032, h * 0.024); ctx.restore();
  }
  ctx.restore();
  // sand rim following the eroded edge
  ctx.strokeStyle = '#f2dda0'; ctx.lineWidth = Math.max(2, w * 0.02); ctx.stroke(coast);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = Math.max(1, w * 0.006); ctx.stroke(coast);
  // curving shore road with tiny shaded cars
  ctx.strokeStyle = '#5a5f6b'; ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const er = 1 + fbm(Math.cos(a) * 2.4 + 9, Math.sin(a) * 2.4 + 4, seed + 19, 4) * 0.42; const px = cx + Math.cos(a) * w * 0.44 * er, py = cy + Math.sin(a) * h * 0.42 * er; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, er = 1 + fbm(Math.cos(a) * 2.4 + 9, Math.sin(a) * 2.4 + 4, seed + 19, 4) * 0.42;
    const px = cx + Math.cos(a) * w * 0.44 * er, py = cy + Math.sin(a) * h * 0.42 * er;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px - w * 0.008, py, w * 0.02, h * 0.008);
    ctx.fillStyle = ['#ff5d7a', '#ffd166', '#fdf6ec', '#57c8ff'][(rng() * 4) | 0]; ctx.fillRect(px - w * 0.009, py - h * 0.006, w * 0.02, h * 0.009);
  }
  // crowd as CLUSTERED texture on the sand: dense patches, gaps, drift lines
  for (let cix = 0; cix < 9; cix++) {
    const a = rng() * Math.PI * 2, er = 1 + fbm(Math.cos(a) * 2.4 + 9, Math.sin(a) * 2.4 + 4, seed + 19, 4) * 0.42;
    const ccx = cx + Math.cos(a) * w * 0.5 * er, ccy = cy + Math.sin(a) * h * 0.48 * er;
    const cr = w * (0.03 + rng() * 0.045);
    for (let i = 0; i < 130; i++) {
      const d = Math.pow(rng(), 0.6) * cr, aa = rng() * Math.PI * 2;
      ctx.fillStyle = ['#7a4a2a', '#c98a5e', '#5a3220', '#e8e2d2', '#31556e'][(rng() * 5) | 0];
      ctx.globalAlpha = 0.5 + rng() * 0.5;
      ctx.fillRect(ccx + Math.cos(aa) * d, ccy + Math.sin(aa) * d * 0.7, Math.max(1.1, w * 0.004), Math.max(1.1, h * 0.005));
    }
    ctx.globalAlpha = 1;
    // umbrellas with their own offset shadows
    for (let u = 0; u < 4; u++) {
      const ux = ccx + (rng() - 0.5) * cr * 1.6, uy = ccy + (rng() - 0.5) * cr;
      ctx.fillStyle = 'rgba(60,40,20,0.4)'; ctx.beginPath(); ctx.ellipse(ux + w * 0.006, uy + h * 0.007, w * 0.011, h * 0.006, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ['#ff5d7a', '#ffd166', '#57c8ff', '#ff8c42'][(rng() * 4) | 0];
      ctx.beginPath(); ctx.ellipse(ux, uy, w * 0.011, h * 0.008, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // two boats with foaming wakes
  for (const [fx, fy, s] of [[0.82, 0.2, 1], [0.14, 0.82, 0.8]]) {
    const bx = x + w * fx, by = y + h * fy;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, h * 0.006);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - w * 0.07 * s, by + h * 0.03 * s, bx - w * 0.13 * s, by + h * 0.015 * s); ctx.stroke();
    ctx.fillStyle = '#fdf6ec'; ctx.beginPath(); ctx.moveTo(bx - w * 0.02 * s, by); ctx.lineTo(bx + w * 0.025 * s, by); ctx.lineTo(bx + w * 0.015 * s, by + h * 0.014 * s); ctx.lineTo(bx - w * 0.012 * s, by + h * 0.014 * s); ctx.closePath(); ctx.fill();
  }
}
function sceneSkyline(ctx, x, y, w, h, seed) {
  const rng = makeRng(seed + 37);
  vGrad(ctx, x, y, w, h, [[0, '#1d2a63'], [0.4, '#4a3f8f'], [0.58, '#c65d8f'], [0.62, '#2a4a72'], [1, '#12283f']]);
  ctx.fillStyle = '#0e1430';
  const bases = [];
  let bx = x;
  while (bx < x + w) { const bw = w * (0.045 + rng() * 0.07), bh = h * (0.2 + rng() * 0.36); ctx.fillRect(bx, y + h * 0.62 - bh, bw, bh); bases.push([bx, bw, bh]); bx += bw + w * 0.008; }
  for (const [px, bw, bh] of bases) {
    const cols = Math.max(2, (bw / (w * 0.012)) | 0), rows = Math.max(3, (bh / (h * 0.03)) | 0);
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
      if (rng() > 0.55) continue;
      ctx.fillStyle = `rgba(255,${190 + (rng() * 60) | 0},${110 + (rng() * 80) | 0},${0.4 + rng() * 0.6})`;
      const wx = px + w * 0.006 + cc * w * 0.011, wy = y + h * 0.62 - bh + h * 0.015 + r * h * 0.028;
      ctx.fillRect(wx, wy, w * 0.006, h * 0.011);
      if (rng() > 0.6) { ctx.globalAlpha = 0.3; ctx.fillRect(wx, y + h * 0.64 + rng() * h * 0.05, w * 0.006, h * (0.03 + rng() * 0.1)); ctx.globalAlpha = 1; }
    }
  }
  speckle(ctx, x, y + h * 0.62, w, h * 0.38, 500, seed + 39, 'rgba(160,200,255,1)', 0.2, 1.2);
  softEllipse(ctx, x + w * 0.5, y + h * 0.6, w * 0.5, h * 0.05, 'rgba(255,170,190,1)', 0.25);
}
function sceneRoad(ctx, x, y, w, h, seed) {
  vGrad(ctx, x, y, w, h, [[0, '#ffd98a'], [0.35, '#ffab5e'], [0.52, '#e86a92'], [0.56, '#7a6a8f'], [1, '#4a4258']]);
  softEllipse(ctx, x + w * 0.5, y + h * 0.5, w * 0.18, w * 0.18, 'rgba(255,246,200,1)', 0.9);
  ctx.fillStyle = '#8a7a52'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.56); ctx.lineTo(x + w * 0.42, y + h * 0.56); ctx.lineTo(x + w * 0.36, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6d7a4a'; ctx.beginPath(); ctx.moveTo(x + w, y + h); ctx.lineTo(x + w, y + h * 0.56); ctx.lineTo(x + w * 0.58, y + h * 0.56); ctx.lineTo(x + w * 0.64, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3f3d46'; ctx.beginPath(); ctx.moveTo(x + w * 0.36, y + h); ctx.lineTo(x + w * 0.42, y + h * 0.56); ctx.lineTo(x + w * 0.58, y + h * 0.56); ctx.lineTo(x + w * 0.64, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = Math.max(1, h * 0.008); ctx.setLineDash([h * 0.05, h * 0.05]);
  ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + h); ctx.lineTo(x + w * 0.5, y + h * 0.57); ctx.stroke(); ctx.setLineDash([]);
  // guardrail posts receding with perspective
  ctx.fillStyle = '#d8dce2';
  for (let i = 0; i < 8; i++) { const t = i / 8, px = x + w * (0.36 - t * 0.0) - w * 0.0, py = y + h * (1 - t * 0.42); const s = 1 - t * 0.75; ctx.fillRect(x + w * 0.345 - (1 - s) * w * 0.01, py - h * 0.05 * s, w * 0.008 * s + 1, h * 0.05 * s); ctx.fillRect(x + w * 0.645, py - h * 0.05 * s, w * 0.008 * s + 1, h * 0.05 * s); }
  ctx.save(); ctx.translate(x + w * 0.31, y + h * 0.52); ctx.scale(0.34, 0.34); ctx.translate(-x, -y);
  paintCar(ctx, x, y, w, h, seed + 2, '#3fb7c9'); ctx.restore();
  drawFigure(ctx, x + w * 0.8, y + h * 0.9, h * 0.16, { skin: '#8a5638', hair: '#1c1008', shirt: '#ffd166', pants: '#26303c' }, seed + 43);
}

export const SCENES = {
  dawn: { name: 'Dawn Beach', paint: sceneDawn },
  bay: { name: 'Sunset Bay', paint: sceneBay },
  neon: { name: 'Neon Night Street', paint: sceneNeon },
  aerial: { name: 'Aerial Coast', paint: sceneAerial },
  skyline: { name: 'Blue-Hour Skyline', paint: sceneSkyline },
  road: { name: 'Golden Coast Road', paint: sceneRoad },
};
export function paintScene(ctx, id, x, y, w, h, seed) {
  const c = CHARACTERS.find((k) => k.id === id);
  if (c) { paintCharacter(ctx, x, y, w, h, c, seed); return; }
  (SCENES[id] || SCENES.dawn).paint(ctx, x, y, w, h, seed);
}
