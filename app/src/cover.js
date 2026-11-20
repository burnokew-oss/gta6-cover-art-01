// Marlin Coast Cover Studio — the cover painter.
//
// Everything is drawn on a 2D canvas from photographs: the five bundled cast
// portraits, the red convertible and the aerial coast shot, plus any photo the
// reader drops in. The house style is a light poster finish over real
// photography — a colour grade, a whisper of fine grain everywhere, and a
// halftone dot screen on the title band only — so faces stay photographic
// while the sheet still reads as a printed game cover: slanted multi-panel
// layouts, a gradient MARLIN COAST masthead, slanted name tags sized to each
// panel, a star quote, a circular seal, a barcode and a billing strip inside
// a double frame.

export const CAST = [
  { key: 'dj', label: 'THE NIGHT DJ', file: 'assets/cast-dj.jpg', focusX: 0.5, focusY: 0.3, hue: '#ff2e88' },
  { key: 'driver', label: 'THE GETAWAY DRIVER', file: 'assets/cast-driver.jpg', focusX: 0.5, focusY: 0.3, hue: '#ffb02e' },
  { key: 'queen', label: 'THE BOARDWALK QUEEN', file: 'assets/cast-queen.jpg', focusX: 0.5, focusY: 0.26, hue: '#ffe259' },
  { key: 'pilot', label: 'THE STORM PILOT', file: 'assets/cast-pilot.jpg', focusX: 0.5, focusY: 0.3, hue: '#2ec5ff' },
  { key: 'diver', label: 'THE PEARL DIVER', file: 'assets/cast-diver.jpg', focusX: 0.5, focusY: 0.3, hue: '#2effa8' },
];
export const CAR = { key: 'car', label: 'THE MARLIN GT', file: 'assets/car.jpg', focusX: 0.5, focusY: 0.55, hue: '#ff4b2e' };
export const AERIAL = { key: 'aerial', label: 'MARLIN COAST FROM ABOVE', file: 'assets/aerial.jpg', focusX: 0.5, focusY: 0.5, hue: '#2e9bff' };

export const GRADES = {
  sunset: {
    name: 'Sunset',
    sky: ['#1d1038', '#4a1458', '#93235e'],
    wash: ['rgba(255,110,64,0)', 'rgba(255,64,120,0.34)'],
    glow: 'rgba(255,170,60,0.20)',
    title: ['#fff3b0', '#ffb02e', '#ff2e88'],
    band: '#170b2e',
  },
  neon: {
    name: 'Neon',
    sky: ['#050914', '#0d1b3d', '#123a5e'],
    wash: ['rgba(46,197,255,0)', 'rgba(255,46,136,0.30)'],
    glow: 'rgba(46,197,255,0.20)',
    title: ['#d8fbff', '#2ec5ff', '#ff2e88'],
    band: '#04070f',
  },
  miami: {
    name: 'Miami',
    sky: ['#3d0f2e', '#7a1e4e', '#c23a3a'],
    wash: ['rgba(255,226,89,0)', 'rgba(255,110,64,0.30)'],
    glow: 'rgba(255,226,89,0.22)',
    title: ['#ffffff', '#ffe259', '#ff7518'],
    band: '#26081c',
  },
};

const INK = '#0d0716';
const PAPER = '#fff7ea';

/** A tiny deterministic random source, so the grain and the barcode bars are
 * the same on every render of the same cover. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function fitFont(ctx, text, maxWidth, start, weight, family) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 9) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws `img` filling the rect (x, y, w, h), cover-style, anchored on the
 * focal point (fx, fy in 0..1 of the image) so a face stays in frame, with an
 * extra zoom and a nudge in panel fractions for the reader's own photo. */
function drawPhoto(ctx, img, x, y, w, h, fx, fy, zoom = 1, nx = 0, ny = 0) {
  if (!img) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = x + w / 2 - fx * dw + nx * w;
  let dy = y + h / 2 - fy * dh + ny * h;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.drawImage(img, dx, dy, dw, dh);
}

function gradeWash(ctx, grade, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, grade.wash[0]);
  g.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.12, 10, x + w * 0.5, y + h * 0.12, w * 0.9);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
}

/** One slanted photograph panel: a parallelogram clip, the graded photo, a
 * hard white keyline, and (optionally) its slanted name tag. `slant` leans
 * the top edge to the right by that many base units. */
function panel(ctx, state, meta, img, x, y, w, h, slant, withTag) {
  const grade = GRADES[state.grade];
  const isUser = state.userKey === meta.key && state.images.user;
  const shown = isUser ? state.images.user : img;
  const zoom = isUser ? state.zoom : 1;
  const nx = isUser ? state.nudgeX : 0;
  const ny = isUser ? state.nudgeY : 0;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.clip();
  ctx.save();
  try { ctx.filter = 'saturate(1.22) contrast(1.06) brightness(1.02)'; } catch { /* older canvas */ }
  drawPhoto(ctx, shown, x - slant, y, w + slant * 2, h, meta.focusX, meta.focusY, zoom, nx, ny);
  ctx.restore();
  gradeWash(ctx, grade, x - slant, y, w + slant * 2, h);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.lineWidth = Math.max(3, w * 0.016);
  ctx.strokeStyle = PAPER;
  ctx.stroke();
  ctx.restore();
  if (withTag) nameTag(ctx, meta, x, y, w, h, slant);
}

/** The slanted name tag: a dark parallelogram riding the panel's foot, its
 * lettering shrunk until it fits the panel's own cross-section. */
function nameTag(ctx, meta, x, y, w, h, slant) {
  const th = Math.min(h * 0.13, w * 0.30);
  const ty = y + h - th * 1.35;
  const inset = slant * 0.35;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + inset + th * 0.45, ty);
  ctx.lineTo(x + w - inset, ty);
  ctx.lineTo(x + w - inset - th * 0.45, ty + th);
  ctx.lineTo(x + inset, ty + th);
  ctx.closePath();
  ctx.fillStyle = 'rgba(10,5,20,0.88)';
  ctx.fill();
  ctx.fillStyle = meta.hue;
  ctx.fillRect(x + inset, ty + th - Math.max(3, th * 0.10), w - inset * 2 - th * 0.2, Math.max(3, th * 0.10));
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, meta.label, w - inset * 2 - th * 0.9, th * 0.46, 'italic 900', '"Arial Narrow", Arial, sans-serif');
  ctx.fillText(meta.label, x + w / 2 - th * 0.1, ty + th * 0.46);
  ctx.restore();
}

function halftone(ctx, x, y, w, h, step, radius) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let row = 0, yy = y + step / 2; yy < y + h; row++, yy += step) {
    for (let xx = x + step / 2 + (row % 2 ? step / 2 : 0); xx < x + w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function grain(ctx, w, h) {
  const rnd = seeded(20261120);
  ctx.save();
  for (let i = 0; i < 2600; i++) {
    const a = rnd() * 0.05;
    ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  ctx.restore();
}

function barcode(ctx, x, y, w, h) {
  const rnd = seeded(11010);
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK;
  let cx = x + w * 0.06;
  while (cx < x + w * 0.94) {
    const bw = (0.5 + rnd() * 2.2) * (w / 90);
    if (rnd() > 0.35) ctx.fillRect(cx, y + h * 0.10, bw, h * 0.68);
    cx += bw + (0.6 + rnd() * 1.6) * (w / 90);
  }
  ctx.font = `700 ${h * 0.16}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MC 0110 2026', x + w / 2, y + h * 0.95);
  ctx.restore();
}

function seal(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(13,7,22,0.82)';
  ctx.fill();
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = '#ffe259';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
  ctx.fillStyle = '#ffe259';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.25}px "Arial Narrow", Arial, sans-serif`;
  ctx.fillText('ORIGINAL', cx, cy - r * 0.22);
  ctx.fillText('PHOTOGRAPHY', cx, cy + r * 0.14);
  ctx.font = `700 ${r * 0.20}px Arial, sans-serif`;
  ctx.fillText('· EST. 2026 ·', cx, cy + r * 0.48);
  ctx.restore();
}

function chip(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(-0.10);
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = size * 0.05;
  const s = size / 2;
  ctx.beginPath();
  ctx.roundRect(-s, -s, size, size, size * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size * 0.30}px "Arial Narrow", Arial, sans-serif`;
  ctx.fillText('NO. 10', 0, -size * 0.10);
  ctx.font = `700 ${size * 0.17}px Arial, sans-serif`;
  ctx.fillText('COVER', 0, size * 0.24);
  ctx.restore();
}

/** The masthead: halftone title band, the gradient MARLIN COAST lettering,
 * the script line under it, the seal and the issue chip. */
function masthead(ctx, state, W, bandH) {
  const grade = GRADES[state.grade];
  const g = ctx.createLinearGradient(0, 0, 0, bandH);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(0.55, grade.sky[1]);
  g.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, bandH);
  halftone(ctx, 0, 0, W, bandH, W * 0.021, W * 0.0035);
  const sun = ctx.createRadialGradient(W * 0.5, bandH * 1.05, 10, W * 0.5, bandH * 1.05, W * 0.55);
  sun.addColorStop(0, grade.glow);
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, bandH);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = 'MARLIN COAST';
  const size = fitFont(ctx, title, W * 0.70, bandH * 0.48, 'italic 900', '"Arial Narrow", Arial, sans-serif');
  const tg = ctx.createLinearGradient(0, bandH * 0.08, 0, bandH * 0.72);
  tg.addColorStop(0, grade.title[0]);
  tg.addColorStop(0.55, grade.title[1]);
  tg.addColorStop(1, grade.title[2]);
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.strokeText(title, W / 2, bandH * 0.40);
  ctx.fillStyle = tg;
  ctx.fillText(title, W / 2, bandH * 0.40);
  ctx.font = `italic 600 ${bandH * 0.155}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = PAPER;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 6;
  ctx.fillText('where the tide keeps secrets', W / 2, bandH * 0.815);
  ctx.restore();

  chip(ctx, W * 0.020, bandH * 0.18, bandH * 0.56);
  seal(ctx, W * 0.938, bandH * 0.47, bandH * 0.26);
}

/** The reader's caption as a slanted banner across the sheet. */
function captionBanner(ctx, state, W, y) {
  const text = (state.caption || '').trim().toUpperCase();
  if (!text) return;
  const h = W * 0.075;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate(-0.018);
  ctx.beginPath();
  ctx.moveTo(-W * 0.40 + h * 0.4, -h / 2);
  ctx.lineTo(W * 0.40, -h / 2);
  ctx.lineTo(W * 0.40 - h * 0.4, h / 2);
  ctx.lineTo(-W * 0.40, h / 2);
  ctx.closePath();
  ctx.fillStyle = '#ffe259';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, text, W * 0.74, h * 0.52, 'italic 900', '"Arial Narrow", Arial, sans-serif');
  ctx.fillText(text, 0, h * 0.03);
  ctx.restore();
}

/** The foot of the sheet: tagline, the Gazette star quote, the billing strip
 * and the barcode, over a dark band. */
function footer(ctx, state, W, H, top) {
  const h = H - top;
  ctx.fillStyle = GRADES[state.grade].band;
  ctx.fillRect(0, top, W, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PAPER;
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'FIVE FACES · ONE COASTLINE · NO WAY BACK', W * 0.62, h * 0.20, '900', '"Arial Narrow", Arial, sans-serif');
  ctx.fillText('FIVE FACES · ONE COASTLINE · NO WAY BACK', W * 0.44, top + h * 0.30);
  ctx.font = `italic 600 ${h * 0.145}px Georgia, serif`;
  ctx.fillStyle = '#ffd9ec';
  const quote = '★★★★★  “A POSTCARD WITH TEETH” — The Harbor Gazette';
  fitFont(ctx, quote, W * 0.62, h * 0.145, 'italic 600', 'Georgia, serif');
  ctx.fillText(quote, W * 0.44, top + h * 0.60);
  ctx.font = `500 ${h * 0.085}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,247,234,0.62)';
  const billing = 'MARLIN COAST COVER STUDIO · A FICTIONAL COASTLINE · FIVE FACES ONE TIDE · PRINTED IN NEON · NO WAY BACK';
  fitFont(ctx, billing, W * 0.9, h * 0.085, '500', 'Arial, sans-serif');
  ctx.fillText(billing, W / 2, top + h * 0.82);
  ctx.restore();
  barcode(ctx, W * 0.885, top + h * 0.14, W * 0.095, h * 0.62);
}

function frame(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = Math.max(4, W * 0.007);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, W - ctx.lineWidth * 2, H - ctx.lineWidth * 2);
  ctx.strokeStyle = 'rgba(13,7,22,0.9)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  const inset = W * 0.016;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.restore();
}

/** Cast Slant, the flagship: five slanted cast panels over an aerial strip
 * and the car panel. */
function layoutCast(ctx, state, W, H) {
  const bandH = H * 0.165;
  masthead(ctx, state, W, bandH);
  const top = bandH + H * 0.012;
  const midH = H * 0.475;
  const slant = W * 0.045;
  const pw = W * 0.188;
  const gap = W * 0.006;
  const total = pw * 5 + gap * 4;
  let x = (W - total) / 2;
  CAST.forEach((meta, i) => {
    panel(ctx, state, meta, state.images[meta.key], x, top + (i % 2 ? H * 0.008 : 0), pw, midH - (i % 2 ? H * 0.008 : 0), slant, true);
    x += pw + gap;
  });
  captionBanner(ctx, state, W, top + midH + H * 0.028);
  const stripY = top + midH + H * 0.062;
  const stripH = H * 0.155;
  panel(ctx, state, AERIAL, state.images.aerial, W * 0.018, stripY, W * 0.565, stripH, slant * 0.7, true);
  panel(ctx, state, CAR, state.images.car, W * 0.60, stripY, W * 0.382, stripH, slant * 0.7, true);
  footer(ctx, state, W, H, H * 0.925);
}

/** Hero Car: the convertible takes the wide panel, three faces under it. */
function layoutHero(ctx, state, W, H) {
  const bandH = H * 0.165;
  masthead(ctx, state, W, bandH);
  const top = bandH + H * 0.012;
  const slant = W * 0.04;
  panel(ctx, state, CAR, state.images.car, W * 0.018, top, W * 0.964, H * 0.40, slant, true);
  captionBanner(ctx, state, W, top + H * 0.435);
  const rowY = top + H * 0.478;
  const rowH = H * 0.225;
  const picks = [CAST[0], CAST[2], CAST[3]].map((m) => ({ ...m, focusY: 0.40 }));
  const pw = W * 0.318;
  picks.forEach((meta, i) => {
    panel(ctx, state, meta, state.images[meta.key], W * 0.018 + i * (pw + W * 0.005), rowY, pw, rowH, slant, true);
  });
  footer(ctx, state, W, H, H * 0.925);
}

/** Portrait Cast: two tall portraits side by side over the aerial strip. */
function layoutPortrait(ctx, state, W, H) {
  const bandH = H * 0.165;
  masthead(ctx, state, W, bandH);
  const top = bandH + H * 0.012;
  const slant = W * 0.045;
  const bigH = H * 0.545;
  panel(ctx, state, CAST[1], state.images[CAST[1].key], W * 0.018, top, W * 0.472, bigH, slant, true);
  panel(ctx, state, CAST[2], state.images[CAST[2].key], W * 0.51, top, W * 0.472, bigH, slant, true);
  captionBanner(ctx, state, W, top + bigH + H * 0.030);
  const stripY = top + bigH + H * 0.062;
  panel(ctx, state, AERIAL, state.images.aerial, W * 0.018, stripY, W * 0.964, H * 0.115, slant * 0.7, true);
  footer(ctx, state, W, H, H * 0.925);
}

const LAYOUTS = { cast: layoutCast, hero: layoutHero, portrait: layoutPortrait };

/** Paints the whole cover onto `canvas` at the canvas's own pixel size.
 * `state` is { layout, grade, caption, images, userKey, zoom, nudgeX, nudgeY },
 * where images maps each panel key (and `user`) to an Image or null. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = GRADES[state.grade].band;
  ctx.fillRect(0, 0, W, H);
  (LAYOUTS[state.layout] || layoutCast)(ctx, state, W, H);
  grain(ctx, W, H);
  frame(ctx, W, H);
}
