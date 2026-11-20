// poster.js — layouts, colour grades, the photo-then-poster pipeline and
// the full poster dressing for Vice Coast Cover Studio.
// The finish order matters: first the photograph (grain, bloom, S-curve),
// then a light poster treatment (many-level posterize, a whisper of
// halftone that stays off skin, a brightness-to-ramp colour map).

import { paintScene, CHARACTERS } from './scenes.js';
import { makeRng } from './noise.js';

// ---- colour grades: brightness ramps, darkest to brightest ----
export const GRADES = {
  sunset: { name: 'Sunset', ramp: [[16, 10, 38], [58, 20, 84], [148, 44, 110], [232, 84, 106], [255, 138, 76], [255, 205, 120], [255, 244, 205]] },
  neon: { name: 'Neon', ramp: [[10, 6, 34], [44, 12, 84], [110, 20, 140], [216, 40, 150], [255, 92, 178], [92, 220, 255], [235, 252, 255]] },
  golden: { name: 'Golden', ramp: [[26, 14, 8], [84, 44, 16], [160, 92, 30], [222, 148, 52], [250, 196, 96], [255, 228, 156], [255, 250, 226]] },
  miami: { name: 'Miami', ramp: [[8, 30, 44], [14, 84, 104], [26, 160, 158], [90, 214, 190], [255, 150, 190], [255, 205, 214], [255, 248, 238]] },
  viceblue: { name: 'Vice Blue', ramp: [[6, 12, 34], [18, 38, 92], [36, 84, 160], [74, 140, 216], [130, 196, 244], [196, 232, 252], [248, 253, 255]] },
  comic: { name: 'Comic Ink', ramp: [[12, 10, 30], [30, 22, 90], [38, 120, 200], [240, 60, 120], [255, 120, 60], [255, 214, 90], [255, 250, 235]], duotone: true },
};

function rampAt(ramp, t) {
  const n = ramp.length - 1, pos = Math.min(0.9999, Math.max(0, t)) * n, i = Math.floor(pos), f = pos - i;
  const a = ramp[i], b = ramp[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Finish one painted or photographed panel: S-curve + grain first (the
// photograph), then posterize / halftone / ramp (the print), kept light.
export function finishPanel(canvas, gradeKey, o) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (!w || !h) return;
  // gentle highlight bloom: a blurred copy of the brights laid back softly
  if (o.bloom > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.bloom * 0.35;
    ctx.filter = `blur(${Math.max(2, w * 0.012)}px) brightness(1.35) saturate(1.2)`;
    ctx.drawImage(canvas, 0, 0); ctx.restore(); ctx.filter = 'none';
  }
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const ramp = GRADES[gradeKey].ramp;
  const levels = GRADES[gradeKey].duotone ? 5 : Math.round(26 - o.ink * 17); // ~9..26 levels
  const rng = makeRng(1234 + w);
  const dot = Math.max(3, Math.round(w / 90));
  for (let p = 0; p < d.length; p += 4) {
    const idx = p / 4, px = idx % w, py = (idx / w) | 0;
    let r = d[p] / 255, g = d[p + 1] / 255, b = d[p + 2] / 255;
    // slight contrast S-curve
    r = r + Math.sin((r - 0.5) * Math.PI) * 0.045; g = g + Math.sin((g - 0.5) * Math.PI) * 0.045; b = b + Math.sin((b - 0.5) * Math.PI) * 0.045;
    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // fine luminance grain
    const gr = (rng() - 0.5) * o.grain * 0.14;
    // posterize the light, many levels so skies stay smooth
    let pl = Math.round(lum * levels) / levels;
    const scale = lum > 0.001 ? pl / lum : 1;
    r *= scale; g *= scale; b *= scale; lum = pl;
    // halftone: very subtle, follows brightness, reduced on skin tones
    const skin = (r > g && g > b && r - b > 0.04 && lum > 0.18 && lum < 0.85) ? 0.25 : 1;
    const cell = ((px % dot) - dot / 2) ** 2 + ((py % dot) - dot / 2) ** 2;
    const dotR = (dot * 0.5) * (1 - lum);
    const ht = (cell < dotR * dotR ? -1 : 0.35) * o.halftone * 0.10 * skin * (GRADES[gradeKey].duotone ? 2.2 : 1);
    // brightness-to-ramp colour map, mixed by grade strength
    const [rr, gg, bb] = rampAt(ramp, lum);
    const mixv = o.gradeMix * (GRADES[gradeKey].duotone ? 0.92 : 0.55);
    r = r * (1 - mixv) + (rr / 255) * mixv; g = g * (1 - mixv) + (gg / 255) * mixv; b = b * (1 - mixv) + (bb / 255) * mixv;
    d[p] = Math.max(0, Math.min(255, (r + gr + ht) * 255));
    d[p + 1] = Math.max(0, Math.min(255, (g + gr + ht) * 255));
    d[p + 2] = Math.max(0, Math.min(255, (b + gr + ht) * 255));
  }
  ctx.putImageData(img, 0, 0);
  if (o.vignette > 0) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(10,4,20,${o.vignette * 0.42})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }
}

// ---- layouts: panel polygons in unit space ----
// Comic layouts slant their dividers; panels touch edge to edge inside a
// thin pale keyline. Content lists name the default cast for each panel.
const S = 0.035; // slant
export const LAYOUTS = {
  cast: {
    name: 'Cast Comic', comic: true,
    panels: [
      { poly: [[0, 0], [0.37, 0], [0.345, 0.40], [0, 0.40]], content: 'poet' },
      { poly: [[0.37, 0], [0.685, 0], [0.66, 0.40], [0.345, 0.40]], content: 'singer' },
      { poly: [[0.685, 0], [1, 0], [1, 0.40], [0.66, 0.40]], content: 'captain' },
      { poly: [[0, 0.40], [0.555, 0.40], [0.53, 0.66], [0, 0.66]], content: 'aerial' },
      { poly: [[0.555, 0.40], [1, 0.40], [1, 0.66], [0.53, 0.66]], content: 'bay' },
      { poly: [[0, 0.66], [0.5, 0.66], [0.475, 1], [0, 1]], content: 'neon' },
      { poly: [[0.5, 0.66], [0.79, 0.66], [0.765, 1], [0.475, 1]], content: 'chaser' },
      { poly: [[0.79, 0.66], [1, 0.66], [1, 1], [0.765, 1]], content: 'road' },
    ],
  },
  duo: {
    name: 'Duo Comic', comic: true,
    panels: [
      { poly: [[0, 0], [0.55, 0], [0.5, 0.52], [0, 0.52]], content: 'poet' },
      { poly: [[0.55, 0], [1, 0], [1, 0.52], [0.5, 0.52]], content: 'neon' },
      { poly: [[0, 0.52], [0.5, 0.52], [0.46, 1], [0, 1]], content: 'aerial' },
      { poly: [[0.5, 0.52], [1, 0.52], [1, 1], [0.46, 1]], content: 'chef' },
    ],
  },
  hero: {
    name: 'Hero Split',
    panels: [
      { poly: [[0, 0], [0.58, 0], [0.58, 1], [0, 1]], content: 'singer' },
      { poly: [[0.58, 0], [1, 0], [1, 0.335], [0.58, 0.335]], content: 'neon' },
      { poly: [[0.58, 0.335], [1, 0.335], [1, 0.67], [0.58, 0.67]], content: 'skyline' },
      { poly: [[0.58, 0.67], [1, 0.67], [1, 1], [0.58, 1]], content: 'captain' },
    ],
  },
  grid: {
    name: 'Even Grid',
    panels: [
      { poly: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]], content: 'poet' },
      { poly: [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]], content: 'aerial' },
      { poly: [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]], content: 'neon' },
      { poly: [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]], content: 'chaser' },
    ],
  },
  marquee: {
    name: 'Marquee',
    panels: [
      { poly: [[0, 0], [1, 0], [1, 0.46], [0, 0.46]], content: 'bay' },
      { poly: [[0, 0.46], [0.335, 0.46], [0.335, 1], [0, 1]], content: 'poet' },
      { poly: [[0.335, 0.46], [0.67, 0.46], [0.67, 1], [0.335, 1]], content: 'neon' },
      { poly: [[0.67, 0.46], [1, 0.46], [1, 1], [0.67, 1]], content: 'chef' },
    ],
  },
  reel: {
    name: 'Wide Reel',
    panels: [
      { poly: [[0, 0], [1, 0], [1, 0.34], [0, 0.34]], content: 'dawn' },
      { poly: [[0, 0.34], [1, 0.34], [1, 0.67], [0, 0.67]], content: 'neon' },
      { poly: [[0, 0.67], [1, 0.67], [1, 1], [0, 1]], content: 'skyline' },
    ],
  },
  stack: {
    name: 'Portrait Stack',
    panels: [
      { poly: [[0, 0], [1, 0], [1, 0.3], [0, 0.3]], content: 'captain' },
      { poly: [[0, 0.3], [1, 0.3], [1, 0.55], [0, 0.55]], content: 'aerial' },
      { poly: [[0, 0.55], [1, 0.55], [1, 0.8], [0, 0.8]], content: 'singer' },
      { poly: [[0, 0.8], [1, 0.8], [1, 1], [0, 1]], content: 'road' },
    ],
  },
};

function panelPath(ctx, poly, W, H) {
  const p = new Path2D();
  poly.forEach(([ux, uy], i) => { const px = ux * W, py = uy * H; if (i === 0) p.moveTo(px, py); else p.lineTo(px, py); });
  p.closePath(); return p;
}
function polyBBox(poly, W, H) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [ux, uy] of poly) { x0 = Math.min(x0, ux * W); y0 = Math.min(y0, uy * H); x1 = Math.max(x1, ux * W); y1 = Math.max(y1, uy * H); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Draw one panel's content (a painted scene/character, or a user photo
// with its own crop, pan, zoom and flip) into an offscreen, then finish it.
function drawPanelContent(state, panel, W, H) {
  const bb = polyBBox(panel.poly, W, H);
  const cw = Math.max(8, Math.round(bb.w)), ch = Math.max(8, Math.round(bb.h));
  const off = document.createElement('canvas'); off.width = cw; off.height = ch;
  const octx = off.getContext('2d');
  const slot = state.slots[panel.__i] || { kind: 'scene', id: panel.content };
  if (slot.kind === 'photo' && slot.img) {
    const img = slot.img;
    const base = Math.max(cw / img.width, ch / img.height) * (slot.zoom || 1);
    const dw = img.width * base, dh = img.height * base;
    octx.save();
    if (slot.flip) { octx.translate(cw, 0); octx.scale(-1, 1); }
    octx.drawImage(img, (cw - dw) / 2 + (slot.dx || 0) * cw * 0.4, (ch - dh) / 2 + (slot.dy || 0) * ch * 0.4, dw, dh);
    octx.restore();
  } else {
    paintScene(octx, slot.id || panel.content, 0, 0, cw, ch, 700 + panel.__i * 131);
  }
  const inkAll = state.inkAll, inkOne = state.inkPer[panel.__i];
  finishPanel(off, state.grade, {
    ink: Math.max(0, Math.min(1, (inkOne != null ? inkOne : inkAll))),
    gradeMix: state.gradeMix, halftone: state.halftone, grain: state.grain,
    vignette: state.vignette * 0.5, bloom: state.bloom,
  });
  return { off, bb };
}

function star(ctx, cx, cy, r, colour) {
  ctx.save(); ctx.fillStyle = colour; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// Slanted character name tag in a panel corner — small, dark, neon-edged.
export function drawNameTag(ctx, x, y, scale, text) {
  if (!text) return;
  ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.font = `700 ${Math.round(scale * 15)}px 'Arial Narrow', Arial, sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  ctx.fillStyle = 'rgba(255,45,150,1)'; ctx.fillRect(-scale * 3, -scale * 4, scale * 5, scale * 24);
  ctx.fillStyle = 'rgba(14,8,30,0.92)'; ctx.fillRect(0, -scale * 4, tw + scale * 16, scale * 24);
  ctx.fillStyle = '#fdf6ec'; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), scale * 8, scale * 8.5);
  ctx.restore();
}

function drawSeal(ctx, cx, cy, r, line1, line2) {
  ctx.save();
  ctx.fillStyle = '#f7b731'; ctx.beginPath();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rad = i % 2 ? r * 0.88 : r; const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a1450'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(r * 0.26)}px Arial, sans-serif`;
  ctx.fillText(line1, cx, cy - r * 0.2); ctx.fillText(line2, cx, cy + r * 0.1);
  for (let i = -1; i <= 1; i++) star(ctx, cx + i * r * 0.3, cy + r * 0.42, r * 0.09, '#ff5d7a');
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, seed) {
  const rng = makeRng(seed);
  ctx.save(); ctx.fillStyle = '#fdfdf8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#14141c';
  let bx = x + w * 0.06;
  while (bx < x + w * 0.94) { const bw = w * (0.008 + rng() * 0.03); if (rng() > 0.35) ctx.fillRect(bx, y + h * 0.08, bw, h * 0.68); bx += bw + w * 0.012; }
  ctx.font = `${Math.round(h * 0.16)}px monospace`; ctx.textAlign = 'center';
  ctx.fillText('8 90412 77190 3', x + w / 2, y + h * 0.92);
  ctx.restore();
}

// The whole cover: panels, tags, title across the middle band, dressing.
export function renderCover(ctx, W, H, state) {
  ctx.save();
  ctx.fillStyle = '#1c0b2e'; ctx.fillRect(0, 0, W, H);
  const layout = LAYOUTS[state.layout];
  const margin = Math.round(W * 0.028);
  const headH = Math.round(H * 0.075), footH = Math.round(H * 0.085);
  const gx = margin, gy = margin + headH, gw = W - margin * 2, gh = H - margin * 2 - headH - footH;
  // header: stars + press quote
  ctx.fillStyle = '#f7b731';
  for (let i = 0; i < 5; i++) star(ctx, margin + i * W * 0.026 + W * 0.011, margin + headH * 0.3, W * 0.0105, '#f7b731');
  ctx.fillStyle = '#fdf6ec'; ctx.textBaseline = 'middle';
  ctx.font = `italic 700 ${Math.round(W * 0.021)}px Georgia, serif`;
  ctx.fillText(`“${state.quote}”`, margin + W * 0.15, margin + headH * 0.3);
  ctx.font = `600 ${Math.round(W * 0.013)}px Arial, sans-serif`; ctx.fillStyle = '#e8b7d4';
  ctx.fillText(`— ${state.quoteSource}`, margin + W * 0.15, margin + headH * 0.68);
  ctx.fillStyle = '#ffd166'; ctx.fillRect(W - margin - W * 0.085, margin, W * 0.085, headH * 0.52);
  ctx.fillStyle = '#2a1450'; ctx.font = `800 ${Math.round(W * 0.016)}px Arial, sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(state.badgeTop, W - margin - W * 0.0425, margin + headH * 0.27);
  ctx.textAlign = 'left';
  // panels
  layout.panels.forEach((panel, i) => {
    panel.__i = i;
    const path = panelPath(ctx, panel.poly, gw, gh);
    ctx.save(); ctx.translate(gx, gy); ctx.clip(path);
    const { off, bb } = drawPanelContent(state, panel, gw, gh);
    ctx.drawImage(off, bb.x, bb.y);
    ctx.restore();
    ctx.save(); ctx.translate(gx, gy);
    ctx.strokeStyle = 'rgba(253,240,214,0.95)'; ctx.lineWidth = Math.max(1.4, W * 0.0022); ctx.stroke(path);
    const slot = state.slots[i] || { kind: 'scene', id: panel.content };
    const char = CHARACTERS.find((c) => c.id === (slot.id || panel.content));
    if (char) {
      const bb = polyBBox(panel.poly, gw, gh);
      const tagText = (state.tags && state.tags[char.id]) || char.tag;
      drawNameTag(ctx, bb.x + gw * 0.012, bb.y + bb.h - gh * 0.055, W / 1080, tagText);
    }
    ctx.restore();
  });
  // title across the band the layout leaves face- and car-free
  const posY = state.titlePos === 'top' ? gy + gh * 0.16 : state.titlePos === 'bottom' ? gy + gh * 0.86 : gy + gh * 0.545;
  drawTitle(ctx, W / 2, posY, W, state);
  // footer: palm strip behind the tagline, billing, barcode, monogram
  const fy = H - margin - footH;
  const stripX = margin + W * 0.085, stripW = W - margin * 2 - W * 0.17;
  const pg = ctx.createLinearGradient(0, fy, 0, fy + footH);
  pg.addColorStop(0, '#ff8c42'); pg.addColorStop(0.6, '#e8487f'); pg.addColorStop(1, '#7a1660');
  ctx.fillStyle = pg; ctx.fillRect(stripX, fy + footH * 0.14, stripW, footH * 0.42);
  ctx.strokeStyle = 'rgba(26,8,38,0.95)'; ctx.fillStyle = 'rgba(26,8,38,0.95)';
  for (let i = 0; i < 9; i++) {
    const px = stripX + (i + 0.5) * stripW / 9, base = fy + footH * 0.56, top = fy + footH * 0.3;
    ctx.lineWidth = Math.max(1.2, W * 0.0022);
    ctx.beginPath(); ctx.moveTo(px, base); ctx.lineTo(px, top); ctx.stroke();
    ctx.lineWidth = Math.max(1, W * 0.0016);
    for (let f = 0; f < 5; f++) { const a = Math.PI * (0.12 + f * 0.19); ctx.beginPath(); ctx.moveTo(px, top); ctx.quadraticCurveTo(px + Math.cos(a) * W * 0.014, top - Math.abs(Math.sin(a)) * footH * 0.12, px + Math.cos(a) * W * 0.026, top + footH * 0.05); ctx.stroke(); }
  }
  ctx.fillStyle = '#fdf6ec'; ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(W * 0.017)}px Arial, sans-serif`;
  ctx.fillText(state.tagline.toUpperCase(), W / 2, fy + footH * 0.72);
  ctx.font = `${Math.round(W * 0.0105)}px Arial, sans-serif`; ctx.fillStyle = '#cbb8dd';
  ctx.fillText(state.billing.toUpperCase(), W / 2, fy + footH * 0.93);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166'; ctx.font = `900 ${Math.round(W * 0.02)}px Arial, sans-serif`;
  ctx.fillText('VC', margin, fy + footH * 0.36);
  ctx.font = `600 ${Math.round(W * 0.009)}px Arial, sans-serif`; ctx.fillStyle = '#cbb8dd';
  ctx.fillText('COVER STUDIO', margin, fy + footH * 0.56);
  drawBarcode(ctx, W - margin - W * 0.075, fy + footH * 0.1, W * 0.075, footH * 0.62, 42);
  // the seal rides the right edge in the aerial panel's sky corner,
  // clear of every face and of the car panel below
  drawSeal(ctx, W - margin - W * 0.055, gy + gh * 0.545, W * 0.052, state.sealA, state.sealB);
  // thin pale frame around everything
  ctx.strokeStyle = 'rgba(253,240,214,0.9)'; ctx.lineWidth = Math.max(1.5, W * 0.002);
  ctx.strokeRect(margin * 0.45, margin * 0.45, W - margin * 0.9, H - margin * 0.9);
  ctx.restore();
}

function drawTitle(ctx, cx, cy, W, state) {
  const title = (state.title || 'VICE COAST').toUpperCase();
  ctx.save(); ctx.translate(cx, cy); ctx.transform(1, 0, -0.06, 1, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = W * 0.115;
  ctx.font = `900 ${size}px 'Arial Black', Arial, sans-serif`;
  const tw = ctx.measureText(title).width;
  if (tw > W * 0.86) { size *= (W * 0.86) / tw; ctx.font = `900 ${size}px 'Arial Black', Arial, sans-serif`; }
  // hard offset shadow, thick outline, three-stop gradient fill
  ctx.fillStyle = '#2a0a4a';
  ctx.fillText(title, size * 0.055, size * 0.075);
  const g = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  const ramp = GRADES[state.grade].ramp;
  const c = (i) => `rgb(${ramp[i][0]},${ramp[i][1]},${ramp[i][2]})`;
  g.addColorStop(0, c(6)); g.addColorStop(0.45, c(4)); g.addColorStop(0.75, c(3)); g.addColorStop(1, c(2));
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#fdf6ec'; ctx.lineJoin = 'round';
  ctx.strokeText(title, 0, 0);
  ctx.lineWidth = size * 0.07; ctx.strokeStyle = '#1c0b2e';
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = g; ctx.fillText(title, 0, 0);
  // neon script subtitle overlapping the lower edge
  ctx.font = `italic 700 ${size * 0.42}px 'Segoe Script', 'Brush Script MT', cursive`;
  ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = size * 0.22;
  ctx.fillStyle = '#ff8fc7';
  ctx.fillText(state.subtitle || '', 0, size * 0.52);
  ctx.shadowBlur = 0;
  ctx.restore();
}
