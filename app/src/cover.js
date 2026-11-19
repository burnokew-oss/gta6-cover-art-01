// cover.js — the cover renderer for Vice Coast Cover Studio.
// Pure canvas 2D, no DOM, no network. Everything drawn here is original:
// panel geometry, gradients, skyline and sun shapes, and the poster lettering.
// A "photo slot" is one loaded picture plus its own crop/pan/zoom state.

export const GRADES = {
  sunset: { name: 'Vice Sunset', hint: 'Warm orange, pink and violet, like a Vice City evening.' },
  neon: { name: 'Neon Nights', hint: 'Hot magenta and cyan glow, like Ocean Drive after dark.' },
  mono: { name: 'Noir', hint: 'High-contrast black and white, like a stakeout photo.' },
};

export const LAYOUTS = {
  hero: { name: 'Hero Split', hint: 'One big hero photo, two smaller panels beside it.' },
  triptych: { name: 'Triptych', hint: 'Three tall panels side by side.' },
  grid: { name: 'Grid + Title', hint: 'Three photos and a title panel in a 2 x 2 grid.' },
  strip: { name: 'Skyline Strip', hint: 'A wide hero photo over a strip of two.' },
};

export const CAPTION_STYLES = {
  solid: { name: 'Solid White' },
  sunset: { name: 'Sunset Fill' },
  neon: { name: 'Neon Glow' },
};

// One panel: its box in fractions of the cover, and which photo slot fills it.
// Slot 3 is the title panel (no photo): it carries the caption as big stacked type.
export function layoutPanels(layout, W, H) {
  const g = Math.max(4, Math.round(W * 0.008)); // gutter, scales with the cover
  switch (layout) {
    case 'triptych': {
      const w = (W - g * 4) / 3;
      return [
        { x: g, y: g, w, h: H - g * 2, slot: 0 },
        { x: g * 2 + w, y: g, w, h: H - g * 2, slot: 1 },
        { x: g * 3 + w * 2, y: g, w, h: H - g * 2, slot: 2 },
      ];
    }
    case 'grid': {
      const w = (W - g * 3) / 2;
      const h = (H - g * 3) / 2;
      return [
        { x: g, y: g, w, h, slot: 0 },
        { x: g * 2 + w, y: g, w, h, slot: 1 },
        { x: g, y: g * 2 + h, w, h, slot: 2 },
        { x: g * 2 + w, y: g * 2 + h, w, h, slot: 3 },
      ];
    }
    case 'strip': {
      const topH = (H - g * 3) * 0.62;
      const botH = H - topH - g * 3;
      const w = (W - g * 3) / 2;
      return [
        { x: g, y: g, w: W - g * 2, h: topH, slot: 0 },
        { x: g, y: g * 2 + topH, w, h: botH, slot: 1 },
        { x: g * 2 + w, y: g * 2 + topH, w, h: botH, slot: 2 },
      ];
    }
    case 'hero':
    default: {
      const leftW = (W - g * 3) * 0.62;
      const rightW = W - leftW - g * 3;
      const halfH = (H - g * 3) / 2;
      return [
        { x: g, y: g, w: leftW, h: H - g * 2, slot: 0 },
        { x: g * 2 + leftW, y: g, w: rightW, h: halfH, slot: 1 },
        { x: g * 2 + leftW, y: g * 2 + halfH, w: rightW, h: halfH, slot: 2 },
      ];
    }
  }
}

// Draw one photo into one panel, honouring its own crop state.
// photo: { img, zoom, panX, panY, flip, fit } — pan is a fraction of the panel,
// zoom 1 means "just fill the panel", fit 'cover' crops, 'contain' letterboxes.
function drawPhoto(ctx, photo, panel) {
  const { img } = photo;
  if (!img || !img.naturalWidth) return false;
  const pw = panel.w;
  const ph = panel.h;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = photo.fit === 'contain'
    ? Math.min(pw / iw, ph / ih)
    : Math.max(pw / iw, ph / ih);
  const scale = base * (photo.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  // Pan: 0 centres the photo; positive panX moves the photo right (view left).
  const dx = panel.x + (pw - dw) / 2 + (photo.panX || 0) * pw;
  const dy = panel.y + (ph - dh) / 2 + (photo.panY || 0) * ph;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, pw, ph);
  ctx.clip();
  if (photo.fit === 'contain') {
    ctx.fillStyle = '#12081f';
    ctx.fillRect(panel.x, panel.y, pw, ph);
  }
  if (photo.flip) {
    ctx.translate(panel.x + pw / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(panel.x + pw / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

// A panel with no photo yet: a tinted placeholder with a big slot number.
function drawEmptyPanel(ctx, panel, slot, W) {
  const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
  grad.addColorStop(0, '#2a1245');
  grad.addColorStop(1, '#12081f');
  ctx.fillStyle = grad;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = Math.max(1, W * 0.001);
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(panel.x + 6, panel.y + 6, panel.w - 12, panel.h - 12);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `900 ${Math.round(Math.min(panel.w, panel.h) * 0.28)}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(slot + 1), panel.x + panel.w / 2, panel.y + panel.h / 2 - Math.min(panel.w, panel.h) * 0.06);
  ctx.font = `700 ${Math.round(Math.min(panel.w, panel.h) * 0.07)}px Arial, sans-serif`;
  ctx.fillText('ADD PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2 + Math.min(panel.w, panel.h) * 0.16);
}

// The title panel (grid layout): the caption stacked huge on a gradient.
function drawTitlePanel(ctx, panel, state, W) {
  const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  if (state.grade === 'neon') {
    grad.addColorStop(0, '#12002e');
    grad.addColorStop(1, '#3d0a5e');
  } else if (state.grade === 'mono') {
    grad.addColorStop(0, '#1c1c1c');
    grad.addColorStop(1, '#000000');
  } else {
    grad.addColorStop(0, '#ff7a3d');
    grad.addColorStop(1, '#7b2fbe');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  const words = (state.caption.text || 'VICE COAST').toUpperCase().split(/\s+/).filter(Boolean);
  const size = Math.min(panel.w / 4.2, panel.h / (words.length * 1.15));
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
  const total = words.length * size * 1.05;
  words.forEach((word, i) => {
    const y = panel.y + panel.h / 2 - total / 2 + i * size * 1.05 + size * 0.5;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(10,5,20,0.9)';
    ctx.strokeText(word, panel.x + panel.w / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(word, panel.x + panel.w / 2, y);
  });
  ctx.restore();
}

// A simple original skyline silhouette, drawn with canvas paths.
function drawSkyline(ctx, W, H, grade) {
  const baseY = H * 0.94;
  ctx.save();
  ctx.fillStyle = grade === 'mono' ? 'rgba(0,0,0,0.55)' : 'rgba(20,6,38,0.6)';
  // Building blocks with a few lit windows.
  let x = 0;
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (x < W) {
    const bw = W * (0.03 + rand() * 0.05);
    const bh = H * (0.04 + rand() * 0.12);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rand() > 0.5) {
      ctx.fillStyle = grade === 'neon' ? 'rgba(0,229,255,0.8)' : 'rgba(255,214,120,0.9)';
      ctx.fillRect(x + bw * 0.3, baseY - bh * 0.7, bw * 0.12, bh * 0.12);
      ctx.fillStyle = grade === 'mono' ? 'rgba(0,0,0,0.55)' : 'rgba(20,6,38,0.6)';
    }
    x += bw + W * 0.006;
  }
  ctx.restore();
}

// The colour grade: translucent gradient veils over the whole cover.
function applyGrade(ctx, W, H, grade, intensity) {
  const a = Math.max(0, Math.min(1, intensity ?? 0.55));
  ctx.save();
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(255,150,60,${0.28 * a})`);
    g.addColorStop(0.55, `rgba(255,94,122,${0.22 * a})`);
    g.addColorStop(1, `rgba(123,47,190,${0.30 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(255,120,40,${0.35 * a})`;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'neon') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `rgba(255,0,170,${0.30 * a})`);
    g.addColorStop(1, `rgba(0,229,255,${0.30 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(120,0,255,${0.25 * a})`;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'mono') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(0,0,0,${0.18 * a})`;
    ctx.fillRect(0, 0, W, H);
  }
  // Vignette, every grade.
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.28 * a + 0.08})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Bold poster lettering for the caption, with outline + style fill.
function drawCaption(ctx, W, H, state) {
  const text = (state.caption.text || '').trim();
  if (!text) return;
  const pos = state.caption.position || 'bottom';
  const size = Math.round(W * (state.caption.size ?? 0.085));
  const y = pos === 'top' ? H * 0.10 : H * 0.90;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate(-0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px "Arial Black", Impact, "Franklin Gothic Heavy", sans-serif`;
  const upper = text.toUpperCase();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.strokeStyle = 'rgba(12,4,24,0.95)';
  ctx.strokeText(upper, 0, 0);
  if (state.caption.style === 'sunset') {
    const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    g.addColorStop(0, '#ffe27a');
    g.addColorStop(0.5, '#ff7a3d');
    g.addColorStop(1, '#ff2e88');
    ctx.fillStyle = g;
  } else if (state.caption.style === 'neon') {
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = '#eafcff';
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText(upper, 0, 0);
  ctx.shadowBlur = 0;
  // Tagline under the caption.
  const tag = (state.caption.tagline || '').trim();
  if (tag) {
    ctx.font = `700 ${Math.round(size * 0.28)}px Arial, sans-serif`;
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeStyle = 'rgba(12,4,24,0.9)';
    const ty = size * 0.78;
    ctx.strokeText(tag.toUpperCase(), 0, ty);
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(tag.toUpperCase(), 0, ty);
  }
  ctx.restore();
}

// White gutters + a thin outer frame, the poster look.
function drawFrame(ctx, W, H, panels) {
  const g = Math.max(4, Math.round(W * 0.008));
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = g;
  ctx.strokeRect(g / 2, g / 2, W - g, H - g);
  ctx.lineWidth = Math.max(1, W * 0.002);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  for (const p of panels) ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.restore();
}

// The whole cover. state:
// { layout, grade, gradeIntensity, photos: [photo, photo, photo],
//   caption: { text, tagline, size, position, style } }
export function drawCover(ctx, W, H, state) {
  // Backdrop: deep violet, so letterbox and gutters read as poster paper.
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, 0, W, H);
  const panels = layoutPanels(state.layout || 'hero', W, H);
  for (const panel of panels) {
    if (panel.slot === 3) {
      drawTitlePanel(ctx, panel, state, W);
      continue;
    }
    const photo = state.photos[panel.slot];
    const drawn = photo ? drawPhoto(ctx, photo, panel) : false;
    if (!drawn) drawEmptyPanel(ctx, panel, panel.slot, W);
  }
  if (state.grade !== 'none') applyGrade(ctx, W, H, state.grade || 'sunset', state.gradeIntensity ?? 0.55);
  if (state.layout !== 'grid') drawSkyline(ctx, W, H, state.grade || 'sunset');
  // In the grid layout the title panel already carries the caption.
  if (state.layout !== 'grid') drawCaption(ctx, W, H, state);
  drawFrame(ctx, W, H, panels);
  ctx.restore();
  return panels;
}

// Which panel (if any) holds point (x, y) in cover coordinates.
export function panelAt(panels, x, y) {
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p;
  }
  return null;
}
