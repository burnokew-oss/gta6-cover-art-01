// Cover composition: panels edge to edge, per-panel poster finish,
// the title lying over the art, and the full poster dressing on top.

import { makeCanvas } from './samples.js';
import {
  finishPanel, gradeById, layoutById, panelPath, panelBounds,
  drawTitleBlock, drawQuoteStars, drawSeal, drawPalmStrip, drawBilling,
  drawBarcode, drawMonogram, drawFrame,
} from './poster.js';

export const SIZES = [
  { id: 'square', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];
export function sizeById(id) { return SIZES.find((s) => s.id === id) || SIZES[0]; }

function sourceSize(src) {
  return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height };
}

// Draw one source into a panel's bounding box with crop / pan / zoom / flip.
export function drawPanelSource(ctx, src, bounds, slot) {
  const { w: sw, h: sh } = sourceSize(src);
  if (!sw || !sh) return;
  const zoom = slot.zoom || 1;
  const scale = Math.max(bounds.w / sw, bounds.h / sh) * zoom;
  const dw = sw * scale, dh = sh * scale;
  const cx = bounds.x + bounds.w / 2 + (slot.panX || 0) * bounds.w;
  const cy = bounds.y + bounds.h / 2 + (slot.panY || 0) * bounds.h;
  ctx.save();
  ctx.translate(cx, cy);
  if (slot.flip) ctx.scale(-1, 1);
  ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

export function renderPanelImage(slot, bounds, grade, globalInk, grain, index) {
  const w = Math.max(8, Math.round(bounds.w));
  const h = Math.max(8, Math.round(bounds.h));
  const raw = makeCanvas(w, h);
  const rctx = raw.getContext('2d');
  drawPanelSource(rctx, slot.source, { x: 0, y: 0, w, h }, slot);
  const ink = slot.ink != null ? slot.ink : globalInk;
  return finishPanel(raw, w, h, { grade, ink, grain, seed: index + 3 });
}

export function renderCover(state, W, H) {
  const cover = makeCanvas(W, H);
  const ctx = cover.getContext('2d');
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  ctx.fillStyle = '#120a20';
  ctx.fillRect(0, 0, W, H);
  // panels, edge to edge
  layout.panels.forEach((panel, i) => {
    const slot = state.slots[i];
    const bounds = panelBounds(panel, W, H);
    ctx.save();
    panelPath(ctx, panel, W, H);
    ctx.clip();
    if (slot && slot.source) {
      const img = renderPanelImage(slot, bounds, grade, state.ink, state.grain, i);
      ctx.drawImage(img, bounds.x, bounds.y);
    } else {
      const g = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
      g.addColorStop(0, '#3a2350'); g.addColorStop(1, '#170d2c');
      ctx.fillStyle = g;
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `600 ${Math.round(W * 0.016)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
    }
    // a whisper of inner shade at each panel's top edge adds depth
    const shade = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h * 0.16);
    shade.addColorStop(0, 'rgba(10,4,18,0.18)');
    shade.addColorStop(1, 'rgba(10,4,18,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h * 0.16);
    ctx.restore();
  });
  // thin pale keylines between panels
  ctx.save();
  ctx.strokeStyle = 'rgba(255,246,226,0.95)';
  ctx.lineWidth = Math.max(2, W * 0.0035);
  ctx.lineJoin = 'round';
  for (const panel of layout.panels) { panelPath(ctx, panel, W, H); ctx.stroke(); }
  ctx.restore();
  // overall vignette (slider-driven)
  if (state.vignette > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.40, W / 2, H / 2, Math.max(W, H) * 0.76);
    vg.addColorStop(0, 'rgba(8,4,14,0)');
    vg.addColorStop(1, `rgba(8,4,14,${0.42 * state.vignette})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  // quote + stars above the title
  drawQuoteStars(ctx, W, H * 0.035, state.quote, state.quoteSource);
  // title over the art (middle by default), draggable via titleDY
  const anchorBase = state.titlePos === 'top' ? H * 0.24 : state.titlePos === 'bottom' ? H * 0.68 : H * 0.47;
  const anchorY = anchorBase + (state.titleDY || 0) * H;
  drawTitleBlock(ctx, W, H, { title: state.title, subtitle: state.subtitle, anchorY });
  // seal badge, clear of the title's right side
  drawSeal(ctx, W * 0.885, H * 0.155, W * 0.062, state.badge1, state.badge2);
  // palm strip + tagline along the bottom, billing at the very edge
  drawPalmStrip(ctx, W, H, state.tagline);
  drawBilling(ctx, W, H, state.title);
  // barcode + monogram in the bottom corners, just above the strip
  const stripTop = H - H * 0.085;
  drawBarcode(ctx, W * 0.018, stripTop - W * 0.075, W * 0.085, W * 0.058, state.title);
  drawMonogram(ctx, W * 0.955, stripTop - W * 0.045, W * 0.030);
  drawFrame(ctx, W, H);
  return cover;
}
