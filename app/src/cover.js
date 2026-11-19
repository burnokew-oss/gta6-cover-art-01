// Vice Coast Cover Studio — the cover renderer.
// Draws a multi-panel GTA-style poster from the editor state onto any 2D
// canvas: panel photos with per-photo crop/pan/zoom, a retro sun and palm
// silhouettes drawn from paths (all art is our own), a colour grade wash,
// bold gradient poster lettering, grain and a vignette. Pure canvas, no
// network, no fonts or images from outside the app.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#ffd166', '#ff7a3d', '#ff2e63', '#3b1055'],
    wash: 'rgba(255, 90, 60, 0.20)',
    deep: 'rgba(120, 20, 90, 0.28)',
    title: ['#ffe66d', '#ff9e3d', '#ff2e63'],
    outline: '#2b0a3d',
    accent: '#ffd166',
    ink: '#1c0b2e',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#0b0618', '#1b0b38', '#3d0a5e', '#0b0618'],
    wash: 'rgba(255, 45, 180, 0.22)',
    deep: 'rgba(0, 220, 255, 0.16)',
    title: ['#7df9ff', '#ff5ce1', '#ffe66d'],
    outline: '#12042e',
    accent: '#ff5ce1',
    ink: '#0b0618',
  },
  pastel: {
    label: 'Vice Day',
    sky: ['#a8edea', '#7fd8d0', '#ffb08a', '#ff8e6e'],
    wash: 'rgba(255, 170, 120, 0.16)',
    deep: 'rgba(20, 120, 140, 0.18)',
    title: ['#0f766e', '#ff6b4a', '#ffb020'],
    outline: '#ffffff',
    accent: '#0f766e',
    ink: '#123332',
  },
};

export const LAYOUTS = {
  hero3: { label: 'Hero + 3', panels: 4 },
  grid4: { label: 'Four Square', panels: 4 },
  strip: { label: 'Hero + Strip', panels: 3 },
  tilted: { label: 'Snapshots', panels: 3 },
};

/** Panel rectangles for a layout, as fractions of the cover (x, y, w, h, rot). */
export function layoutPanels(layout, w, h) {
  const g = Math.min(w, h) * 0.016; // gutter
  const m = Math.min(w, h) * 0.02; // outer margin
  const iw = w - m * 2;
  const ih = h - m * 2;
  if (layout === 'grid4') {
    const cw = (iw - g) / 2;
    const ch = (ih - g) / 2;
    return [
      { x: m, y: m, w: cw, h: ch, rot: 0 },
      { x: m + cw + g, y: m, w: cw, h: ch, rot: 0 },
      { x: m, y: m + ch + g, w: cw, h: ch, rot: 0 },
      { x: m + cw + g, y: m + ch + g, w: cw, h: ch, rot: 0 },
    ];
  }
  if (layout === 'strip') {
    const heroH = ih * 0.66;
    const sw = (iw - g) / 2;
    return [
      { x: m, y: m, w: iw, h: heroH, rot: 0 },
      { x: m, y: m + heroH + g, w: sw, h: ih - heroH - g, rot: 0 },
      { x: m + sw + g, y: m + heroH + g, w: sw, h: ih - heroH - g, rot: 0 },
    ];
  }
  if (layout === 'tilted') {
    const pw = iw * 0.52;
    const ph = ih * 0.56;
    return [
      { x: m + iw * 0.04, y: m + ih * 0.05, w: pw, h: ph, rot: -0.055 },
      { x: m + iw * 0.44, y: m + ih * 0.02, w: pw, h: ph, rot: 0.045 },
      { x: m + iw * 0.24, y: m + ih * 0.42, w: pw, h: ph, rot: -0.015 },
    ];
  }
  // hero3: big hero on the left, three stacked panels on the right.
  const heroW = iw * 0.62;
  const sideW = iw - heroW - g;
  const sideH = (ih - g * 2) / 3;
  return [
    { x: m, y: m, w: heroW, h: ih, rot: 0 },
    { x: m + heroW + g, y: m, w: sideW, h: sideH, rot: 0 },
    { x: m + heroW + g, y: m + sideH + g, w: sideW, h: sideH, rot: 0 },
    { x: m + heroW + g, y: m + (sideH + g) * 2, w: sideW, h: sideH, rot: 0 },
  ];
}

/** Cover-fit draw of one photo into a rect, with zoom and pan offsets. */
export function drawPhotoInto(ctx, img, rect, zoom, panX, panY) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + panX * rect.w * 0.4;
  const cy = rect.y + rect.h / 2 + panY * rect.h * 0.4;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(2, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A retro sun: a gradient disc cut by horizontal slits, our own vector art. */
export function drawRetroSun(ctx, cx, cy, r, grade) {
  const sun = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sun.addColorStop(0, '#ffe66d');
  sun.addColorStop(0.55, '#ff7a3d');
  sun.addColorStop(1, '#ff2e63');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = grade.sky[grade.sky.length - 1];
  let y = cy + r * 0.08;
  let gap = r * 0.07;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.4;
    gap *= 1.5;
  }
  ctx.restore();
}

/** A stylised palm silhouette, drawn from quadratic curves. */
export function drawPalm(ctx, x, y, size, color, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lean, 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, curving gently.
  ctx.lineWidth = size * 0.028;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.05, -size * 0.5, size * 0.01, -size * 0.95);
  ctx.stroke();
  const topX = size * 0.01;
  const topY = -size * 0.95;
  // Fronds: short arcs drooping from the crown.
  const fronds = [-2.2, -1.5, -0.8, -0.1, 0.6, 1.3];
  ctx.lineWidth = size * 0.02;
  for (const a of fronds) {
    const ex = topX + Math.sin(a) * size * 0.38;
    const ey = topY + size * 0.3 - Math.cos(a) * size * 0.12;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.sin(a) * size * 0.24, topY - size * 0.14, ex, ey);
    ctx.stroke();
  }
  // Coconuts at the crown.
  ctx.beginPath();
  ctx.arc(topX - size * 0.03, topY + size * 0.03, size * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + size * 0.04, topY + size * 0.04, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One panel: photo, grade wash, white keyline, sun or palms on the hero. */
function drawPanel(ctx, panel, photo, grade, w, h, isHero, index) {
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  ctx.rotate(panel.rot || 0);
  ctx.translate(-panel.w / 2, -panel.h / 2);
  const r = Math.min(panel.w, panel.h) * 0.03;
  roundRectPath(ctx, 0, 0, panel.w, panel.h, r);
  ctx.clip();
  if (photo && photo.img) {
    drawPhotoInto(ctx, photo.img, { x: 0, y: 0, w: panel.w, h: panel.h }, photo.zoom, photo.panX, photo.panY);
  } else {
    const empty = ctx.createLinearGradient(0, 0, panel.w, panel.h);
    empty.addColorStop(0, grade.sky[1]);
    empty.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = empty;
    ctx.fillRect(0, 0, panel.w, panel.h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.max(14, panel.w * 0.055)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', panel.w / 2, panel.h / 2);
  }
  // Grade wash: warm tint over everything, cool depth from the bottom.
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, panel.w, panel.h);
  const deep = ctx.createLinearGradient(0, panel.h * 0.45, 0, panel.h);
  deep.addColorStop(0, 'rgba(0,0,0,0)');
  deep.addColorStop(1, grade.deep);
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, panel.w, panel.h);
  // Decorative art on the hero panel only, kept to the corners so it never
  // covers the person's face: a small retro sun top-right, palms low.
  if (isHero) {
    const sr = Math.min(panel.w, panel.h) * 0.17;
    ctx.globalAlpha = 0.85;
    drawRetroSun(ctx, panel.w * 0.85, panel.h * 0.13, sr, grade);
    ctx.globalAlpha = 1;
    drawPalm(ctx, panel.w * 0.07, panel.h * 1.02, panel.h * 0.3, grade.ink, 1);
    drawPalm(ctx, panel.w * 0.93, panel.h * 1.02, panel.h * 0.24, grade.ink, -1);
  }
  ctx.restore();
  // White keyline and soft shadow around the panel.
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  ctx.rotate(panel.rot || 0);
  ctx.translate(-panel.w / 2, -panel.h / 2);
  roundRectPath(ctx, 0, 0, panel.w, panel.h, r);
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.006);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.stroke();
  ctx.restore();
  void index;
}

/** Big poster lettering: gradient fill, thick outline, soft drop shadow. */
export function drawTitleBlock(ctx, state, grade, w, h, panels) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  if (!title && !sub) return;
  const bandH = h * 0.2;
  const bandY = state.titlePos === 'top' ? h * 0.015 : h - bandH - h * 0.015;
  // Dark scrim behind the lettering so it reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(0.35, 'rgba(10,4,24,0.55)');
  scrim.addColorStop(1, 'rgba(10,4,24,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY, w, bandH);
  // Halftone dots flanking the title.
  ctx.fillStyle = grade.accent;
  ctx.globalAlpha = 0.5;
  const dot = Math.max(3, w * 0.004);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.beginPath();
      ctx.arc(w * 0.035 + col * dot * 3, bandY + bandH * 0.3 + row * dot * 3, dot * (1 - row * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.965 - col * dot * 3, bandY + bandH * 0.3 + row * dot * 3, dot * (1 - row * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (title) {
    let size = h * 0.105 * state.titleSize;
    const setFont = (s) => { ctx.font = `900 ${s}px "Arial Black", "Archivo Black", sans-serif`; };
    setFont(size);
    try { ctx.letterSpacing = `${Math.max(1, size * 0.02)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(title).width > w * 0.92 && size > 16) {
      size -= 4;
      setFont(size);
    }
    const ty = bandY + bandH * 0.58;
    const grad = ctx.createLinearGradient(0, ty - size, 0, ty + size * 0.25);
    grade.title.forEach((c, i) => grad.addColorStop(i / (grade.title.length - 1), c));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
    if (state.outline) {
      ctx.strokeStyle = grade.outline;
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.strokeText(title, w / 2, ty);
    }
    ctx.fillStyle = grad;
    ctx.fillText(title, w / 2, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (sub) {
    const subSize = Math.max(14, h * 0.032);
    ctx.font = `italic bold ${subSize}px "Brush Script MT", "Segoe Script", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.3;
    const sy = bandY + bandH * (title ? 0.86 : 0.5);
    ctx.fillText(sub, w / 2, sy);
    ctx.shadowBlur = 0;
  }
  void panels;
}

/** Small star badge in the top corner: an invented mark, no real logo. */
function drawBadge(ctx, grade, w, h) {
  const cx = w * 0.94;
  const cy = h * 0.055;
  const r = Math.min(w, h) * 0.042;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = grade.accent;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.strokeStyle = grade.outline;
  ctx.stroke();
  ctx.fillStyle = grade.ink;
  ctx.font = `900 ${r * 0.52}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 0, r * 0.02);
  ctx.restore();
}

let grainTile = null;
function grainPattern(ctx, w, h) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 160;
    grainTile.height = 160;
    const g = grainTile.getContext('2d');
    const data = g.createImageData(160, 160);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 22;
    }
    g.putImageData(data, 0, 0);
  }
  const pattern = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
}

/** Renders the whole cover for the given state at the canvas's own size. */
export function renderCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  // Sky backdrop.
  const sky = ctx.createLinearGradient(0, 0, w, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Faint diagonal light rays across the backdrop.
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  for (let i = -2; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.2 + i * w * 0.22, 0);
    ctx.lineTo(w * 0.3 + i * w * 0.22, 0);
    ctx.lineTo(w * 0.55 + i * w * 0.22, h);
    ctx.lineTo(w * 0.45 + i * w * 0.22, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const panels = layoutPanels(state.layout, w, h);
  const photos = state.photos || [];
  panels.forEach((panel, i) => {
    const slot = (state.panelPhotos && state.panelPhotos[i]) ?? (i % Math.max(1, photos.length));
    // Tilted snapshots overlap, so the hero decoration would peek out oddly
    // from behind the next panel: keep it for the framed layouts only.
    drawPanel(ctx, panel, photos[slot] || null, grade, w, h, i === 0 && state.layout !== 'tilted', i);
  });
  drawTitleBlock(ctx, state, grade, w, h, panels);
  drawBadge(ctx, grade, w, h);
  if (state.grain) grainPattern(ctx, w, h);
  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  // Poster frame: thick white edge, thin dark keyline.
  ctx.lineWidth = Math.max(4, Math.min(w, h) * 0.012);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.002);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeRect(Math.min(w, h) * 0.014, Math.min(w, h) * 0.014, w - Math.min(w, h) * 0.028, h - Math.min(w, h) * 0.028);
  if (opts.selectedPanel != null) {
    const p = panels[opts.selectedPanel];
    if (p) {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot || 0);
      ctx.setLineDash([14, 10]);
      ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
      ctx.strokeStyle = '#ffe66d';
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }
  return panels;
}

/** A fresh default state: three photo slots, hero panel on photo 1. */
export function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    title: 'VICE COAST',
    subtitle: 'a sunset heist in three panels',
    titleSize: 1,
    titlePos: 'bottom',
    outline: true,
    grain: true,
    vignette: true,
    photos: [
      { img: null, zoom: 1, panX: 0, panY: 0 },
      { img: null, zoom: 1, panX: 0, panY: 0 },
      { img: null, zoom: 1, panX: 0, panY: 0 },
    ],
    panelPhotos: [0, 1, 2, 0],
    selectedPanel: 0,
  };
}
