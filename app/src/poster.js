// poster.js — layouts, colour grades, the light photographic poster finish,
// the big poster lettering and all of the printed dressing on the cover.

import { mulberry, clamp, lerp } from './noise.js';

// ---- layouts: polygons in normalised cover coordinates, tiling edge to edge
const R = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const LAYOUTS = [
  { id: 'comic-hero-plus', name: 'Comic Hero Plus', panels: [
    [[0, 0], [0.58, 0], [0.5, 1], [0, 1]],
    [[0.58, 0], [1, 0], [1, 0.3], [0.553, 0.34]],
    [[0.553, 0.34], [1, 0.3], [1, 0.64], [0.526, 0.68]],
    [[0.526, 0.68], [1, 0.64], [1, 1], [0.5, 1]],
  ] },
  { id: 'comic-hero', name: 'Comic Slash Hero', panels: [
    [[0, 0], [0.6, 0], [0.52, 1], [0, 1]],
    [[0.6, 0], [1, 0], [1, 0.52], [0.565, 0.48]],
    [[0.565, 0.48], [1, 0.52], [1, 1], [0.52, 1]],
  ] },
  { id: 'comic-bands', name: 'Comic Cross Bands', panels: [
    [[0, 0], [1, 0], [1, 0.32], [0, 0.38]],
    [[0, 0.38], [0.54, 0.345], [0.48, 0.68], [0, 0.72]],
    [[0.54, 0.345], [1, 0.32], [1, 0.66], [0.48, 0.68]],
    [[0, 0.72], [0.48, 0.68], [0.44, 1], [0, 1]],
    [[0.48, 0.68], [1, 0.66], [1, 1], [0.44, 1]],
  ] },
  { id: 'hero-split', name: 'Hero Split', panels: [
    R(0, 0, 0.62, 1), R(0.62, 0, 0.38, 0.34), R(0.62, 0.34, 0.38, 0.33), R(0.62, 0.67, 0.38, 0.33),
  ] },
  { id: 'grid-eight', name: 'Grid Eight', panels: [
    R(0, 0, 0.25, 0.5), R(0.25, 0, 0.25, 0.5), R(0.5, 0, 0.25, 0.5), R(0.75, 0, 0.25, 0.5),
    R(0, 0.5, 0.25, 0.5), R(0.25, 0.5, 0.25, 0.5), R(0.5, 0.5, 0.25, 0.5), R(0.75, 0.5, 0.25, 0.5),
  ] },
  { id: 'marquee', name: 'Marquee', panels: [
    R(0, 0, 1, 0.46), R(0, 0.46, 0.34, 0.54), R(0.34, 0.46, 0.33, 0.54), R(0.67, 0.46, 0.33, 0.54),
  ] },
  { id: 'wide-reel', name: 'Wide Reel', panels: [
    R(0, 0, 0.5, 0.26), R(0.5, 0, 0.5, 0.26), R(0, 0.26, 1, 0.48), R(0, 0.74, 0.5, 0.26), R(0.5, 0.74, 0.5, 0.26),
  ] },
  { id: 'portrait-stack', name: 'Portrait Stack', panels: [
    R(0, 0, 0.34, 1), R(0.34, 0, 0.33, 0.5), R(0.34, 0.5, 0.33, 0.5), R(0.67, 0, 0.33, 0.5), R(0.67, 0.5, 0.33, 0.5),
  ] },
];

// ---- grades: brightness-to-ramp colour maps --------------------------------
export const GRADES = [
  { id: 'sunset', name: 'Sunset', ramp: [[0, '#1c1030'], [0.25, '#6e2350'], [0.5, '#c93a5e'], [0.72, '#ff7a4e'], [0.88, '#ffb35c'], [1, '#fff3c4']] },
  { id: 'neon', name: 'Neon', ramp: [[0, '#0a0620'], [0.25, '#3c1470'], [0.5, '#a02c8a'], [0.72, '#ff2e88'], [0.88, '#ff8ab0'], [1, '#d8fbff']] },
  { id: 'golden', name: 'Golden', ramp: [[0, '#241305'], [0.25, '#6e3a14'], [0.5, '#b85e1e'], [0.72, '#e8933c'], [0.88, '#ffc46b'], [1, '#fff7d8']] },
  { id: 'miami', name: 'Miami', ramp: [[0, '#06222e'], [0.25, '#0e5e6e'], [0.5, '#2aa8a0'], [0.72, '#f2789f'], [0.88, '#ffb3c8'], [1, '#fff6ec']] },
  { id: 'viceblue', name: 'Vice Blue', ramp: [[0, '#050a1e'], [0.25, '#12295e'], [0.5, '#2456a6'], [0.72, '#4a9fd8'], [0.88, '#9fd4f2'], [1, '#f2fbff']] },
  { id: 'comic', name: 'Comic Ink', ramp: [[0, '#101018'], [0.45, '#101018'], [0.55, '#f2e33c'], [0.8, '#f2e33c'], [1, '#ff4d2e']], comic: true },
];

function rampLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.ramp.map(([at, hex]) => [at, [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(lerp(a[1][c], b[1][c], clamp(f, 0, 1)));
  }
  return lut;
}

// The light poster finish, per panel: FIRST a photo finish (S-curve, grain),
// THEN a many-level posterize, a subtle halftone that follows brightness, and
// the grade ramp blended under the photograph so its richness survives.
export function finishPanel(canvas, grade, ink, grainAmt, seed) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (!w || !h) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = rampLut(grade);
  const levels = grade.comic ? lerp(256, 5, ink) : lerp(256, 8, ink);
  const step = 255 / (levels - 1);
  const rampMix = grade.comic ? ink * 0.95 : ink * 0.5;
  const dotEvery = grade.comic ? 4 : 3;
  const dotStrength = grade.comic ? ink * 0.30 : ink * 0.10;
  const rand = mulberry(seed);
  // pre-roll grain values in rows to keep the inner loop cheap
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const curved = clamp(lum * lum * (3 - 2 * lum) * 0.3 + lum * 0.7, 0, 1);
      const li = Math.round(curved * 255) * 3;
      r = lerp(r, lut[li], rampMix); g = lerp(g, lut[li + 1], rampMix); b = lerp(b, lut[li + 2], rampMix);
      if (levels < 255) {
        r = Math.round(r / step) * step; g = Math.round(g / step) * step; b = Math.round(b / step) * step;
      }
      if (x % dotEvery === 0 && y % dotEvery === 0) {
        const dk = 1 - dotStrength * (1 - lum);
        r *= dk; g *= dk; b *= dk;
      }
      const gr = (rand() - 0.5) * grainAmt * 26;
      d[i] = clamp(r + gr, 0, 255); d[i + 1] = clamp(g + gr, 0, 255); d[i + 2] = clamp(b + gr, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  // gentle highlight bloom: a screened, blurred copy of the bright end
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.10 + ink * 0.05;
  ctx.filter = 'blur(6px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}

// ---- cover assembly ---------------------------------------------------------
function polyPath(ctx, poly, W, H) {
  ctx.beginPath();
  poly.forEach(([px, py], i) => { i ? ctx.lineTo(px * W, py * H) : ctx.moveTo(px * W, py * H); });
  ctx.closePath();
}

// state.panels[i] = { img, zoom, panX, panY, flip, ink } — img is any drawable.
export function renderCover(ctx, W, H, state) {
  const layout = LAYOUTS.find(l => l.id === state.layoutId) || LAYOUTS[0];
  const grade = GRADES.find(g => g.id === state.gradeId) || GRADES[0];
  ctx.fillStyle = '#0c0a14';
  ctx.fillRect(0, 0, W, H);
  layout.panels.forEach((poly, idx) => {
    const panel = state.panels[idx % state.panels.length];
    if (!panel || !panel.img) return;
    const xs = poly.map(p => p[0] * W), ys = poly.map(p => p[1] * H);
    const bx = Math.min(...xs), by = Math.min(...ys);
    const bw = Math.ceil(Math.max(...xs) - bx), bh = Math.ceil(Math.max(...ys) - by);
    if (bw < 4 || bh < 4) return;
    const tmp = document.createElement('canvas');
    tmp.width = bw; tmp.height = bh;
    const tctx = tmp.getContext('2d');
    const img = panel.img;
    const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    const zoom = panel.zoom || 1;
    const scale = Math.max(bw / iw, bh / ih) * zoom;
    const dw = iw * scale, dh = ih * scale;
    const dx = (bw - dw) / 2 + (panel.panX || 0) * bw * 0.4;
    const dy = (bh - dh) / 2 + (panel.panY || 0) * bh * 0.4;
    if (panel.flip) { tctx.translate(bw, 0); tctx.scale(-1, 1); tctx.drawImage(img, bw - dx - dw, dy, dw, dh); }
    else tctx.drawImage(img, dx, dy, dw, dh);
    finishPanel(tmp, grade, clamp((panel.ink ?? state.ink) * (state.inkAll ?? 1), 0, 1), state.grain, 500 + idx * 131);
    ctx.save();
    polyPath(ctx, poly, W, H);
    ctx.clip();
    ctx.drawImage(tmp, bx, by);
    ctx.restore();
    // thin pale keyline between panels
    ctx.save();
    polyPath(ctx, poly, W, H);
    ctx.strokeStyle = 'rgba(255,246,230,0.9)';
    ctx.lineWidth = Math.max(2, W * 0.0035);
    ctx.stroke();
    ctx.restore();
  });
  // soft vignette over the whole poster
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(10,4,18,0)');
  vg.addColorStop(1, `rgba(10,4,18,${0.16 + state.vignette * 0.3})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  drawDressing(ctx, W, H, state);
  drawTitle(ctx, W, H, state);
  // thin pale frame around the whole cover
  ctx.strokeStyle = 'rgba(255,246,230,0.95)';
  ctx.lineWidth = Math.max(3, W * 0.005);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}

// ---- the title block ----------------------------------------------------------
function fitFont(ctx, text, weight, family, maxW, startPx) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > 12) { px *= 0.94; ctx.font = `${weight} ${px}px ${family}`; }
  return px;
}
export const TITLE_FONT = '"Arial Black","Segoe UI",Arial,sans-serif';
export const SCRIPT_FONT = '"Segoe Script","Brush Script MT","Comic Sans MS",cursive';

export function drawTitle(ctx, W, H, state) {
  const anchor = state.titlePos === 'top' ? 0.17 : state.titlePos === 'bottom' ? 0.8 : 0.5;
  const cy = H * anchor + (state.titleDy || 0) * H;
  const title = (state.title || 'VICE COAST').toUpperCase();
  ctx.save();
  ctx.translate(W / 2, cy);
  ctx.transform(1, 0, -0.06, 1, 0, 0); // slight italic slant
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const px = fitFont(ctx, title, 900, TITLE_FONT, W * 0.9, H * 0.16);
  // press quote with five stars, just above the title
  ctx.transform(1, 0, 0.06, 1, 0, 0);
  ctx.font = `700 ${Math.max(11, H * 0.021)}px "Segoe UI",Arial,sans-serif`;
  ctx.fillStyle = '#ffd23c';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
  ctx.fillText('★ ★ ★ ★ ★', 0, -px * 0.78);
  ctx.fillStyle = '#fff6ec';
  ctx.font = `italic 600 ${Math.max(11, H * 0.02)}px Georgia,serif`;
  const quote = `“${state.quote}” — ${state.quoteSource}`;
  ctx.fillText(quote, 0, -px * 0.55, W * 0.92);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  ctx.font = `900 ${px}px ${TITLE_FONT}`;
  // hard offset drop shadow, then outline, then the three-stop gradient fill
  ctx.fillStyle = '#160a24';
  ctx.fillText(title, px * 0.045, px * 0.06);
  const tg = ctx.createLinearGradient(0, -px * 0.55, 0, px * 0.55);
  tg.addColorStop(0, '#fff3ae'); tg.addColorStop(0.45, '#ffb020'); tg.addColorStop(0.78, '#ff5e62'); tg.addColorStop(1, '#d81b74');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1c0b2a';
  ctx.lineWidth = px * 0.1;
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = tg;
  ctx.fillText(title, 0, 0);
  ctx.restore();
  // neon-glow script subtitle overlapping the title's lower edge
  ctx.save();
  ctx.translate(W / 2, cy + px * 0.52);
  ctx.rotate(-0.03);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const spx = fitFont(ctx, state.subtitle || '', 700, SCRIPT_FONT, W * 0.8, H * 0.055);
  ctx.font = `700 ${spx}px ${SCRIPT_FONT}`;
  ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = H * 0.018;
  ctx.fillStyle = '#8ffce2';
  ctx.fillText(state.subtitle || '', 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ---- dressing: seal, palm strip, billing, barcode, monogram -------------------
export function drawDressing(ctx, W, H, state) {
  const rand = mulberry(4242);
  // starburst seal, top right
  const sx = W * 0.885, sy = H * 0.115, sr = Math.min(W, H) * 0.085;
  ctx.save();
  ctx.translate(sx, sy); ctx.rotate(-0.16);
  ctx.fillStyle = '#f2b13c';
  ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = Math.max(1, sr * 0.03);
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2, rr = i % 2 ? sr * 0.82 : sr;
    const px2 = Math.cos(a) * rr, py2 = Math.sin(a) * rr;
    i ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c22633';
  ctx.beginPath(); ctx.arc(0, 0, sr * 0.68, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${sr * 0.26}px ${TITLE_FONT}`;
  ctx.fillText(state.badge1 || '', 0, -sr * 0.18);
  ctx.fillText(state.badge2 || '', 0, sr * 0.14);
  ctx.font = `${sr * 0.2}px Arial`;
  ctx.fillText('★ ★ ★', 0, sr * 0.42);
  ctx.restore();
  // bottom palm strip behind the tagline
  const stripH = H * 0.085, stripY = H - stripH - H * 0.058;
  const sg = ctx.createLinearGradient(0, stripY, 0, stripY + stripH);
  sg.addColorStop(0, '#ff8a5c'); sg.addColorStop(0.55, '#e5487c'); sg.addColorStop(1, '#5e2350');
  ctx.fillStyle = sg;
  ctx.fillRect(W * 0.02, stripY, W * 0.96, stripH);
  ctx.fillStyle = 'rgba(24,8,28,0.9)';
  for (let i = 0; i < 9; i++) {
    const px3 = W * (0.06 + i * 0.11), base = stripY + stripH;
    ctx.fillRect(px3, base - stripH * 0.52, Math.max(1.4, W * 0.003), stripH * 0.52);
    for (let f = 0; f < 5; f++) {
      const a = Math.PI * (1.05 + f * 0.22);
      ctx.strokeStyle = 'rgba(24,8,28,0.9)'; ctx.lineWidth = Math.max(1.2, W * 0.0028);
      ctx.beginPath();
      ctx.moveTo(px3, base - stripH * 0.52);
      ctx.quadraticCurveTo(px3 + Math.cos(a) * stripH * 0.34, base - stripH * 0.52 + Math.sin(a) * stripH * 0.3,
        px3 + Math.cos(a) * stripH * 0.52, base - stripH * 0.52 + Math.sin(a) * stripH * 0.42 + stripH * 0.2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff6ec';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.max(12, H * 0.024)}px "Segoe UI",Arial,sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 5;
  ctx.fillText((state.tagline || '').toUpperCase(), W / 2, stripY + stripH * 0.52, W * 0.9);
  ctx.shadowBlur = 0;
  // movie-style billing block along the very bottom edge
  ctx.font = `600 ${Math.max(8, H * 0.0115)}px "Segoe UI",Arial,sans-serif`;
  ctx.fillStyle = 'rgba(255,246,236,0.92)';
  const billing = 'VICE COAST COVER STUDIO  ·  STARRING YOU  ·  LETTERING AND SEAL DRAWN BY THE STUDIO  ·  NO STUDIO WAS HARMED  ·  PRINTED ON THE COAST';
  ctx.fillText(billing, W / 2, H - H * 0.013, W * 0.94);
  // barcode, bottom left
  const bw2 = W * 0.075, bh2 = H * 0.03, bx2 = W * 0.022, by2 = H - bh2 - H * 0.02;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(bx2, by2, bw2, bh2);
  ctx.fillStyle = '#14100c';
  let cxp = bx2 + 3;
  while (cxp < bx2 + bw2 - 4) { const wdt = 1 + rand() * 3; if (rand() > 0.35) ctx.fillRect(cxp, by2 + 3, wdt, bh2 - 8); cxp += wdt + 1.4; }
  ctx.font = `600 ${Math.max(7, bh2 * 0.28)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('VC-2026-COAST', bx2 + bw2 / 2, by2 + bh2 - 2);
  // studio monogram, bottom right
  const mr = Math.min(W, H) * 0.024, mx = W - W * 0.022 - mr, my = H - H * 0.02 - mr;
  ctx.strokeStyle = '#ffd23c'; ctx.lineWidth = Math.max(1.4, mr * 0.1);
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd23c';
  ctx.font = `900 ${mr * 0.85}px ${TITLE_FONT}`;
  ctx.fillText('VC', mx, my + 1);
}
