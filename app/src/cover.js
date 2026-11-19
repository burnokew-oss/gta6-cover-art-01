// Cover geometry and rendering for Vice Coast Cover Studio.
// Five multi-panel layouts. The title block lives in its own band ABOVE the
// panel grid by default, so every panel is fully visible in the export; a
// dragged title may sit over the panels as a translucent overlay instead.

import { GRADES, posterizePanel } from './poster.js';

// Slots are fractions of the grid area: { x, y, w, h }.
export const LAYOUTS = {
  hero: {
    name: 'Hero Split',
    slots: [
      { x: 0.000, y: 0, w: 0.520, h: 1 },
      { x: 0.532, y: 0, w: 0.228, h: 0.324 },
      { x: 0.772, y: 0, w: 0.228, h: 0.324 },
      { x: 0.532, y: 0.338, w: 0.228, h: 0.324 },
      { x: 0.772, y: 0.338, w: 0.228, h: 0.324 },
      { x: 0.532, y: 0.676, w: 0.228, h: 0.324 },
      { x: 0.772, y: 0.676, w: 0.228, h: 0.324 },
    ],
  },
  sunset: {
    name: 'Sunset Grid',
    slots: [
      { x: 0.000, y: 0, w: 0.244, h: 0.492 },
      { x: 0.252, y: 0, w: 0.244, h: 0.492 },
      { x: 0.504, y: 0, w: 0.244, h: 0.492 },
      { x: 0.756, y: 0, w: 0.244, h: 0.492 },
      { x: 0.000, y: 0.508, w: 0.244, h: 0.492 },
      { x: 0.252, y: 0.508, w: 0.244, h: 0.492 },
      { x: 0.504, y: 0.508, w: 0.244, h: 0.492 },
      { x: 0.756, y: 0.508, w: 0.244, h: 0.492 },
    ],
  },
  marquee: {
    name: 'Marquee',
    slots: [
      { x: 0, y: 0, w: 1, h: 0.44 },
      { x: 0.000, y: 0.456, w: 0.244, h: 0.544 },
      { x: 0.252, y: 0.456, w: 0.244, h: 0.544 },
      { x: 0.504, y: 0.456, w: 0.244, h: 0.544 },
      { x: 0.756, y: 0.456, w: 0.244, h: 0.544 },
    ],
  },
  reel: {
    name: 'Wide Reel',
    slots: [
      { x: 0.000, y: 0, w: 0.161, h: 1 },
      { x: 0.168, y: 0, w: 0.161, h: 1 },
      { x: 0.336, y: 0, w: 0.161, h: 1 },
      { x: 0.504, y: 0, w: 0.161, h: 1 },
      { x: 0.672, y: 0, w: 0.161, h: 1 },
      { x: 0.840, y: 0, w: 0.160, h: 1 },
    ],
  },
  boulevard: {
    name: 'Boulevard',
    slots: [
      { x: 0.000, y: 0, w: 0.328, h: 0.620 },
      { x: 0.336, y: 0, w: 0.328, h: 0.620 },
      { x: 0.672, y: 0, w: 0.328, h: 0.620 },
      { x: 0, y: 0.636, w: 1, h: 0.364 },
    ],
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

export const SIZES = {
  '1080x1080': { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

export const SIZE_IDS = Object.keys(SIZES);

// One-photo mode: a different crop of the same photo in every panel, so no
// panel repeats the same crop. Deterministic offsets per panel index.
const ONE_PHOTO_CROPS = [
  { zoom: 1.25, panX: -0.55, panY: -0.45 },
  { zoom: 1.45, panX: 0.60, panY: -0.55 },
  { zoom: 1.30, panX: 0.10, panY: 0.55 },
  { zoom: 1.60, panX: -0.70, panY: 0.35 },
  { zoom: 1.20, panX: 0.65, panY: 0.60 },
  { zoom: 1.50, panX: -0.15, panY: -0.75 },
  { zoom: 1.35, panX: 0.45, panY: -0.10 },
  { zoom: 1.70, panX: -0.45, panY: 0.70 },
];

// Posterized panels are cached by photo + geometry + grade + ink + crop, so
// dragging a slider re-renders only the panel that changed.
const panelCache = new Map();
function cachedPanel(photo, pw, ph, gradeId, ink, crop) {
  const key = [
    photo.id, pw, ph, gradeId, ink.toFixed(2),
    crop.zoom.toFixed(2), crop.panX.toFixed(2), crop.panY.toFixed(2), crop.flip,
  ].join('|');
  let hit = panelCache.get(key);
  if (!hit) {
    hit = posterizePanel(photo.source, pw, ph, gradeId, ink, crop);
    panelCache.set(key, hit);
    if (panelCache.size > 40) {
      const first = panelCache.keys().next().value;
      panelCache.delete(first);
    }
  }
  return hit;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawStarburst(ctx, cx, cy, r, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, weight, family) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// The title block: two-colour gradient title, white neon subtitle.
function drawTitleBlock(ctx, state, x, y, w, bandH, grade) {
  const title = (state.title || 'VICE COAST').toUpperCase();
  const subtitle = state.subtitle || '';
  const titleSize = fitFont(ctx, title, w * 0.94, bandH * 0.46, 900,
    `'Arial Black', 'Helvetica Neue', Arial, sans-serif`);
  const accent = grade.ramp[3][1];
  const titleGrad = ctx.createLinearGradient(x, y, x + w, y);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.55, '#ffe9a8');
  titleGrad.addColorStop(1, `rgb(${accent[0]},${accent[1]},${accent[2]})`);
  ctx.save();
  try { ctx.letterSpacing = '2px'; } catch { /* older canvas: no letterSpacing */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillText(title, x + w / 2, y + bandH * 0.30);
  ctx.restore();

  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, w * 0.8, bandH * 0.20, 700,
      `Georgia, 'Times New Roman', serif`);
    ctx.save();
    ctx.font = `italic ${subSize}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = 16;
    ctx.fillText(subtitle, x + w / 2, y + bandH * 0.74);
    ctx.restore();
  }
}

// The title band above the grid: dark gradient, accent rule, starburst badge.
function drawTitleBand(ctx, state, W, bandH, grade) {
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, '#12081f');
  band.addColorStop(0.5, '#2a0f38');
  band.addColorStop(1, '#12081f');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, bandH);
  const accent = grade.ramp[2][1];
  ctx.fillStyle = `rgb(${accent[0]},${accent[1]},${accent[2]})`;
  ctx.fillRect(0, bandH - 4, W, 4);
  // Starburst badge on the right, kept clear of the title: the title's
  // block ends before the badge's LEFT edge (badge centre minus its
  // radius), so long titles never run under it.
  const badgeR = bandH * 0.30;
  const badgeX = W - badgeR - bandH * 0.22;
  const badgeY = bandH * 0.48;
  drawStarburst(ctx, badgeX, badgeY, badgeR, '#ff2e88');
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const badgeText = (state.badge || '').trim();
  if (badgeText) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = fitFont(ctx, badgeText, badgeR * 1.5, badgeR * 0.42, 800, 'Arial, sans-serif');
    ctx.font = `800 ${size}px Arial, sans-serif`;
    ctx.fillText(badgeText, badgeX, badgeY);
    ctx.restore();
  }
  const titleMaxW = W - 2 * (2 * badgeR + bandH * 0.22 + 10);
  drawTitleBlock(ctx, state, (W - titleMaxW) / 2, 0, titleMaxW, bandH, grade);
}

// The tagline bar along the very bottom of the cover.
function drawTaglineBar(ctx, state, W, y, h) {
  ctx.fillStyle = '#0d0817';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ffc46b';
  ctx.fillRect(0, y, W, 2);
  const tagline = (state.tagline || '').toUpperCase();
  if (!tagline) return;
  ctx.save();
  ctx.fillStyle = '#f4eefc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, tagline, W * 0.92, h * 0.5, 700, 'Arial, sans-serif');
  ctx.font = `700 ${size}px Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(1, size * 0.12)}px`; } catch { /* no letterSpacing */ }
  ctx.fillText(tagline, W / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawEmptyPanel(ctx, x, y, w, h, index) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#1a1426';
  ctx.fill();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(244,238,252,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(244,238,252,0.65)';
  ctx.font = `700 ${Math.max(14, Math.round(w * 0.10))}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', x + w / 2, y + h / 2 - h * 0.08);
  ctx.font = `400 ${Math.max(10, Math.round(w * 0.045))}px Arial, sans-serif`;
  ctx.fillText(`Panel ${index + 1}`, x + w / 2, y + h / 2 + h * 0.14);
  ctx.restore();
}

// Where the panels sit on a cover of W x H, and where the title sits.
// Returns { grid, bandH, tagH } in pixels.
export function coverGeometry(W, H, titleDragged) {
  const tagH = Math.max(26, Math.round(H * 0.045));
  const bandH = titleDragged ? 0 : Math.max(90, Math.round(H * 0.165));
  const gap = Math.max(6, Math.round(W * 0.008));
  const grid = {
    x: gap,
    y: bandH + gap,
    w: W - gap * 2,
    h: H - bandH - tagH - gap * 3,
  };
  return { grid, bandH, tagH, gap };
}

export function panelRects(state, W, H) {
  const { grid } = coverGeometry(W, H, !!state.titlePos);
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero;
  return layout.slots
    .filter((s) => s.w > 0 && s.h > 0)
    .map((s) => ({
      x: grid.x + s.x * grid.w,
      y: grid.y + s.y * grid.h,
      w: s.w * grid.w,
      h: s.h * grid.h,
    }));
}

function panelPhoto(state, index) {
  const panel = state.panels[index];
  if (!panel || !panel.photoId) return null;
  return state.photos.find((p) => p.id === panel.photoId) ?? null;
}

function panelCrop(state, index, photo) {
  const panel = state.panels[index];
  if (state.onePhoto && state.photos.length === 1) {
    const c = ONE_PHOTO_CROPS[index % ONE_PHOTO_CROPS.length];
    return { ...c, flip: panel?.flip ?? false };
  }
  return {
    zoom: panel?.zoom ?? 1,
    panX: panel?.panX ?? 0,
    panY: panel?.panY ?? 0,
    flip: panel?.flip ?? false,
  };
}

// Render the whole cover onto ctx at W x H. state carries layout, grade,
// photos, panels, caption text and an optional dragged title position.
export function renderCover(ctx, state, W, H) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const { grid, bandH, tagH, gap } = coverGeometry(W, H, !!state.titlePos);
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(0, 0, W, H);
  if (!state.titlePos) drawTitleBand(ctx, state, W, bandH, grade);

  const rects = panelRects(state, W, H);
  rects.forEach((rect, i) => {
    const photo = panelPhoto(state, i);
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, Math.max(6, W * 0.006));
    ctx.clip();
    if (photo) {
      const crop = panelCrop(state, i, photo);
      const ink = state.panels[i]?.ink ?? state.ink;
      const pw = Math.max(2, Math.round(rect.w));
      const ph = Math.max(2, Math.round(rect.h));
      const panelCanvas = cachedPanel(photo, pw, ph, state.grade, ink, crop);
      ctx.drawImage(panelCanvas, rect.x, rect.y, rect.w, rect.h);
    } else {
      drawEmptyPanel(ctx, rect.x, rect.y, rect.w, rect.h, i);
    }
    ctx.restore();
    // White frame + dark outline, like a printed poster panel.
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, Math.max(6, W * 0.006));
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.stroke();
    ctx.restore();
  });

  drawTaglineBar(ctx, state, W, H - tagH, tagH);

  // A dragged title floats over the panels on a translucent scrim.
  if (state.titlePos) {
    const bw = W * 0.72;
    const bh = Math.max(70, Math.round(H * 0.11));
    const bx = state.titlePos.x * W - bw / 2;
    const by = state.titlePos.y * H - bh / 2;
    ctx.save();
    roundRectPath(ctx, bx, by, bw, bh, 12);
    ctx.fillStyle = 'rgba(10,6,20,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    drawTitleBlock(ctx, state, bx, by, bw, bh, grade);
  }
  return { grid, bandH, tagH, gap, rects };
}

// Render the cover at an export size and return the canvas.
export function renderCoverCanvas(state, sizeId) {
  const size = SIZES[sizeId] ?? SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  renderCover(ctx, state, size.w, size.h);
  return canvas;
}
