// Cover renderer for Vice Coast Cover Studio.
// drawViceCoastCover paints one full poster: eight stylized photo panels in a
// chosen layout, a starburst badge, and a movable gradient title block with a
// neon script subtitle and a tagline bar. All drawing is plain Canvas 2D.

import { applyPosterGrade, gradeById, addPrintGrain, addCoverVignette } from './poster.js';

// Five multi-panel layouts. Every rect is a fraction of the cover, so one
// layout serves the square, portrait and wide export sizes. Each layout has
// exactly eight panels: one hero, a stack or row, and a bottom strip.
export const COVER_LAYOUTS = [
  {
    id: 'hero-split', name: 'Hero Split',
    panels: [
      { x: 0, y: 0, w: 0.56, h: 0.66 }, { x: 0.56, y: 0, w: 0.44, h: 0.22 },
      { x: 0.56, y: 0.22, w: 0.44, h: 0.22 }, { x: 0.56, y: 0.44, w: 0.44, h: 0.22 },
      { x: 0, y: 0.66, w: 0.25, h: 0.34 }, { x: 0.25, y: 0.66, w: 0.25, h: 0.34 },
      { x: 0.5, y: 0.66, w: 0.25, h: 0.34 }, { x: 0.75, y: 0.66, w: 0.25, h: 0.34 },
    ],
  },
  {
    id: 'sunset-grid', name: 'Sunset Grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.4 }, { x: 0.5, y: 0, w: 0.5, h: 0.4 },
      { x: 0, y: 0.4, w: 0.34, h: 0.3 }, { x: 0.34, y: 0.4, w: 0.33, h: 0.3 },
      { x: 0.67, y: 0.4, w: 0.33, h: 0.3 }, { x: 0, y: 0.7, w: 0.25, h: 0.3 },
      { x: 0.25, y: 0.7, w: 0.25, h: 0.3 }, { x: 0.5, y: 0.7, w: 0.5, h: 0.3 },
    ],
  },
  {
    id: 'marquee', name: 'Marquee',
    panels: [
      { x: 0.22, y: 0, w: 0.56, h: 0.62 }, { x: 0, y: 0, w: 0.22, h: 0.31 },
      { x: 0, y: 0.31, w: 0.22, h: 0.31 }, { x: 0.78, y: 0, w: 0.22, h: 0.31 },
      { x: 0.78, y: 0.31, w: 0.22, h: 0.31 }, { x: 0, y: 0.62, w: 0.33, h: 0.38 },
      { x: 0.33, y: 0.62, w: 0.34, h: 0.38 }, { x: 0.67, y: 0.62, w: 0.33, h: 0.38 },
    ],
  },
  {
    id: 'wide-reel', name: 'Wide Reel',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 0.58 }, { x: 0.62, y: 0, w: 0.38, h: 0.58 },
      { x: 0, y: 0.58, w: 0.1667, h: 0.42 }, { x: 0.1667, y: 0.58, w: 0.1667, h: 0.42 },
      { x: 0.3334, y: 0.58, w: 0.1667, h: 0.42 }, { x: 0.5, y: 0.58, w: 0.1667, h: 0.42 },
      { x: 0.6667, y: 0.58, w: 0.1667, h: 0.42 }, { x: 0.8334, y: 0.58, w: 0.1666, h: 0.42 },
    ],
  },
  {
    id: 'boulevard', name: 'Boulevard',
    panels: [
      { x: 0, y: 0, w: 0.33, h: 0.28 }, { x: 0.33, y: 0, w: 0.34, h: 0.28 },
      { x: 0.67, y: 0, w: 0.33, h: 0.28 }, { x: 0, y: 0.28, w: 1, h: 0.44 },
      { x: 0, y: 0.72, w: 0.25, h: 0.28 }, { x: 0.25, y: 0.72, w: 0.25, h: 0.28 },
      { x: 0.5, y: 0.72, w: 0.25, h: 0.28 }, { x: 0.75, y: 0.72, w: 0.25, h: 0.28 },
    ],
  },
];

export function layoutById(id) {
  return COVER_LAYOUTS.find((l) => l.id === id) || COVER_LAYOUTS[0];
}

// Eight distinct crop windows across one photo, so a single photo fills every
// panel with a different view of itself — never the same picture twice.
export const SINGLE_PHOTO_CROPS = [
  { x: 0, y: 0, w: 0.62, h: 0.62 }, { x: 0.38, y: 0, w: 0.62, h: 0.62 },
  { x: 0, y: 0.38, w: 0.62, h: 0.62 }, { x: 0.38, y: 0.38, w: 0.62, h: 0.62 },
  { x: 0.19, y: 0, w: 0.62, h: 0.62 }, { x: 0, y: 0.19, w: 0.62, h: 0.62 },
  { x: 0.38, y: 0.19, w: 0.62, h: 0.62 }, { x: 0.19, y: 0.38, w: 0.62, h: 0.62 },
];

const panelCache = new Map();
function cacheKey(photoId, gradeId, ink, pw, ph, crop, zoom, panX, panY, flip) {
  return [photoId, gradeId, ink, pw, ph, crop.x, crop.y, crop.w, crop.h, zoom, panX, panY, flip].join('|');
}

// Render one photo panel, stylized, into a fresh canvas of pw x ph.
export function renderStylizedPanel(photo, panel, grade, pw, ph) {
  const key = cacheKey(photo.id, grade.id, panel.ink, pw, ph, panel.crop, panel.zoom, panel.panX, panel.panY, panel.flip);
  const hit = panelCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, pw);
  canvas.height = Math.max(2, ph);
  // Draw the crop onto a separate work canvas first: drawing a canvas onto
  // itself corrupts the image in Chrome, so the stylize step must read from
  // one canvas and write to another.
  const work = document.createElement('canvas');
  work.width = canvas.width;
  work.height = canvas.height;
  const wctx = work.getContext('2d');
  const sw = photo.w;
  const sh = photo.h;
  const zoom = panel.zoom / 100;
  // Match the crop window to the panel's aspect ratio first, so circles stay
  // round and faces never stretch: widen or heighten the window, re-centred.
  let cropW = panel.crop.w;
  let cropH = panel.crop.h;
  let cropX = panel.crop.x;
  let cropY = panel.crop.y;
  const panelAspect = pw / ph;
  const cropAspect = (cropW * sw) / (cropH * sh);
  if (cropAspect < panelAspect) {
    // Panel is wider than the crop: widen the window, or — when the source
    // is too narrow — shorten it instead. Either way the aspect matches.
    const wantW = (cropH * sh * panelAspect) / sw;
    if (wantW <= 1) {
      cropX = Math.max(0, Math.min(1 - wantW, cropX + (cropW - wantW) / 2));
      cropW = wantW;
    } else {
      const wantH = (cropW * sw) / (panelAspect * sh);
      cropY = Math.max(0, Math.min(1 - wantH, cropY + (cropH - wantH) / 2));
      cropH = wantH;
    }
  } else if (cropAspect > panelAspect) {
    const wantH = (cropW * sw) / (panelAspect * sh);
    if (wantH <= 1) {
      cropY = Math.max(0, Math.min(1 - wantH, cropY + (cropH - wantH) / 2));
      cropH = wantH;
    } else {
      const wantW = (cropH * sh * panelAspect) / sw;
      cropX = Math.max(0, Math.min(1 - wantW, cropX + (cropW - wantW) / 2));
      cropW = wantW;
    }
  }
  const cw = (cropW * sw) / zoom;
  const ch = (cropH * sh) / zoom;
  const cx = cropX * sw + (cropW * sw - cw) / 2 + (panel.panX / 100) * cw * 0.4;
  const cy = cropY * sh + (cropH * sh - ch) / 2 + (panel.panY / 100) * ch * 0.4;
  const sx = Math.max(0, Math.min(sw - cw, cx));
  const sy = Math.max(0, Math.min(sh - ch, cy));
  if (panel.flip) {
    wctx.save();
    wctx.translate(pw, 0);
    wctx.scale(-1, 1);
    wctx.drawImage(photo.source, sx, sy, cw, ch, 0, 0, pw, ph);
    wctx.restore();
  } else {
    wctx.drawImage(photo.source, sx, sy, cw, ch, 0, 0, pw, ph);
  }
  applyPosterGrade(work, canvas, grade, panel.ink);
  if (panelCache.size > 48) panelCache.clear();
  panelCache.set(key, canvas);
  return canvas;
}

export function clearPanelCache() {
  panelCache.clear();
}

function drawStarburstBadge(ctx, cx, cy, radius, lines) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.07);
  ctx.strokeStyle = '#7a0e2e';
  ctx.stroke();
  ctx.rotate(0.21);
  ctx.fillStyle = '#7a0e2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = lines;
  const lineH = radius * 0.42;
  const total = words.length;
  words.forEach((word, i) => {
    const size = i === 0 ? radius * 0.44 : radius * 0.3;
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    ctx.fillText(word, 0, (i - (total - 1) / 2) * lineH);
  });
  ctx.restore();
}

function drawTitleBlock(ctx, state, grade, W, H) {
  const sizeFactor = state.titleSize / 100;
  const titlePx = Math.round(W * 0.105 * sizeFactor);
  const bandW = W * 0.88;
  const bandX = Math.max(0, Math.min(W - bandW, (state.titleX / 100) * W));
  const subPx = Math.round(titlePx * 0.44);
  const tagPx = Math.round(W * 0.026);
  const bandH = titlePx + subPx + tagPx + Math.round(W * 0.055);
  const bandY = Math.max(0, Math.min(H - bandH, (state.titleY / 100) * H));
  // Band: deep plum fading into the grade's mid colour, with a hot top stripe.
  const band = ctx.createLinearGradient(bandX, bandY, bandX + bandW, bandY);
  band.addColorStop(0, 'rgba(24, 6, 44, 0.94)');
  band.addColorStop(1, 'rgba(122, 14, 46, 0.94)');
  ctx.fillStyle = band;
  ctx.fillRect(bandX, bandY, bandW, bandH);
  const stripe = ctx.createLinearGradient(bandX, 0, bandX + bandW, 0);
  stripe.addColorStop(0, '#ffb347');
  stripe.addColorStop(0.5, '#ff2e88');
  stripe.addColorStop(1, '#2ee6c8');
  ctx.fillStyle = stripe;
  ctx.fillRect(bandX, bandY, bandW, Math.max(4, W * 0.006));
  // Title: two-tone gradient letters, heavy dark outline, hard drop shadow.
  const title = (state.title || 'VICE COAST').toUpperCase();
  const titleGrad = ctx.createLinearGradient(bandX, bandY, bandX + bandW, bandY + titlePx);
  const stops = grade.stops;
  titleGrad.addColorStop(0, '#ffe9a8');
  titleGrad.addColorStop(0.45, `rgb(${stops[2][1]}, ${stops[2][2]}, ${stops[2][3]})`);
  titleGrad.addColorStop(1, `rgb(${stops[1][1]}, ${stops[1][2]}, ${stops[1][3]})`);
  ctx.save();
  ctx.font = `900 ${titlePx}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = Math.round(titlePx * 0.07);
  ctx.lineWidth = Math.max(3, titlePx * 0.09);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a0526';
  const tx = bandX + W * 0.03;
  let ty = bandY + W * 0.014;
  ctx.strokeText(title, tx, ty);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, tx, ty);
  ctx.restore();
  // Script subtitle in glowing white, overlapping the title's tail.
  const subtitle = state.subtitle || '';
  if (subtitle) {
    ctx.save();
    ctx.font = `italic 700 ${subPx}px "Brush Script MT", "Segoe Script", cursive`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(subPx * 0.35);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, tx + titlePx * 0.35, bandY + titlePx * 0.82);
    ctx.restore();
  }
  // Tagline bar: dark strip, amber letterspaced caps.
  const tagline = (state.tagline || '').toUpperCase();
  if (tagline) {
    const barH = tagPx + Math.round(W * 0.014);
    const barY = bandY + bandH - barH - Math.round(W * 0.008);
    ctx.fillStyle = 'rgba(8, 2, 18, 0.92)';
    ctx.fillRect(tx, barY, bandW - W * 0.06, barH);
    ctx.save();
    ctx.font = `700 ${tagPx}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(tagline, tx + W * 0.012, barY + barH / 2);
    ctx.restore();
  }
  return { x: bandX, y: bandY, w: bandW, h: bandH };
}

// Paint the whole cover. `state` carries layout, grade, photos, panels and
// caption; `opts.showSelection` draws the selected panel's pink frame.
export function drawViceCoastCover(ctx, state, W, H, opts = {}) {
  const grade = gradeById(state.gradeId);
  const layout = layoutById(state.layoutId);
  ctx.fillStyle = '#fff6e8';
  ctx.fillRect(0, 0, W, H);
  const gutter = Math.max(3, Math.round(W * 0.007));
  layout.panels.forEach((rect, i) => {
    const panel = state.panels[i];
    const px = Math.round(rect.x * W) + gutter;
    const py = Math.round(rect.y * H) + gutter;
    const pw = Math.round(rect.w * W) - gutter * 2;
    const ph = Math.round(rect.h * H) - gutter * 2;
    const photo = state.photos[panel.photoIndex];
    if (photo) {
      const styled = renderStylizedPanel(photo, panel, grade, pw, ph);
      ctx.drawImage(styled, px, py, pw, ph);
    } else {
      ctx.fillStyle = '#241a3d';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#5a4a86';
      ctx.font = `700 ${Math.round(W * 0.02)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PANEL ${i + 1}`, px + pw / 2, py + ph / 2);
    }
    ctx.strokeStyle = '#fff6e8';
    ctx.lineWidth = gutter;
    ctx.strokeRect(px, py, pw, ph);
    if (opts.showSelection && state.selectedPanel === i) {
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(3, W * 0.006);
      ctx.strokeRect(px, py, pw, ph);
    }
  });
  addPrintGrain(ctx, W, H, 0.7);
  addCoverVignette(ctx, W, H);
  // Starburst badge on the hero panel's corner.
  const hero = layout.panels[0];
  const badgeR = Math.round(W * 0.072);
  const badgeText = (state.badge || '').trim();
  if (badgeText) {
    const words = badgeText.split(/\s+/);
    const mid = Math.ceil(words.length / 2);
    drawStarburstBadge(
      ctx,
      hero.x * W + badgeR * 1.15,
      hero.y * H + badgeR * 1.15,
      badgeR,
      [words.slice(0, mid).join(' '), words.slice(mid).join(' ')].filter(Boolean),
    );
  }
  return drawTitleBlock(ctx, state, grade, W, H);
}
