// cover.js — composition of Vice Coast Cover Studio: panel layouts, the
// poster title block and all of the printed dressing around the art.
// Layouts are polygons in unit space. Straight layouts tile rectangles;
// the two comic layouts shear their dividers so panels meet at angles,
// edge to edge inside one thin pale keyline frame — no floating cards.

import { applyPosterInk, drawCoverFit, makeGrainTile } from './poster.js';
import { palmSilhouette } from './samples.js';

// Build a layout from rows: each row lists column widths and a slant; the
// slant shears every vertical divider in that row by slant * row height.
function rowsLayout(id, name, comic, rows) {
  const panels = [];
  let y = 0;
  for (const row of rows) {
    let x = 0;
    const total = row.cols.reduce((a, b) => a + b, 0);
    for (const col of row.cols) {
      const wdt = col / total;
      const sTop = (row.slant || 0) * 0;
      const sBot = (row.slant || 0);
      panels.push([
        [x + sTop, y],
        [x + wdt + sTop, y],
        [x + wdt + sBot, y + row.h],
        [x + sBot, y + row.h],
      ]);
      x += wdt;
    }
    y += row.h;
  }
  return { id, name, comic, panels };
}

function heroLayout() {
  // One large hero panel on the left, a stack of three on the right and a
  // wide strip along the bottom: five panels, eight-photo layouts are the
  // grids below.
  return {
    id: 'hero', name: 'Hero Split', comic: false,
    panels: [
      [[0, 0], [0.6, 0], [0.6, 0.78], [0, 0.78]],
      [[0.6, 0], [1, 0], [1, 0.26], [0.6, 0.26]],
      [[0.6, 0.26], [1, 0.26], [1, 0.52], [0.6, 0.52]],
      [[0.6, 0.52], [1, 0.52], [1, 0.78], [0.6, 0.78]],
      [[0, 0.78], [1, 0.78], [1, 1], [0, 1]],
    ],
  };
}

export const LAYOUTS = [
  rowsLayout('slash', 'Comic Slash', true, [
    { h: 0.54, cols: [1.25, 1], slant: -0.09 },
    { h: 0.46, cols: [1, 1, 1], slant: 0.07 },
  ]),
  rowsLayout('zigzag', 'Comic Zigzag', true, [
    { h: 0.36, cols: [1, 1, 1], slant: 0.08 },
    { h: 0.32, cols: [1, 1], slant: -0.1 },
    { h: 0.32, cols: [1, 1, 1], slant: 0.06 },
  ]),
  heroLayout(),
  rowsLayout('grid8', 'Grand Grid', false, [
    { h: 0.34, cols: [1, 1], slant: 0 },
    { h: 0.33, cols: [1, 1, 1], slant: 0 },
    { h: 0.33, cols: [1, 1, 1], slant: 0 },
  ]),
  rowsLayout('marquee', 'Marquee', false, [
    { h: 0.52, cols: [1], slant: 0 },
    { h: 0.48, cols: [1, 1, 1], slant: 0 },
  ]),
  rowsLayout('reel', 'Wide Reel', false, [
    { h: 0.5, cols: [1, 1], slant: 0 },
    { h: 0.5, cols: [1, 1], slant: 0 },
  ]),
  rowsLayout('stack', 'Portrait Stack', false, [
    { h: 0.4, cols: [1], slant: 0 },
    { h: 0.3, cols: [1, 1], slant: 0 },
    { h: 0.3, cols: [1], slant: 0 },
  ]),
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

function panelPath(ctx, poly, W, H) {
  ctx.beginPath();
  poly.forEach(([ux, uy], i) => {
    const x = ux * W, y = uy * H;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function panelBox(poly, W, H) {
  const xs = poly.map((p) => p[0] * W);
  const ys = poly.map((p) => p[1] * H);
  return {
    x: Math.min(...xs), y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
  };
}

const panelCache = new Map();

// Render one panel's picture through the poster pipeline, cached so slider
// drags stay fast: the cache key carries everything that shapes the pixels.
function processedPanel(source, box, gradeId, ink, view, layoutId, index) {
  const pw = Math.max(24, Math.round(box.w));
  const ph = Math.max(24, Math.round(box.h));
  const key = [source.cacheId, pw, ph, gradeId, Math.round(ink * 40), view.zoom.toFixed(2),
    view.ox.toFixed(2), view.oy.toFixed(2), view.flip ? 1 : 0, layoutId, index].join('|');
  if (panelCache.has(key)) return panelCache.get(key);
  if (panelCache.size > 90) panelCache.clear();
  const c = document.createElement('canvas');
  c.width = pw; c.height = ph;
  const cx = c.getContext('2d');
  drawCoverFit(cx, source.img, 0, 0, pw, ph, view);
  applyPosterInk(c, gradeId, ink);
  panelCache.set(key, c);
  return c;
}

const TITLE_GRADIENTS = {
  sunset: ['#ffe9a8', '#ff9a4d', '#ff4d7e'],
  neon: ['#a5fbff', '#ff5ce1', '#8a2be2'],
  golden: ['#fff3c4', '#ffc44d', '#e07b24'],
  miami: ['#d8fff4', '#2fd4c4', '#ff6ba8'],
  viceblue: ['#eafcff', '#7fd4f2', '#2b5fd9'],
  comic: ['#fff3b0', '#ffd23f', '#f24822'],
};

function fitFont(ctx, text, maxWidth, startPx, weight, family) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 6 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

// The poster title: huge display letters with a three-stop vertical
// gradient fill, a thick dark outline and a hard offset shadow, slanted a
// touch; a glowing script subtitle tucks under its lower edge.
function drawTitleBlock(ctx, W, H, st) {
  const cx = W / 2;
  const bandY = st.titlePos === 'top' ? H * 0.16 : st.titlePos === 'bottom' ? H * 0.8 : H * 0.47;
  const cy = bandY + (st.titleLift || 0) * H;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -0.06, 1, 0, 0); // the slight poster slant
  const family = '"Arial Black","Segoe UI",Arial,sans-serif';
  const words = (st.title || 'VICE COAST').toUpperCase().split(/\s+/).filter(Boolean);
  const lines = words.length > 1 && (st.title || '').length > 10
    ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
    : [words.join(' ') || 'VICE COAST'];
  const px = fitFont(ctx, lines.reduce((a, b) => (a.length > b.length ? a : b)), W * 0.94, H * 0.17, 900, family);
  ctx.font = `900 ${px}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const lineH = px * 0.94;
  const stops = TITLE_GRADIENTS[st.grade] || TITLE_GRADIENTS.sunset;
  lines.forEach((line, i) => {
    const ly = (i - (lines.length - 1) / 2) * lineH;
    const g = ctx.createLinearGradient(0, ly - px * 0.5, 0, ly + px * 0.55);
    g.addColorStop(0, stops[0]); g.addColorStop(0.55, stops[1]); g.addColorStop(1, stops[2]);
    ctx.fillStyle = 'rgba(12,6,24,0.9)'; // hard drop shadow, offset down-right
    ctx.fillText(line, px * 0.055, ly + px * 0.07);
    ctx.strokeStyle = '#160a26';
    ctx.lineWidth = px * 0.16;
    ctx.strokeText(line, 0, ly);
    ctx.fillStyle = g;
    ctx.fillText(line, 0, ly);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.6;
    ctx.strokeText(line, 0, ly - px * 0.012);
  });
  ctx.restore();
  drawQuoteLine(ctx, W, cy - (lines.length * lineH) / 2 - H * 0.052, st);
  drawSubtitle(ctx, W, cy + (lines.length * lineH) / 2 + H * 0.028, st);
}

function drawQuoteLine(ctx, W, y, st) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const starPx = Math.max(13, W * 0.02);
  ctx.font = `${starPx}px Arial, sans-serif`;
  ctx.fillStyle = '#ffd23f';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 6;
  ctx.fillText('★ ★ ★ ★ ★', W / 2, y - starPx * 0.85);
  const quote = (st.quote || '').trim();
  if (quote) {
    ctx.font = `italic 700 ${Math.max(14, W * 0.021)}px Georgia, serif`;
    ctx.fillStyle = '#ffffff';
    const src = (st.quoteBy || '').trim();
    ctx.fillText(`“${quote}”${src ? ' — ' + src : ''}`, W / 2, y + starPx * 0.55);
  }
  ctx.restore();
}

function drawSubtitle(ctx, W, y, st) {
  const text = (st.subtitle || '').trim();
  if (!text) return;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate(-0.028);
  const family = '"Segoe Script","Brush Script MT","Comic Sans MS",cursive';
  const px = fitFont(ctx, text, W * 0.7, W * 0.052, 700, family);
  ctx.font = `700 ${px}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.max(10, W * 0.016);
  ctx.fillStyle = '#ffe9f6';
  ctx.fillText(text, 0, 0);
  ctx.fillText(text, 0, 0); // second pass deepens the neon glow
  ctx.restore();
}

// A starburst seal: alternating-point star disc, inner ring, two short
// lines of editable text and a ring of tiny stars.
export function drawSeal(ctx, x, y, r, st) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.16);
  const pts = 18;
  const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffe98a'); g.addColorStop(0.7, '#ffb020'); g.addColorStop(1, '#e07b24');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.8;
    const a = (i / (pts * 2)) * Math.PI * 2;
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a2c10';
  ctx.lineWidth = r * 0.045;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6da';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b3541e';
  ctx.font = `${r * 0.34}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('★ ★ ★', 0, -r * 0.34);
  ctx.fillStyle = '#5e2408';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const l1 = (st.sealTop || 'VICE').toUpperCase();
  const l2 = (st.sealBottom || 'COAST').toUpperCase();
  ctx.font = `900 ${fitFont(ctx, l1, r * 1.15, r * 0.34, 900, 'Arial, sans-serif')}px Arial, sans-serif`;
  ctx.fillText(l1, 0, r * 0.02);
  ctx.font = `900 ${fitFont(ctx, l2, r * 1.15, r * 0.34, 900, 'Arial, sans-serif')}px Arial, sans-serif`;
  ctx.fillText(l2, 0, r * 0.32);
  ctx.restore();
}

// The bottom dressing: a palm-silhouette sunset strip behind the tagline,
// then a movie-style billing block in tiny capitals on the last line.
function drawBottomStrip(ctx, W, H, st) {
  const stripH = H * 0.085;
  const y0 = H - stripH - H * 0.028;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + stripH);
  g.addColorStop(0, '#ff9a4d'); g.addColorStop(0.6, '#e84e6d'); g.addColorStop(1, '#7a1e5e');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, stripH);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y0, W, stripH); ctx.clip();
  for (let i = 0; i < 7; i++) {
    const px = W * (0.04 + i * 0.15);
    palmSilhouette(ctx, px, y0 + stripH * 1.04, stripH * (0.8 + (i % 3) * 0.14), i % 2 ? -0.14 : 0.14, 'rgba(24,8,36,0.9)');
  }
  ctx.restore();
  const tag = (st.tagline || '').trim();
  if (tag) {
    ctx.save();
    ctx.font = `900 ${fitFont(ctx, tag.toUpperCase(), W * 0.9, stripH * 0.44, 900, '"Arial Black",Arial,sans-serif')}px "Arial Black",Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(16,6,28,0.85)';
    ctx.fillText(tag.toUpperCase(), W / 2 + 2, y0 + stripH / 2 + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tag.toUpperCase(), W / 2, y0 + stripH / 2);
    ctx.restore();
  }
  // Billing block: one credits-style line of tiny capitals, fitted so the
  // whole line always lands inside the frame.
  ctx.save();
  const billing = 'VICE COAST STUDIO PRESENTS A COVER OF YOUR OWN MAKING · STARRING YOU · LETTERING AND SEAL DRAWN BY THE STUDIO · NO TWO COVERS ALIKE';
  ctx.font = `600 ${fitFont(ctx, billing, W * 0.96, H * 0.0125, 600, 'Arial, sans-serif')}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(billing, W / 2, H - H * 0.014);
  ctx.restore();
}

// A small barcode in the bottom-left corner, its bars derived from the
// title's letters so every cover's code is its own.
function drawBarcode(ctx, W, H, st) {
  const bw = W * 0.085, bh = H * 0.026;
  const x = W * 0.016, y = H - bh - H * 0.042;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, bw + 8, bh + 12);
  ctx.fillStyle = '#111111';
  const seedText = (st.title || 'VICE COAST').toUpperCase();
  let bx = x;
  let i = 0;
  while (bx < x + bw - 2) {
    const code = seedText.charCodeAt(i % seedText.length) + i * 7;
    const wdt = 1 + (code % 3);
    if (code % 2 === 0) ctx.fillRect(bx, y, wdt, bh);
    bx += wdt + 1.4;
    i++;
  }
  ctx.font = `${Math.max(7, bh * 0.34)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#111111';
  ctx.fillText('VC-' + seedText.replace(/[^A-Z0-9]/g, '').slice(0, 6), x + bw / 2, y + bh + 7);
  ctx.restore();
}

function drawMonogram(ctx, W, H) {
  const s = H * 0.03;
  const x = W - s - W * 0.016, y = H - s - H * 0.032;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, s, s);
  ctx.font = `900 ${s * 0.44}px "Arial Black",Arial,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VC', x + s / 2, y + s / 2 + 1);
  ctx.restore();
}

// Draw the whole cover at W x H. state.panels[i] = {sourceId, zoom, ox, oy,
// flip, ink}; resolveSource(id) returns {img, cacheId} or null.
export function drawCover(ctx, W, H, st, resolveSource) {
  const layout = layoutById(st.layout);
  ctx.fillStyle = '#0d0716';
  ctx.fillRect(0, 0, W, H);
  const margin = Math.max(6, W * 0.012);
  ctx.save();
  ctx.beginPath();
  ctx.rect(margin, margin, W - margin * 2, H - margin * 2);
  ctx.clip();
  ctx.translate(margin, margin);
  const iw = W - margin * 2, ih = H - margin * 2;
  layout.panels.forEach((poly, i) => {
    const panel = st.panels[i];
    const box = panelBox(poly, iw, ih);
    ctx.save();
    panelPath(ctx, poly, iw, ih);
    ctx.clip();
    if (panel && panel.sourceId && resolveSource(panel.sourceId)) {
      const src = resolveSource(panel.sourceId);
      const ink = Math.max(0, Math.min(1, (panel.ink == null ? st.ink : panel.ink)));
      const art = processedPanel(src, box, st.grade, ink, panel, layout.id, i);
      ctx.drawImage(art, box.x, box.y);
    } else {
      const g = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
      g.addColorStop(0, '#3a2358'); g.addColorStop(1, '#170d2c');
      ctx.fillStyle = g;
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    ctx.restore();
    ctx.save(); // pale keyline around each panel
    panelPath(ctx, poly, iw, ih);
    ctx.strokeStyle = 'rgba(255,246,230,0.92)';
    ctx.lineWidth = Math.max(1.6, W * 0.0026);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
  // Cover-wide grain and vignette above the panels, below the lettering.
  if (st.grain > 0.01) {
    ctx.save();
    ctx.globalAlpha = st.grain * 0.5;
    ctx.globalCompositeOperation = 'overlay';
    const tile = makeGrainTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (st.vignette > 0.01) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.74);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(6,3,14,${0.5 * st.vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  drawTitleBlock(ctx, W, H, st);
  drawSeal(ctx, W * 0.885, H * 0.115, Math.min(W, H) * 0.075, st);
  drawBottomStrip(ctx, W, H, st);
  drawBarcode(ctx, W, H, st);
  drawMonogram(ctx, W, H);
  ctx.strokeStyle = 'rgba(255,246,230,0.95)'; // the thin pale outer frame
  ctx.lineWidth = Math.max(2, W * 0.0035);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}
