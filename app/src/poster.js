// Poster finish + lettering + dressing for Vice Coast covers.
// The finish is deliberately LIGHT: a photo pass (S-curve, gentle bloom,
// fine grain) first, then posterize into many levels, a brightness ramp
// grade, and a halftone that whispers instead of shouting — so continuous
// tone from the scenes and from real photos survives into the print.

import { makeCanvas, mulberry32, rgba } from './samples.js';

export const GRADES = [
  { id: 'sunset', name: 'Sunset', stops: [[0, '#1d1030'], [0.28, '#7a2350'], [0.52, '#e84a6e'], [0.74, '#f78c4e'], [0.9, '#ffc46b'], [1, '#fff3cf']] },
  { id: 'neon', name: 'Neon', stops: [[0, '#0a0620'], [0.3, '#3a1470'], [0.55, '#b02a9e'], [0.78, '#ff4d9e'], [0.92, '#39d5e8'], [1, '#eafcff']] },
  { id: 'golden', name: 'Golden', stops: [[0, '#241108'], [0.3, '#7a3410'], [0.55, '#d9762e'], [0.78, '#ffb02e'], [0.93, '#ffd98c'], [1, '#fff8e2']] },
  { id: 'miami', name: 'Miami', stops: [[0, '#06222e'], [0.3, '#0e5e6e'], [0.55, '#2fb3b8'], [0.78, '#f78fb0'], [0.92, '#ffc4d6'], [1, '#fff6ec']] },
  { id: 'viceblue', name: 'Vice Blue', stops: [[0, '#040a24'], [0.3, '#122a6e'], [0.55, '#2a5ec2'], [0.78, '#5ea8e8'], [0.93, '#bfe2ff'], [1, '#f2faff']] },
  { id: 'comic', name: 'Comic Ink', stops: [[0, '#101018'], [0.42, '#23233a'], [0.52, '#e8e2d2'], [0.62, '#f2c230'], [0.8, '#e84a2e'], [1, '#fff6da']], duotone: true },
];

export function gradeById(id) { return GRADES.find((g) => g.id === id) || GRADES[0]; }

function rampLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops.map(([at, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    return [at, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i][0] && t <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    lut[v * 3] = Math.round(a[1] + (b[1] - a[1]) * f);
    lut[v * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    lut[v * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  return lut;
}
const lutCache = new Map();
export function lutFor(grade) {
  if (!lutCache.has(grade.id)) lutCache.set(grade.id, rampLut(grade));
  return lutCache.get(grade.id);
}

// Photo finish + poster grade on one panel canvas (mutates a copy).
export function finishPanel(source, w, h, opts) {
  const { grade, ink = 0.55, grain = 0.5, seed = 3 } = opts;
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);
  // gentle bloom: bright copy, blurred, screened back at low strength
  const bloomAmt = 0.10 + ink * 0.14;
  const bc = makeCanvas(Math.max(2, w >> 2), Math.max(2, h >> 2));
  bc.getContext('2d').drawImage(out, 0, 0, bc.width, bc.height);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = bloomAmt;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bc, 0, 0, w, h);
  ctx.drawImage(bc, 0, 0, w, h);
  ctx.restore();
  // per-pixel: S-curve, posterize (many levels), ramp map, fine grain
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = lutFor(grade);
  const levels = grade.duotone ? 5 : 8;
  const posterAmt = grade.duotone ? Math.min(1, ink + 0.25) : ink;
  const rand = mulberry32(seed * 7919 + w);
  const grainAmt = grain * 11;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    // slight contrast S-curve keeps the photograph photographic
    r = r * r * (3 - 2 * r) * 0.24 + r * 0.76;
    g = g * g * (3 - 2 * g) * 0.24 + g * 0.76;
    b = b * b * (3 - 2 * b) * 0.24 + b * 0.76;
    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // posterize the luminance into many smooth steps, blended by ink
    const step = Math.round(lum * (levels - 1)) / (levels - 1);
    lum = lum + (step - lum) * posterAmt;
    const li = Math.max(0, Math.min(255, Math.round(lum * 255)));
    const mr = lut[li * 3] / 255, mg = lut[li * 3 + 1] / 255, mb = lut[li * 3 + 2] / 255;
    // keep most of the photo's own colour; the ramp tints and unifies
    const keep = grade.duotone ? 0.18 : 0.52;
    const mixAmt = 1 - keep;
    // a touch of saturation so graded panels stay vivid, never washed out
    let nr = (r * keep + mr * mixAmt), ng = (g * keep + mg * mixAmt), nb = (b * keep + mb * mixAmt);
    const mid = (nr + ng + nb) / 3;
    nr = mid + (nr - mid) * 1.14; ng = mid + (ng - mid) * 1.14; nb = mid + (nb - mid) * 1.14;
    const n = (rand() - 0.5) * 2 * grainAmt / 255;
    d[i] = Math.max(0, Math.min(255, (nr + n) * 255));
    d[i + 1] = Math.max(0, Math.min(255, (ng + n) * 255));
    d[i + 2] = Math.max(0, Math.min(255, (nb + n) * 255));
  }
  ctx.putImageData(img, 0, 0);
  // subtle halftone: small dots, low opacity, following brightness
  const dotAlpha = grade.duotone ? 0.20 : 0.10;
  const spacing = Math.max(5, Math.round(w / 90));
  ctx.save();
  ctx.globalAlpha = dotAlpha * (0.4 + ink * 0.8);
  ctx.fillStyle = '#0c0616';
  const src = ctx.getImageData(0, 0, w, h).data;
  for (let y = spacing / 2; y < h; y += spacing) {
    for (let x = spacing / 2; x < w; x += spacing) {
      const idx = ((Math.floor(y) * w) + Math.floor(x)) * 4;
      const bright = (src[idx] + src[idx + 1] + src[idx + 2]) / 765;
      const rDot = (1 - bright) * spacing * 0.30;
      if (rDot > 0.5) { ctx.beginPath(); ctx.arc(x, y, rDot, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
  return out;
}

// ------------------------------------------------------------- layouts
// Panels are polygons in unit space; comic layouts slant their dividers
// and every layout fills its frame edge to edge (no floating cards).
function poly(points) { return points.map(([x, y]) => ({ x, y })); }
export const LAYOUTS = [
  {
    id: 'comic-hero', name: 'Comic Hero Slash', comic: true,
    panels: [
      poly([[0, 0], [0.58, 0], [0.50, 0.52], [0, 0.46]]),
      poly([[0.58, 0], [1, 0], [1, 0.40], [0.50, 0.52]]),
      poly([[0, 0.46], [0.50, 0.52], [0.44, 1], [0, 1]]),
      poly([[0.50, 0.52], [1, 0.40], [1, 1], [0.44, 1]]),
    ],
    hero: 0,
  },
  {
    id: 'comic-fan', name: 'Comic Fan Six', comic: true,
    panels: [
      poly([[0, 0], [0.40, 0], [0.36, 0.36], [0, 0.32]]),
      poly([[0.40, 0], [1, 0], [1, 0.30], [0.36, 0.36]]),
      poly([[0, 0.32], [0.36, 0.36], [0.33, 0.68], [0, 0.66]]),
      poly([[0.36, 0.36], [1, 0.30], [1, 0.64], [0.33, 0.68]]),
      poly([[0, 0.66], [0.33, 0.68], [0.30, 1], [0, 1]]),
      poly([[0.33, 0.68], [1, 0.64], [1, 1], [0.30, 1]]),
    ],
    hero: 1,
  },
  {
    id: 'hero-split', name: 'Hero Split',
    panels: [
      poly([[0, 0], [0.62, 0], [0.62, 1], [0, 1]]),
      poly([[0.62, 0], [1, 0], [1, 0.33], [0.62, 0.33]]),
      poly([[0.62, 0.33], [1, 0.33], [1, 0.66], [0.62, 0.66]]),
      poly([[0.62, 0.66], [1, 0.66], [1, 1], [0.62, 1]]),
    ],
    hero: 0,
  },
  {
    id: 'grid-eight', name: 'Grid Eight',
    panels: [
      poly([[0, 0], [0.5, 0], [0.5, 0.25], [0, 0.25]]), poly([[0.5, 0], [1, 0], [1, 0.25], [0.5, 0.25]]),
      poly([[0, 0.25], [0.5, 0.25], [0.5, 0.5], [0, 0.5]]), poly([[0.5, 0.25], [1, 0.25], [1, 0.5], [0.5, 0.5]]),
      poly([[0, 0.5], [0.5, 0.5], [0.5, 0.75], [0, 0.75]]), poly([[0.5, 0.5], [1, 0.5], [1, 0.75], [0.5, 0.75]]),
      poly([[0, 0.75], [0.5, 0.75], [0.5, 1], [0, 1]]), poly([[0.5, 0.75], [1, 0.75], [1, 1], [0.5, 1]]),
    ],
    hero: 0,
  },
  {
    id: 'marquee', name: 'Marquee Strip',
    panels: [
      poly([[0, 0], [1, 0], [1, 0.44], [0, 0.44]]),
      poly([[0, 0.44], [0.33, 0.44], [0.33, 1], [0, 1]]),
      poly([[0.33, 0.44], [0.66, 0.44], [0.66, 1], [0.33, 1]]),
      poly([[0.66, 0.44], [1, 0.44], [1, 1], [0.66, 1]]),
    ],
    hero: 0,
  },
  {
    id: 'reel', name: 'Wide Reel',
    panels: [
      poly([[0, 0], [1, 0], [1, 0.30], [0, 0.30]]),
      poly([[0, 0.30], [1, 0.30], [1, 0.68], [0, 0.68]]),
      poly([[0, 0.68], [0.5, 0.68], [0.5, 1], [0, 1]]),
      poly([[0.5, 0.68], [1, 0.68], [1, 1], [0.5, 1]]),
    ],
    hero: 1,
  },
  {
    id: 'portrait-stack', name: 'Portrait Stack',
    panels: [
      poly([[0, 0], [1, 0], [1, 0.56], [0, 0.56]]),
      poly([[0, 0.56], [0.5, 0.56], [0.5, 1], [0, 1]]),
      poly([[0.5, 0.56], [1, 0.56], [1, 1], [0.5, 1]]),
    ],
    hero: 0,
  },
];
export function layoutById(id) { return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0]; }

export function panelPath(ctx, panel, w, h) {
  ctx.beginPath();
  panel.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x * w, p.y * h); else ctx.lineTo(p.x * w, p.y * h);
  });
  ctx.closePath();
}
export function panelBounds(panel, w, h) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of panel) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { x: minX * w, y: minY * h, w: (maxX - minX) * w, h: (maxY - minY) * h };
}

// ------------------------------------------------------- title + dressing
const DISPLAY = '"Arial Black", "Segoe UI", system-ui, sans-serif';
const SCRIPT = '"Segoe Script", "Brush Script MT", cursive';
const SANS = 'system-ui, "Segoe UI", sans-serif';

export function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Giant gradient title with thick outline, hard shadow and a slight slant,
// plus a neon script subtitle overlapping its lower edge.
export function drawTitleBlock(ctx, w, h, opts) {
  const { title, subtitle, anchorY } = opts;
  const words = (title || 'VICE COAST').toUpperCase().split(/\s+/).filter(Boolean);
  ctx.save();
  ctx.translate(w / 2, anchorY);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  let size = w * 0.185;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fit = () => {
    ctx.font = `900 ${size}px ${DISPLAY}`;
    return Math.max(...words.map((word) => ctx.measureText(word).width));
  };
  while (fit() > w * 0.94 && size > 18) size *= 0.94;
  const lineH = size * 0.92;
  const totalH = lineH * words.length;
  words.forEach((word, i) => {
    const y = -totalH / 2 + lineH * (i + 0.5);
    const grad = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
    grad.addColorStop(0, '#fff6da'); grad.addColorStop(0.38, '#ffc46b');
    grad.addColorStop(0.62, '#ff7a59'); grad.addColorStop(1, '#e84a9e');
    ctx.font = `900 ${size}px ${DISPLAY}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = size * 0.16;
    ctx.fillStyle = 'rgba(10,4,20,0.85)';
    ctx.strokeText(word, size * 0.045, y + size * 0.06);
    ctx.fillText(word, size * 0.045, y + size * 0.06);
    ctx.strokeText(word, 0, y);
    ctx.fillStyle = grad;
    ctx.fillText(word, 0, y);
    // glassy top sheen: the same word, clipped to its upper third, in white
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, y - size * 0.55, w, size * 0.34);
    ctx.clip();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(word, 0, y);
    ctx.restore();
  });
  if (subtitle) {
    const sy = totalH / 2 + size * 0.10;
    let subSize = size * 0.34;
    ctx.font = `italic 700 ${Math.round(subSize)}px ${SCRIPT}, ${SANS}`;
    while (ctx.measureText(subtitle).width > w * 0.92 && subSize > 10) {
      subSize *= 0.93;
      ctx.font = `italic 700 ${Math.round(subSize)}px ${SCRIPT}, ${SANS}`;
    }
    ctx.shadowColor = '#39d5e8'; ctx.shadowBlur = size * 0.22;
    ctx.strokeStyle = 'rgba(8,20,34,0.9)'; ctx.lineWidth = size * 0.05;
    ctx.strokeText(subtitle, 0, sy);
    ctx.fillStyle = '#bff3ff';
    ctx.fillText(subtitle, 0, sy);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  return totalH;
}

export function drawQuoteStars(ctx, w, y, quote, source) {
  ctx.save();
  ctx.textAlign = 'center';
  const starR = w * 0.011;
  for (let i = 0; i < 5; i++) drawStar(ctx, w / 2 + (i - 2) * starR * 2.7, y, starR, '#ffd23e');
  if (quote) {
    ctx.font = `italic 600 ${Math.round(w * 0.020)}px ${SANS}`;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`“${quote}”`, w / 2, y + w * 0.030);
    if (source) {
      ctx.font = `600 ${Math.round(w * 0.013)}px ${SANS}`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(`— ${source}`, w / 2, y + w * 0.052);
    }
  }
  ctx.restore();
}

export function drawSeal(ctx, cx, cy, r, line1, line2) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.16);
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? r : r * 0.82;
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffe98c'); g.addColorStop(0.7, '#ffb02e'); g.addColorStop(1, '#e8762e');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#7a3410'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(122,52,16,0.7)'; ctx.lineWidth = r * 0.035; ctx.stroke();
  ctx.fillStyle = '#5e2408';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(r * 0.30)}px ${DISPLAY}`;
  ctx.fillText((line1 || 'VICE').toUpperCase(), 0, -r * 0.17);
  ctx.font = `900 ${Math.round(r * 0.24)}px ${DISPLAY}`;
  ctx.fillText((line2 || 'CERTIFIED').toUpperCase(), 0, r * 0.14);
  drawStar(ctx, -r * 0.34, r * 0.38, r * 0.09, '#7a3410');
  drawStar(ctx, r * 0.34, r * 0.38, r * 0.09, '#7a3410');
  ctx.restore();
}

function palmSilhouette(ctx, x, baseY, s, tone) {
  ctx.save();
  ctx.strokeStyle = tone; ctx.fillStyle = tone; ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.10;
  ctx.beginPath(); ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + s * 0.14, baseY - s * 0.6, x + s * 0.30, baseY - s * 0.95);
  ctx.stroke();
  const tx = x + s * 0.30, ty = baseY - s * 0.95;
  ctx.lineWidth = s * 0.055;
  for (let f = 0; f < 6; f++) {
    const ang = Math.PI * (0.95 + f * 0.22);
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(ang) * s * 0.4, ty + Math.sin(ang) * s * 0.3 - s * 0.12, tx + Math.cos(ang) * s * 0.62, ty + Math.sin(ang) * s * 0.42 + s * 0.18);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPalmStrip(ctx, w, h, tagline) {
  const stripH = h * 0.085;
  const y0 = h - stripH;
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, '#f78c4e'); g.addColorStop(0.55, '#e84a6e'); g.addColorStop(1, '#7a2350');
  ctx.fillStyle = g; ctx.fillRect(0, y0, w, stripH);
  const rand = mulberry32(42);
  for (let i = 0; i < 9; i++) {
    palmSilhouette(ctx, w * (0.03 + i * 0.115) + rand() * w * 0.02, h - 1, stripH * (0.8 + rand() * 0.35), 'rgba(26,8,26,0.9)');
  }
  if (tagline) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(stripH * 0.34)}px ${SANS}`;
    ctx.shadowColor = 'rgba(20,4,16,0.85)'; ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tagline.toUpperCase(), w / 2, y0 + stripH * 0.52);
    ctx.restore();
  }
}

export function drawBilling(ctx, w, h, title) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `600 ${Math.round(w * 0.0115)}px ${SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  const line = `VICE COAST COVER STUDIO PRESENTS · YOU IN “${(title || 'VICE COAST').toUpperCase()}” · LETTERING & SEAL DRAWN IN-STUDIO · NO TWO COVERS LEAVE THE BAY ALIKE`;
  ctx.fillText(line, w / 2, h - w * 0.016);
  ctx.restore();
}

export function drawBarcode(ctx, x, y, w, h, seedText) {
  ctx.save();
  ctx.fillStyle = '#f6f2e8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#14100e';
  let seed = 7;
  for (const ch of String(seedText || 'VC')) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = mulberry32(seed);
  let bx = x + w * 0.06;
  while (bx < x + w * 0.92) {
    const bw = w * (0.012 + rand() * 0.035);
    if (rand() > 0.38) ctx.fillRect(bx, y + h * 0.10, bw, h * 0.62);
    bx += bw + w * 0.014;
  }
  ctx.font = `600 ${Math.round(h * 0.16)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('VC · 06 · 2026', x + w / 2, y + h * 0.90);
  ctx.restore();
}

export function drawMonogram(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14,8,24,0.82)'; ctx.fill();
  ctx.lineWidth = r * 0.09; ctx.strokeStyle = '#ffc46b'; ctx.stroke();
  ctx.fillStyle = '#ffc46b';
  ctx.font = `900 ${Math.round(r * 0.85)}px ${DISPLAY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('V', x, y + r * 0.05);
  ctx.restore();
}

export function drawFrame(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,246,226,0.95)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.strokeStyle = 'rgba(20,8,26,0.55)';
  ctx.lineWidth = Math.max(1, w * 0.0018);
  ctx.strokeRect(w * 0.012, w * 0.012, w - w * 0.024, h - w * 0.024);
  ctx.restore();
}
export { rgba };
