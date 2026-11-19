// samples.js — six original sample scenes for Vice Coast Cover Studio.
// Every scene is drawn procedurally on a 2D canvas from many layered shapes:
// graded skies, cloud bands with lit edges, haze layers that soften with
// distance, mid-ground shapes with soft shadows and dark sharp foregrounds.
// No photographs and no borrowed art: the scenes are the app's own pictures,
// rendered once onto offscreen canvases and then treated like loaded photos.

function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skyStops(ctx, w, h, stops, y0 = 0, y1 = null) {
  const g = ctx.createLinearGradient(0, y0, 0, y1 === null ? h : y1);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, (y1 === null ? h : y1) - y0);
  return g;
}

function glowDisc(ctx, x, y, r, core, halo) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, halo);
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();
}

function cloudBand(ctx, rng, w, y, scale, body, edge) {
  // A long soft cloud: many overlapping ellipses, then a thin lit rim along
  // the underside so the band reads as a photographed cloud, not a blob.
  const cy = y + rng() * scale * 0.4;
  ctx.fillStyle = body;
  for (let i = 0; i < 16; i++) {
    const cx = (i / 15) * w + (rng() - 0.5) * scale * 1.4;
    const rx = scale * (0.9 + rng() * 1.5);
    const ry = scale * (0.28 + rng() * 0.3);
    ctx.beginPath();
    ctx.ellipse(cx, cy + (rng() - 0.5) * scale * 0.3, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1.5, scale * 0.07);
  ctx.beginPath();
  ctx.ellipse(w * (0.3 + rng() * 0.4), cy + scale * 0.3, scale * 2.6, scale * 0.3, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function limb(ctx, x1, y1, x2, y2, width) {
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// A filled human silhouette in a walking pose: round head, tapered torso and
// thick rounded limbs set by a stride phase. Never a stick figure — every
// part carries real body width.
function walker(ctx, x, y, s, phase, colour, rim) {
  ctx.fillStyle = colour;
  const hipY = y - s * 0.52;
  const shoulderY = y - s * 0.86;
  const swing = Math.sin(phase) * s * 0.2;
  limb(ctx, x, hipY, x + swing, y - s * 0.26, s * 0.13);
  limb(ctx, x + swing, y - s * 0.26, x + swing * 1.5, y, s * 0.11);
  limb(ctx, x, hipY, x - swing, y - s * 0.24, s * 0.13);
  limb(ctx, x - swing, y - s * 0.24, x - swing * 0.6, y - s * 0.02, s * 0.11);
  ctx.beginPath(); // torso: a tapered quad from shoulders to hips
  ctx.moveTo(x - s * 0.11, shoulderY);
  ctx.lineTo(x + s * 0.11, shoulderY);
  ctx.lineTo(x + s * 0.08, hipY);
  ctx.lineTo(x - s * 0.09, hipY);
  ctx.closePath();
  ctx.fill();
  limb(ctx, x - s * 0.08, shoulderY + s * 0.05, x - s * 0.2 - swing * 0.5, y - s * 0.5, s * 0.1);
  limb(ctx, x + s * 0.08, shoulderY + s * 0.05, x + s * 0.22 + swing * 0.5, y - s * 0.52, s * 0.1);
  ctx.beginPath(); // head
  ctx.arc(x + s * 0.02, shoulderY - s * 0.13, s * 0.105, 0, Math.PI * 2);
  ctx.fill();
  if (rim) { // a sliver of sunset rim light down the front edge
    ctx.strokeStyle = rim;
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.arc(x + s * 0.02, shoulderY - s * 0.13, s * 0.105, -0.9, 0.7);
    ctx.stroke();
  }
}

// A palm drawn as a curved segmented trunk plus a crown of many individual
// tapered fronds, each frond its own two-curve filled shape.
export function palmSilhouette(ctx, x, y, s, lean, colour) {
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  const topX = x + lean * s;
  const topY = y - s;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.3, y - s * 0.6, topX, topY);
  ctx.stroke();
  ctx.lineWidth = s * 0.018; // trunk ring marks
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const px = x + (topX - x) * t + Math.sin(t * 2.2) * s * 0.01;
    const py = y - s * t;
    ctx.beginPath();
    ctx.moveTo(px - s * 0.035, py);
    ctx.lineTo(px + s * 0.035, py - s * 0.012);
    ctx.stroke();
  }
  for (let i = 0; i < 13; i++) { // fronds
    const ang = (-160 + i * 14 + (i % 3) * 4) * (Math.PI / 180);
    const len = s * (0.34 + (i % 4) * 0.05);
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len * 0.55 + len * 0.22;
    const mx = topX + Math.cos(ang) * len * 0.5;
    const my = topY + Math.sin(ang) * len * 0.4 - len * 0.12;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my - s * 0.012, ex, ey);
    ctx.quadraticCurveTo(mx, my + s * 0.02, topX, topY);
    ctx.fill();
  }
  ctx.beginPath(); // coconut pair
  ctx.arc(topX - s * 0.03, topY + s * 0.03, s * 0.028, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.035, topY + s * 0.045, s * 0.024, 0, Math.PI * 2);
  ctx.fill();
}

// A glossy side-on car: bezier body with a curved roofline, glasshouse,
// wheel arches, spoked rims, a lit headlamp and a soft ground shadow.
function glossyCar(ctx, x, y, s, paint, dark) {
  const w = s * 2.6, h = s;
  ctx.fillStyle = 'rgba(10,6,18,0.45)'; // ground shadow
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.06, w * 0.52, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createLinearGradient(0, y - h * 0.62, 0, y);
  body.addColorStop(0, paint);
  body.addColorStop(0.55, dark);
  body.addColorStop(1, paint);
  ctx.fillStyle = body;
  ctx.beginPath(); // body shell with a curved roof
  ctx.moveTo(x, y - h * 0.18);
  ctx.bezierCurveTo(x + w * 0.02, y - h * 0.44, x + w * 0.16, y - h * 0.5, x + w * 0.3, y - h * 0.52);
  ctx.bezierCurveTo(x + w * 0.38, y - h * 0.86, x + w * 0.52, y - h * 0.92, x + w * 0.66, y - h * 0.88);
  ctx.bezierCurveTo(x + w * 0.8, y - h * 0.84, x + w * 0.86, y - h * 0.55, x + w * 0.97, y - h * 0.46);
  ctx.bezierCurveTo(x + w * 1.01, y - h * 0.42, x + w, y - h * 0.2, x + w * 0.99, y - h * 0.16);
  ctx.lineTo(x + w * 0.86, y - h * 0.14);
  ctx.arc(x + w * 0.76, y - h * 0.1, w * 0.085, 0, Math.PI, true);
  ctx.lineTo(x + w * 0.32, y - h * 0.14);
  ctx.arc(x + w * 0.22, y - h * 0.1, w * 0.085, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(190,230,255,0.85)'; // glasshouse
  ctx.beginPath();
  ctx.moveTo(x + w * 0.4, y - h * 0.55);
  ctx.bezierCurveTo(x + w * 0.46, y - h * 0.8, x + w * 0.55, y - h * 0.84, x + w * 0.64, y - h * 0.8);
  ctx.bezierCurveTo(x + w * 0.72, y - h * 0.76, x + w * 0.76, y - h * 0.6, x + w * 0.78, y - h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; // roofline highlight streak
  ctx.fillRect(x + w * 0.3, y - h * 0.5, w * 0.55, h * 0.035);
  for (const wx of [0.22, 0.76]) { // wheels with rims and spokes
    ctx.fillStyle = '#0c0c12';
    ctx.beginPath(); ctx.arc(x + w * wx, y - h * 0.08, w * 0.078, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cfd6dd'; ctx.lineWidth = s * 0.016;
    ctx.beginPath(); ctx.arc(x + w * wx, y - h * 0.08, w * 0.048, 0, Math.PI * 2); ctx.stroke();
    for (let sp = 0; sp < 5; sp++) {
      const a = (sp / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + w * wx, y - h * 0.08);
      ctx.lineTo(x + w * wx + Math.cos(a) * w * 0.046, y - h * 0.08 + Math.sin(a) * w * 0.046);
      ctx.stroke();
    }
  }
  const hg = ctx.createRadialGradient(x + w * 0.99, y - h * 0.34, 2, x + w * 0.99, y - h * 0.34, s * 0.5);
  hg.addColorStop(0, 'rgba(255,240,190,0.95)');
  hg.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(x + w * 0.45, y - h * 0.85, w * 0.62, h * 0.95);
  ctx.fillStyle = '#ffeebb';
  ctx.fillRect(x + w * 0.965, y - h * 0.4, w * 0.03, h * 0.1);
}

// Fine multi-scale texture: large soft blotches plus a tiled fine grain and
// a gentle vignette, kept subtle so the scene's detail survives the grade.
function finishScene(ctx, rng, w, h, warm) {
  for (let i = 0; i < 26; i++) {
    const bx = rng() * w, by = rng() * h, br = (0.05 + rng() * 0.16) * w;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    const tone = rng() > 0.5 ? '255,240,220' : '20,10,40';
    g.addColorStop(0, `rgba(${tone},${0.05 + rng() * 0.05})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  ctx.fillStyle = warm;
  for (let i = 0; i < 900; i++) { // fine grain flecks
    ctx.globalAlpha = 0.03 + rng() * 0.06;
    ctx.fillRect(rng() * w, rng() * h, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,4,18,0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function sparkles(ctx, rng, x0, y0, x1, y1, n, colour) {
  ctx.fillStyle = colour;
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (y1 - y0);
    const len = 2 + rng() * 9 * (0.4 + (y - y0) / Math.max(1, y1 - y0));
    ctx.globalAlpha = 0.25 + rng() * 0.65;
    ctx.fillRect(x, y, len, 1.4);
  }
  ctx.globalAlpha = 1;
}

// (a) Beach at sunset: two walkers, long shadows, sparkling water, palms.
function sceneBeach(ctx, w, h, rng) {
  skyStops(ctx, w, h, [[0, '#2c1a56'], [0.3, '#8e2a63'], [0.52, '#e8506a'], [0.68, '#ff8b4d'], [0.8, '#ffc46b'], [1, '#ffe3a1']]);
  glowDisc(ctx, w * 0.62, h * 0.66, w * 0.34, '#fff3c4', 'rgba(255,170,80,0.55)');
  cloudBand(ctx, rng, w, h * 0.1, h * 0.05, 'rgba(70,30,90,0.5)', 'rgba(255,170,120,0.7)');
  cloudBand(ctx, rng, w, h * 0.24, h * 0.04, 'rgba(120,40,90,0.42)', 'rgba(255,190,130,0.65)');
  cloudBand(ctx, rng, w, h * 0.4, h * 0.035, 'rgba(200,80,90,0.35)', 'rgba(255,210,150,0.8)');
  ctx.fillStyle = 'rgba(255,205,140,0.28)'; // far haze over the horizon
  ctx.fillRect(0, h * 0.6, w, h * 0.1);
  skyStops(ctx, w, h, [[0, 'rgba(30,60,110,0)'], [1, 'rgba(24,40,90,0.55)']], h * 0.68, h * 0.86); // sea
  ctx.fillStyle = '#31456e';
  ctx.fillRect(0, h * 0.68, w, h * 0.18);
  const sg = ctx.createLinearGradient(0, h * 0.68, 0, h * 0.86); // sun path on water
  sg.addColorStop(0, 'rgba(255,190,110,0.75)');
  sg.addColorStop(1, 'rgba(255,140,90,0.08)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.68); ctx.lineTo(w * 0.72, h * 0.68);
  ctx.lineTo(w * 0.8, h * 0.86); ctx.lineTo(w * 0.44, h * 0.86);
  ctx.closePath(); ctx.fill();
  sparkles(ctx, rng, w * 0.06, h * 0.7, w * 0.96, h * 0.85, 210, '#ffe9bb');
  skyStops(ctx, w, h, [[0, '#caa06a'], [1, '#8a5f3a']], h * 0.86, h); // wet sand
  ctx.fillStyle = 'rgba(255,220,170,0.35)';
  ctx.fillRect(0, h * 0.86, w, h * 0.02);
  for (const [px, ps, lean] of [[0.06, 0.52, 0.16], [0.95, 0.62, -0.2], [0.86, 0.3, -0.1]]) {
    palmSilhouette(ctx, w * px, h * 0.9, h * ps, lean, '#1c1030');
  }
  for (const [wx, ws, ph] of [[0.4, 0.3, 0.6], [0.47, 0.29, 2.4]]) { // the two walkers
    ctx.fillStyle = 'rgba(30,12,40,0.35)'; // long soft shadow first
    ctx.beginPath();
    ctx.ellipse(w * wx + ws * h * 0.34, h * 0.965, ws * h * 0.42, h * 0.016, 0.1, 0, Math.PI * 2);
    ctx.fill();
    walker(ctx, w * wx, h * 0.96, h * ws, ph, '#241038', 'rgba(255,170,100,0.8)');
  }
  ctx.strokeStyle = 'rgba(30,16,50,0.8)'; // distant birds
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const bx = w * (0.12 + rng() * 0.4), by = h * (0.14 + rng() * 0.16), bs = 5 + rng() * 6;
    ctx.beginPath();
    ctx.arc(bx - bs, by, bs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(bx + bs, by, bs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  finishScene(ctx, rng, w, h, '#ffd9a0');
}

// (b) Neon night street: glossy car, wet asphalt reflections, lit signs.
function sceneNeon(ctx, w, h, rng) {
  skyStops(ctx, w, h, [[0, '#070818'], [0.45, '#181040'], [0.75, '#3a1660'], [1, '#571d5e']]);
  const signs = ['#ff2e88', '#22d3ee', '#ffb020', '#7c5cff', '#2effa8'];
  for (const side of [0, 1]) { // two building faces in perspective rows
    const bx = side === 0 ? 0 : w * 0.78;
    ctx.fillStyle = side === 0 ? '#0d0d24' : '#100a26';
    ctx.fillRect(bx, h * 0.06, w * 0.22, h * 0.62);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { // lit windows
      if (rng() < 0.45) continue;
      ctx.fillStyle = rng() > 0.3 ? 'rgba(255,214,140,0.9)' : 'rgba(160,225,255,0.9)';
      ctx.globalAlpha = 0.35 + rng() * 0.6;
      ctx.fillRect(bx + w * 0.02 + c * w * 0.05, h * (0.1 + r * 0.08), w * 0.032, h * 0.045);
    }
    ctx.globalAlpha = 1;
    for (let sIdx = 0; sIdx < 3; sIdx++) { // glowing shop signs: bars of neon
      const sx = bx + w * 0.015 + sIdx * w * 0.012, sy = h * (0.16 + sIdx * 0.17);
      const col = signs[Math.floor(rng() * signs.length)];
      ctx.shadowColor = col; ctx.shadowBlur = 18;
      ctx.fillStyle = col;
      ctx.fillRect(sx, sy, w * 0.012, h * (0.08 + rng() * 0.05));
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let b = 0; b < 3; b++) ctx.fillRect(sx + w * 0.02, sy + b * h * 0.03, w * (0.05 + rng() * 0.05), h * 0.012);
    }
  }
  ctx.fillStyle = '#0a0a1c'; // centre tower, hazier
  ctx.fillRect(w * 0.3, h * 0.02, w * 0.4, h * 0.5);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rng() > 0.4 ? 'rgba(255,220,160,0.8)' : 'rgba(150,220,255,0.8)';
    ctx.globalAlpha = 0.2 + rng() * 0.7;
    ctx.fillRect(w * (0.32 + rng() * 0.36), h * (0.05 + rng() * 0.42), 3.5, 5);
  }
  ctx.globalAlpha = 1;
  // One big round neon sign on the tower face, with a ring and inner bars.
  const nx = w * 0.5, ny = h * 0.26, nr = w * 0.085;
  ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 26;
  ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#7df9ff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(nx, ny, nr * 0.68, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffe9f6';
  for (let b = 0; b < 3; b++) ctx.fillRect(nx - nr * 0.42, ny - nr * 0.3 + b * nr * 0.3, nr * (0.84 - b * 0.18), 4);
  skyStops(ctx, w, h, [[0, '#141428'], [1, '#05050f']], h * 0.68, h); // wet asphalt
  for (let i = 0; i < 46; i++) { // smeared colour reflections on the wet road
    const col = signs[Math.floor(rng() * signs.length)];
    const rx = rng() * w, rw = 3 + rng() * 15, ry = h * (0.7 + rng() * 0.26);
    const g = ctx.createLinearGradient(0, ry, 0, ry + h * 0.12);
    g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.globalAlpha = 0.16 + rng() * 0.25;
    ctx.fillRect(rx, ry, rw, h * 0.12);
  }
  ctx.globalAlpha = 1;
  glossyCar(ctx, w * 0.3, h * 0.82, h * 0.3, '#e8365d', '#7c1030');
  walker(ctx, w * 0.16, h * 0.8, h * 0.24, 1.2, '#0a0a18', 'rgba(255,46,136,0.7)');
  walker(ctx, w * 0.88, h * 0.78, h * 0.21, 3.4, '#0a0a18', 'rgba(34,211,238,0.7)');
  for (const lx of [0.26, 0.74]) { // street lamps
    const lg = ctx.createRadialGradient(w * lx, h * 0.3, 2, w * lx, h * 0.3, w * 0.09);
    lg.addColorStop(0, 'rgba(190,240,255,0.9)'); lg.addColorStop(1, 'rgba(190,240,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(w * lx - w * 0.09, h * 0.2, w * 0.18, h * 0.2);
    ctx.fillStyle = '#05050f'; ctx.fillRect(w * lx - 1.5, h * 0.3, 3, h * 0.38);
  }
  sparkles(ctx, rng, 0, h * 0.7, w, h * 0.98, 120, '#cfe8ff');
  finishScene(ctx, rng, w, h, '#9fd8ff');
}

// (c) Palm-lined coastal road at golden hour, a small car, heat haze.
function sceneCoast(ctx, w, h, rng) {
  skyStops(ctx, w, h, [[0, '#3a2a6e'], [0.35, '#c65a7a'], [0.62, '#ff9455'], [0.85, '#ffc978'], [1, '#ffe9ad']]);
  glowDisc(ctx, w * 0.3, h * 0.52, w * 0.3, '#fff0bf', 'rgba(255,175,90,0.5)');
  cloudBand(ctx, rng, w, h * 0.12, h * 0.045, 'rgba(90,40,100,0.45)', 'rgba(255,180,120,0.7)');
  cloudBand(ctx, rng, w, h * 0.3, h * 0.035, 'rgba(160,60,90,0.35)', 'rgba(255,200,140,0.75)');
  ctx.fillStyle = '#7ec8c0'; // sea on the right, behind the headland
  ctx.beginPath();
  ctx.moveTo(w * 0.62, h * 0.55); ctx.lineTo(w, h * 0.5); ctx.lineTo(w, h * 0.78); ctx.lineTo(w * 0.7, h * 0.8);
  ctx.closePath(); ctx.fill();
  sparkles(ctx, rng, w * 0.68, h * 0.56, w * 0.99, h * 0.76, 130, '#fff3cf');
  ctx.fillStyle = 'rgba(46,32,74,0.75)'; // hazy headland
  ctx.beginPath();
  ctx.moveTo(0, h * 0.58);
  ctx.bezierCurveTo(w * 0.2, h * 0.46, w * 0.42, h * 0.5, w * 0.66, h * 0.56);
  ctx.lineTo(w * 0.66, h * 0.62); ctx.lineTo(0, h * 0.64);
  ctx.closePath(); ctx.fill();
  const rg = ctx.createLinearGradient(0, h * 0.6, 0, h); // the road, in perspective
  rg.addColorStop(0, '#5a4a52'); rg.addColorStop(1, '#241c2c');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.6); ctx.lineTo(w * 0.58, h * 0.6);
  ctx.lineTo(w * 1.02, h); ctx.lineTo(w * -0.1, h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,160,0.9)'; // dashed centre line, widening
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const t = i / 6, y = h * (0.63 + t * 0.35), len = h * (0.012 + t * 0.05);
    ctx.lineWidth = 2 + t * 9;
    ctx.beginPath();
    ctx.moveTo(w * (0.47 + t * 0.06), y);
    ctx.lineTo(w * (0.47 + t * 0.06), y + len);
    ctx.stroke();
  }
  ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = 3; // guardrail: posts + rail
  ctx.beginPath();
  ctx.moveTo(w * 0.6, h * 0.62); ctx.lineTo(w * 0.99, h * 0.99); ctx.stroke();
  ctx.fillStyle = '#d8d2c4';
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    ctx.fillRect(w * (0.62 + t * 0.34), h * (0.63 + t * 0.35), 3 + t * 5, h * (0.03 + t * 0.07));
  }
  glossyCar(ctx, w * 0.4, h * 0.68, h * 0.1, '#ffd23f', '#a86e10');
  for (let i = 0; i < 7; i++) { // palm row shrinking toward the horizon
    const t = i / 7;
    palmSilhouette(ctx, w * (0.05 + t * 0.24), h * (0.66 + t * 0.3), h * (0.34 - t * 0.17), 0.14, '#221236');
  }
  ctx.fillStyle = 'rgba(255,230,190,0.13)'; // heat haze bands over the road
  for (let i = 0; i < 4; i++) ctx.fillRect(0, h * (0.6 + i * 0.05), w, h * 0.014);
  finishScene(ctx, rng, w, h, '#ffdf9e');
}

// (d) Dusk skyline across water: hundreds of lit windows, shimmering below.
function sceneSkyline(ctx, w, h, rng) {
  skyStops(ctx, w, h, [[0, '#0d1033'], [0.4, '#33255e'], [0.66, '#7a3069'], [0.85, '#d65a6e'], [1, '#ff9a5c']]);
  glowDisc(ctx, w * 0.82, h * 0.2, w * 0.12, '#f4f6ff', 'rgba(200,215,255,0.35)');
  cloudBand(ctx, rng, w, h * 0.16, h * 0.03, 'rgba(30,24,70,0.55)', 'rgba(255,150,110,0.5)');
  cloudBand(ctx, rng, w, h * 0.34, h * 0.028, 'rgba(50,30,90,0.45)', 'rgba(255,170,120,0.55)');
  const waterY = h * 0.62;
  const layers = [
    { base: waterY, col: 'rgba(52,38,92,0.85)', min: 0.16, max: 0.34, win: 0.25 },
    { base: waterY, col: '#171233', min: 0.24, max: 0.52, win: 0.6 },
  ];
  for (const L of layers) { // tower rows with lit windows of varied brightness
    let x = -w * 0.02;
    while (x < w * 1.02) {
      const tw = w * (0.04 + rng() * 0.07);
      const th = h * (L.min + rng() * (L.max - L.min));
      ctx.fillStyle = L.col;
      ctx.fillRect(x, L.base - th, tw, th);
      if (rng() > 0.6) ctx.fillRect(x + tw * 0.3, L.base - th - h * 0.03, tw * 0.4, h * 0.03); // crown
      for (let wy = L.base - th + 5; wy < L.base - 6; wy += 8) {
        for (let wx = x + 3; wx < x + tw - 4; wx += 7) {
          if (rng() > L.win) continue;
          ctx.fillStyle = rng() > 0.25 ? '#ffd98c' : '#a8dcff';
          ctx.globalAlpha = 0.25 + rng() * 0.75;
          ctx.fillRect(wx, wy, 3.4, 4.4);
        }
      }
      ctx.globalAlpha = 1;
      x += tw + w * (0.004 + rng() * 0.014);
    }
  }
  skyStops(ctx, w, h, [[0, '#1a1440'], [1, '#0a0c26']], waterY, h); // water
  for (let i = 0; i < 300; i++) { // reflection shimmer under the towers
    const x = rng() * w, y = waterY + 4 + Math.pow(rng(), 1.6) * (h - waterY - 8);
    ctx.fillStyle = rng() > 0.3 ? '#ffcf8a' : '#9fd4ff';
    ctx.globalAlpha = 0.12 + rng() * 0.5 * (1 - (y - waterY) / (h - waterY));
    ctx.fillRect(x, y, 4 + rng() * 16, 1.8);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a0a20'; // a small boat with cabin lights
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.8); ctx.lineTo(w * 0.24, h * 0.8); ctx.lineTo(w * 0.215, h * 0.83); ctx.lineTo(w * 0.145, h * 0.83);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(w * 0.155, h * 0.765, w * 0.045, h * 0.035);
  ctx.fillStyle = '#ffd98c'; ctx.fillRect(w * 0.165, h * 0.772, 4, 4); ctx.fillRect(w * 0.18, h * 0.772, 4, 4);
  finishScene(ctx, rng, w, h, '#bcd6ff');
}

// (e) Boardwalk portrait: one large foreground figure in sunglasses, in
// profile against a bright sunset, railing and beach behind.
function scenePortrait(ctx, w, h, rng) {
  skyStops(ctx, w, h, [[0, '#472a7a'], [0.34, '#b83a6e'], [0.6, '#ff6a55'], [0.82, '#ffa94f'], [1, '#ffd97e']]);
  glowDisc(ctx, w * 0.3, h * 0.44, w * 0.4, '#fff3c0', 'rgba(255,175,85,0.6)');
  cloudBand(ctx, rng, w, h * 0.12, h * 0.04, 'rgba(80,35,100,0.45)', 'rgba(255,185,125,0.7)');
  cloudBand(ctx, rng, w, h * 0.28, h * 0.032, 'rgba(140,50,95,0.38)', 'rgba(255,205,145,0.75)');
  ctx.fillStyle = '#2d4a72'; // sea strip
  ctx.fillRect(0, h * 0.58, w, h * 0.13);
  sparkles(ctx, rng, w * 0.02, h * 0.6, w * 0.6, h * 0.7, 90, '#ffe9bb');
  ctx.fillStyle = '#caa06a'; // beach
  ctx.fillRect(0, h * 0.71, w, h * 0.29);
  walker(ctx, w * 0.14, h * 0.78, h * 0.13, 0.4, 'rgba(30,16,44,0.85)', null);
  walker(ctx, w * 0.2, h * 0.79, h * 0.12, 2.1, 'rgba(30,16,44,0.85)', null);
  palmSilhouette(ctx, w * 0.05, h * 0.86, h * 0.34, 0.18, '#1e1132');
  ctx.fillStyle = '#120a24'; // boardwalk railing across the middle ground
  ctx.fillRect(0, h * 0.68, w, h * 0.014);
  ctx.fillRect(0, h * 0.735, w, h * 0.012);
  for (let i = 0; i < 12; i++) ctx.fillRect(w * (0.02 + i * 0.085), h * 0.68, w * 0.008, h * 0.075);
  // The figure: shoulders and shirt fill the lower right, head in profile.
  const fx = w * 0.66, fy = h * 0.52, fs = h;
  const shirt = ctx.createLinearGradient(0, fy, 0, h);
  shirt.addColorStop(0, '#ff5d7a'); shirt.addColorStop(0.5, '#e83a63'); shirt.addColorStop(1, '#8e1e46');
  ctx.fillStyle = shirt;
  ctx.beginPath(); // torso: broad shoulders tapering to the frame edge
  ctx.moveTo(fx - fs * 0.05, h);
  ctx.bezierCurveTo(fx - fs * 0.02, fy + fs * 0.2, fx + fs * 0.04, fy + fs * 0.13, fx + fs * 0.1, fy + fs * 0.1);
  ctx.bezierCurveTo(fx + fs * 0.3, fy + fs * 0.04, fx + fs * 0.44, fy + fs * 0.16, fx + fs * 0.46, h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; // shirt flower pattern dots
  for (let i = 0; i < 26; i++) {
    const px = fx + rng() * fs * 0.4, py = fy + fs * 0.16 + rng() * fs * 0.4;
    ctx.beginPath(); ctx.arc(px, py, 2.6 + rng() * 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f2a97e'; // neck and jaw
  ctx.fillRect(fx + fs * 0.07, fy - fs * 0.02, fs * 0.07, fs * 0.13);
  ctx.beginPath(); // head in profile, facing left toward the sun
  ctx.ellipse(fx + fs * 0.1, fy - fs * 0.1, fs * 0.105, fs * 0.125, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // nose and chin profile bumps
  ctx.ellipse(fx - fs * 0.005, fy - fs * 0.085, fs * 0.03, fs * 0.022, 0, 0, Math.PI * 2);
  ctx.ellipse(fx + fs * 0.01, fy - fs * 0.028, fs * 0.026, fs * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241126'; // hair swept back
  ctx.beginPath();
  ctx.ellipse(fx + fs * 0.125, fy - fs * 0.16, fs * 0.1, fs * 0.075, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(fx + fs * 0.16, fy - fs * 0.14, fs * 0.035, fs * 0.16);
  ctx.fillStyle = '#0c0c16'; // sunglasses with a sunset glint
  ctx.beginPath();
  ctx.ellipse(fx + fs * 0.035, fy - fs * 0.105, fs * 0.052, fs * 0.034, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd98c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(fx - fs * 0.01, fy - fs * 0.12); ctx.lineTo(fx + fs * 0.05, fy - fs * 0.095); ctx.stroke();
  ctx.strokeStyle = '#e8b23a'; // gold chain and hoop earring glints
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(fx + fs * 0.1, fy + fs * 0.06, fs * 0.045, 0.4, 2.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx + fs * 0.145, fy - fs * 0.045, fs * 0.016, 0, Math.PI * 2); ctx.stroke();
  finishScene(ctx, rng, w, h, '#ffd9a0');
}

// (f) Aerial coast: curving shoreline, turquoise shallows, boat and wake.
function sceneAerial(ctx, w, h, rng) {
  const sea = ctx.createLinearGradient(0, 0, w, h);
  sea.addColorStop(0, '#7fe0d4'); sea.addColorStop(0.45, '#2fb3c9'); sea.addColorStop(1, '#1668a8');
  ctx.fillStyle = sea; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { // depth patches in the shallows
    ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,240,0.16)' : 'rgba(4,44,96,0.22)';
    ctx.beginPath();
    ctx.ellipse(rng() * w * 0.7, rng() * h, (0.04 + rng() * 0.12) * w, (0.02 + rng() * 0.06) * h, rng(), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(240,255,250,0.5)'; // wave lines rolling in the shallows
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const wy = rng() * h;
    ctx.beginPath();
    ctx.moveTo(rng() * w * 0.2, wy);
    ctx.bezierCurveTo(w * 0.25, wy - 8, w * 0.35, wy + 8, w * (0.45 + rng() * 0.15), wy - 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#f4dfae'; // the curving sand shore
  ctx.beginPath();
  ctx.moveTo(w * 0.55, 0);
  ctx.bezierCurveTo(w * 0.7, h * 0.3, w * 0.5, h * 0.55, w * 0.72, h * 0.8);
  ctx.bezierCurveTo(w * 0.8, h * 0.92, w * 0.86, h, w * 0.88, h);
  ctx.lineTo(w, h); ctx.lineTo(w, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; // foam edge along the waterline
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.55, 0);
  ctx.bezierCurveTo(w * 0.7, h * 0.3, w * 0.5, h * 0.55, w * 0.72, h * 0.8);
  ctx.bezierCurveTo(w * 0.8, h * 0.92, w * 0.86, h, w * 0.88, h);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 7;
  ctx.stroke();
  for (let i = 0; i < 9; i++) { // tiny beach umbrellas and bathers on the sand
    const t = i / 9, ux = w * (0.78 + (rng() - 0.5) * 0.1), uy = h * (0.08 + t * 0.85);
    const cols = ['#ff5d7a', '#ffb020', '#22d3ee', '#ff7a3c', '#7c5cff'];
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.arc(ux, uy, 7 + rng() * 3, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(60,35,20,0.8)';
    ctx.fillRect(ux + 8, uy + 5, 3, 2); ctx.fillRect(ux - 12, uy + 7, 3, 2);
  }
  const bx = w * 0.3, by = h * 0.38; // boat with a white V wake
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(bx - w * 0.2, by + h * 0.16);
  ctx.moveTo(bx, by); ctx.lineTo(bx - w * 0.05, by + h * 0.22);
  ctx.stroke();
  sparkles(ctx, rng, bx - w * 0.2, by, bx, by + h * 0.2, 40, '#ffffff');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(bx, by, w * 0.045, h * 0.02, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8365d'; ctx.fillRect(bx - w * 0.012, by - h * 0.016, w * 0.024, h * 0.014);
  for (let i = 0; i < 6; i++) palmSilhouette(ctx, w * (0.9 + rng() * 0.06), h * (0.15 + i * 0.14), h * 0.09, -0.2, 'rgba(20,80,50,0.55)');
  sparkles(ctx, rng, 0, 0, w * 0.6, h, 120, '#eafffb');
  finishScene(ctx, rng, w, h, '#eafffb');
}

export const SAMPLE_SCENES = [
  { id: 'beach', name: 'Sunset Beach', draw: sceneBeach },
  { id: 'neon', name: 'Neon Street', draw: sceneNeon },
  { id: 'coast', name: 'Coastal Road', draw: sceneCoast },
  { id: 'skyline', name: 'Dusk Skyline', draw: sceneSkyline },
  { id: 'portrait', name: 'Boardwalk Portrait', draw: scenePortrait },
  { id: 'aerial', name: 'Aerial Coast', draw: sceneAerial },
];

// Render one scene onto a fresh canvas at the asked size; the editor then
// treats that canvas exactly like a photo the visitor loaded.
export function renderSampleScene(sceneId, width = 960, height = 720) {
  const scene = SAMPLE_SCENES.find((s) => s.id === sceneId) || SAMPLE_SCENES[0];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  scene.draw(ctx, width, height, makeRng(1234 + sceneId.length * 777 + sceneId.charCodeAt(0) * 31));
  return canvas;
}
