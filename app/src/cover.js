// Marlin Coast Cover Studio — the cover engine.
//
// Everything is drawn on a 2D canvas from real photographs. The bundled
// photographs stay photographs: the only treatments laid over them are a
// colour grade (a CSS filter while the photo is drawn, plus one soft wash),
// a whisper of film grain, and a halftone dot pattern that is clipped to the
// title band and other flat dressing — never to skin or faces. Portrait
// panels are cropped around a face-aware focal point near the top of the
// source frame, so heads are never cut off.

export const CAST = [
  { slot: 'dj', file: 'assets/cast-dj.jpg', tag: 'THE NIGHT DJ' },
  { slot: 'driver', file: 'assets/cast-driver.jpg', tag: 'THE GETAWAY DRIVER' },
  { slot: 'queen', file: 'assets/cast-queen.jpg', tag: 'THE BOARDWALK QUEEN' },
  { slot: 'pilot', file: 'assets/cast-pilot.jpg', tag: 'THE STORM PILOT' },
  { slot: 'diver', file: 'assets/cast-diver.jpg', tag: 'THE PEARL DIVER' },
];

export const LAYOUTS = {
  slant: { label: 'Cast Slant', w: 1920, h: 1080 },
  hero: { label: 'Hero Car', w: 1080, h: 1350 },
  portrait: { label: 'Portrait Cast', w: 1080, h: 1080 },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.16) contrast(1.05) sepia(0.16) hue-rotate(-4deg)',
    washTop: 'rgba(255,166,66,0.10)',
    washBottom: 'rgba(0,90,100,0.20)',
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.38) contrast(1.14) brightness(0.98)',
    washTop: 'rgba(255,45,150,0.10)',
    washBottom: 'rgba(0,30,70,0.30)',
  },
  miami: {
    label: 'Miami',
    filter: 'saturate(1.06) contrast(0.94) brightness(1.09)',
    washTop: 'rgba(255,235,200,0.10)',
    washBottom: 'rgba(120,200,220,0.10)',
  },
};

const PLUM = '#22102e';
// Per-face focal points: the fraction of the crop overflow taken from the top
// of each source portrait. The diver's head sits highest in his frame.
const FOCAL = { dj: 0.3, driver: 0.3, queen: 0.28, pilot: 0.26, diver: 0.08 };
const PINK = '#ff4f9a';
const GOLD = '#f5b93f';

// --- small deterministic helpers (fixed seed: output never depends on time) ---

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainPattern = null;
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 140; tile.height = 140;
  const t = tile.getContext('2d');
  const img = t.createImageData(140, 140);
  const rnd = mulberry(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

// --- photo drawing ---

// Draws `img` filling the rect (cover fit). focalY is the fraction of the
// overflow that is cropped from the top: a small fraction keeps faces — which
// sit in the upper part of the source frame — whole inside the panel.
function drawPhoto(ctx, img, x, y, w, h, focalY) {
  if (!img) { ctx.fillStyle = '#3a2148'; ctx.fillRect(x, y, w, h); return; }
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2;
  const dy = y - (dh - h) * focalY;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// A slanted comic panel: parallelogram path, photo clipped inside, white key
// line with a dark outer edge, and (for cast panels) a name tag.
function panel(ctx, img, x, y, w, h, slant, focalY, tag) {
  const savedFilter = ctx.filter;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.clip();
  drawPhoto(ctx, img, x - slant, y, w + slant * 2, h, focalY);
  ctx.restore();
  ctx.filter = 'none';
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.lineWidth = Math.max(8, h * 0.03);
  ctx.strokeStyle = 'rgba(20,6,28,0.9)';
  ctx.stroke();
  ctx.lineWidth = Math.max(4, h * 0.015);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  if (tag) nameTag(ctx, x, y, w, h, slant, tag);
  ctx.filter = savedFilter;
}

// Slanted black name bar at the panel's lower left, pink tick, white
// condensed capitals.
function nameTag(ctx, x, y, w, h, slant, tag) {
  const scale = h / 380;
  const th = 34 * scale + 10;
  const ty = y + h - th - 12 * scale;
  const tx = x + 10 * scale;
  const tw = Math.min(w * 0.94, (tag.length * 15.5 + 44) * scale);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tx + slant * 0.45, ty);
  ctx.lineTo(tx + tw, ty);
  ctx.lineTo(tx + tw - slant * 0.45, ty + th);
  ctx.lineTo(tx, ty + th);
  ctx.closePath();
  ctx.fillStyle = 'rgba(12,8,16,0.92)';
  ctx.fill();
  ctx.fillStyle = PINK;
  ctx.fillRect(tx + 7 * scale, ty + th * 0.22, 6 * scale, th * 0.56);
  ctx.font = `italic 800 ${Math.round(th * 0.52)}px "Arial Narrow", Impact, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(tag, tx + 22 * scale, ty + th * 0.54, tw - 28 * scale);
  ctx.restore();
}

// --- dressing ---

function star(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawTitle(ctx, cx, cy, maxW, script) {
  ctx.filter = 'none';
  const word = 'MARLIN COAST';
  let size = maxW * 0.15;
  ctx.save();
  const setFont = () => { ctx.font = `italic 900 ${size}px "Arial Narrow", Impact, "Franklin Gothic Medium", sans-serif`; };
  setFont();
  while (ctx.measureText(word).width > maxW * 0.94 && size > 20) { size -= 4; setFont(); }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55);
  grad.addColorStop(0, '#ffb03a');
  grad.addColorStop(0.52, '#ff4f7b');
  grad.addColorStop(1, '#8b3fd9');
  ctx.shadowColor = 'rgba(10,2,20,0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.06;
  ctx.lineWidth = size * 0.11;
  ctx.strokeStyle = '#ffffff';
  ctx.lineJoin = 'round';
  ctx.strokeText(word, cx, cy);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(word, cx, cy);
  // flowing script line under the title
  const s = (script || '').trim() || 'where the tide keeps secrets';
  let ss = size * 0.34;
  ctx.font = `italic 700 ${ss}px "Brush Script MT", "Segoe Script", cursive`;
  while (ctx.measureText(s).width > maxW * 0.8 && ss > 10) { ss -= 2; ctx.font = `italic 700 ${ss}px "Brush Script MT", "Segoe Script", cursive`; }
  ctx.shadowColor = 'rgba(10,2,20,0.6)';
  ctx.shadowBlur = ss * 0.3;
  ctx.fillStyle = '#ff77b3';
  ctx.fillText(s, cx, cy + size * 0.66);
  ctx.restore();
  return size;
}

// Halftone dots, used only on flat dressing areas (the title band).
function halftoneBand(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  const step = 13;
  for (let row = 0, yy = y + 6; yy < y + h; row++, yy += step) {
    for (let xx = x + 6 + (row % 2) * (step / 2); xx < x + w; xx += step) {
      ctx.beginPath(); ctx.arc(xx, yy, 2.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function dressing(ctx, W, H) {
  const u = H / 1080; // dressing scale unit
  ctx.save();
  // press quote, top left
  const qx = W * 0.035, qy = H * 0.028;
  ctx.shadowColor = 'rgba(8,2,14,0.75)'; ctx.shadowBlur = 8 * u;
  for (let i = 0; i < 5; i++) star(ctx, qx + 13 * u + i * 30 * u, qy + 13 * u, 12 * u, GOLD);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = `italic 700 ${Math.round(27 * u)}px Georgia, serif`;
  ctx.fillText('“A POSTCARD WITH TEETH”', qx, qy + 34 * u);
  ctx.font = `600 ${Math.round(16 * u)}px "Arial Narrow", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('— THE HARBOR GAZETTE', qx + 2 * u, qy + 70 * u);
  ctx.shadowBlur = 0;
  // issue chip, top right
  const cw = 118 * u, ch = 44 * u, cx0 = W - W * 0.035 - cw, cy0 = H * 0.028;
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.roundRect(cx0, cy0, cw, ch, 8 * u); ctx.fill();
  ctx.fillStyle = '#24102e';
  ctx.font = `900 ${Math.round(26 * u)}px "Arial Narrow", Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('NO. 10', cx0 + cw / 2, cy0 + ch / 2 + 1);
  ctx.restore();
}

function seal(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(28,10,40,0.88)'; ctx.fill();
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = GOLD; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.03; ctx.stroke();
  const word = 'ORIGINAL PHOTOGRAPHY ';
  ctx.fillStyle = '#ffd98a';
  ctx.font = `700 ${Math.round(r * 0.21)}px "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const total = word.length;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(word[i], 0, 0);
    ctx.restore();
  }
  star(ctx, cx - r * 0.34, cy + r * 0.08, r * 0.13, GOLD);
  star(ctx, cx, cy + r * 0.08, r * 0.16, GOLD);
  star(ctx, cx + r * 0.34, cy + r * 0.08, r * 0.13, GOLD);
  ctx.restore();
}

function barcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  const bars = [3, 1, 2, 1, 1, 3, 1, 2, 4, 1, 1, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 1, 4, 1, 2, 1, 1, 3, 1, 2, 1, 1];
  const unit = w / 64;
  let bx = x + unit * 2;
  ctx.fillStyle = '#14101a';
  for (let i = 0; i < bars.length; i++) {
    if (i % 2 === 0) ctx.fillRect(bx, y + h * 0.08, bars[i] * unit * 0.8, h * 0.62);
    bx += bars[i] * unit;
  }
  ctx.font = `600 ${Math.round(h * 0.2)}px "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('8 501234 100107', x + w / 2, y + h * 0.85);
  ctx.restore();
}

function billing(ctx, W, H) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(H * 0.021)}px "Arial Narrow", Impact, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('FIVE FACES · ONE COASTLINE · NO WAY BACK', W / 2, H * 0.958);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `600 ${Math.round(H * 0.0115)}px "Arial Narrow", sans-serif`;
  ctx.fillText('MARLIN COAST COVER STUDIO · STARRING YOU · LETTERING AND SEAL DRAWN IN THE STUDIO', W / 2, H * 0.98);
  ctx.restore();
}

function frameAndFinish(ctx, W, H, grade) {
  // grade wash over the whole cover
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  // fine grain, kept very light so faces stay photographic
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // double keyline frame
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, H * 0.003);
  ctx.strokeRect(H * 0.012, H * 0.012, W - H * 0.024, H * 0.976);
  ctx.strokeStyle = 'rgba(245,185,63,0.8)';
  ctx.lineWidth = Math.max(1, H * 0.0016);
  ctx.strokeRect(H * 0.02, H * 0.02, W - H * 0.04, H * 0.96);
}

// --- layouts ---

function layoutSlant(ctx, W, H, imgs, grade, script) {
  const m = W * 0.022;
  const gap = W * 0.012;
  const slant = W * 0.028;
  // top row: three cast portraits
  const topY = H * 0.045, topH = H * 0.375;
  const tw = (W - m * 2 - gap * 2) / 3;
  const topCast = [imgs.dj, imgs.driver, imgs.queen];
  const topTags = [CAST[0].tag, CAST[1].tag, CAST[2].tag];
  for (let i = 0; i < 3; i++) {
    panel(ctx, topCast[i], m + i * (tw + gap), topY, tw, topH, slant, [FOCAL.dj, FOCAL.driver, FOCAL.queen][i], topTags[i]);
  }
  // aerial strip behind the title
  const stripY = H * 0.435, stripH = H * 0.17;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, stripY, W, stripH); ctx.clip();
  ctx.filter = grade.filter;
  drawPhoto(ctx, imgs.aerial, 0, stripY, W, stripH, 0.5);
  ctx.filter = 'none';
  ctx.fillStyle = 'rgba(30,8,44,0.34)';
  ctx.fillRect(0, stripY, W, stripH);
  ctx.restore();
  halftoneBand(ctx, 0, stripY, W, stripH);
  // bottom row: wide car panel + two cast portraits
  const botY = H * 0.615, botH = H * 0.315;
  const carW = W * 0.52;
  panel(ctx, imgs.car, m, botY, carW, botH, slant, 0.5, null);
  const pw = (W - m * 2 - carW - gap * 2) / 2;
  panel(ctx, imgs.pilot, m + carW + gap, botY, pw, botH, slant, FOCAL.pilot, CAST[3].tag);
  panel(ctx, imgs.diver, m + carW + gap * 2 + pw, botY, pw, botH, slant, FOCAL.diver, CAST[4].tag);
  // title over the aerial strip
  drawTitle(ctx, W / 2, H * 0.515, W * 0.86, script);
  seal(ctx, W * 0.93, H * 0.55, H * 0.068);
  barcode(ctx, W * 0.895, H * 0.845, W * 0.082, H * 0.075);
}

function layoutHero(ctx, W, H, imgs, grade, script) {
  const m = W * 0.03;
  const gap = W * 0.016;
  const slant = W * 0.03;
  // two cast portraits at the top
  const topY = H * 0.035, topH = H * 0.26;
  const tw = (W - m * 2 - gap) / 2;
  panel(ctx, imgs.driver, m, topY, tw, topH, slant, FOCAL.driver, CAST[1].tag);
  panel(ctx, imgs.dj, m + tw + gap, topY, tw, topH, slant, FOCAL.dj, CAST[0].tag);
  // the car, large across the middle
  const carY = H * 0.335, carH = H * 0.27;
  panel(ctx, imgs.car, m, carY, W - m * 2, carH, slant, 0.5, null);
  // aerial ribbon under the car
  const ribY = H * 0.615, ribH = H * 0.055;
  ctx.save();
  ctx.beginPath(); ctx.rect(m, ribY, W - m * 2, ribH); ctx.clip();
  ctx.filter = grade.filter;
  drawPhoto(ctx, imgs.aerial, m, ribY, W - m * 2, ribH, 0.5);
  ctx.filter = 'none';
  ctx.restore();
  // two cast portraits at the bottom
  const botY = H * 0.685, botH = H * 0.245;
  panel(ctx, imgs.queen, m, botY, tw, botH, slant, FOCAL.queen, CAST[2].tag);
  panel(ctx, imgs.diver, m + tw + gap, botY, tw, botH, slant, FOCAL.diver, CAST[4].tag);
  // title over the top of the car art
  drawTitle(ctx, W / 2, H * 0.35, W * 0.9, script);
  seal(ctx, W * 0.885, H * 0.47, H * 0.045);
  barcode(ctx, W * 0.845, H * 0.855, W * 0.125, H * 0.055);
}

function layoutPortrait(ctx, W, H, imgs, grade, script) {
  const m = W * 0.025;
  const gap = W * 0.014;
  const slant = W * 0.032;
  // top row: three cast portraits
  const topY = H * 0.045, topH = H * 0.36;
  const tw = (W - m * 2 - gap * 2) / 3;
  panel(ctx, imgs.queen, m, topY, tw, topH, slant, FOCAL.queen, CAST[2].tag);
  panel(ctx, imgs.dj, m + tw + gap, topY, tw, topH, slant, FOCAL.dj, CAST[0].tag);
  panel(ctx, imgs.pilot, m + (tw + gap) * 2, topY, tw, topH, slant, FOCAL.pilot, CAST[3].tag);
  // aerial strip behind the title
  const stripY = H * 0.42, stripH = H * 0.16;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, stripY, W, stripH); ctx.clip();
  ctx.filter = grade.filter;
  drawPhoto(ctx, imgs.aerial, 0, stripY, W, stripH, 0.5);
  ctx.filter = 'none';
  ctx.fillStyle = 'rgba(30,8,44,0.34)';
  ctx.fillRect(0, stripY, W, stripH);
  ctx.restore();
  halftoneBand(ctx, 0, stripY, W, stripH);
  // bottom row: two cast portraits + the car
  const botY = H * 0.595, botH = H * 0.335;
  const pw = W * 0.24;
  panel(ctx, imgs.driver, m, botY, pw, botH, slant, FOCAL.driver, CAST[1].tag);
  panel(ctx, imgs.diver, m + pw + gap, botY, pw, botH, slant, FOCAL.diver, CAST[4].tag);
  panel(ctx, imgs.car, m + pw * 2 + gap * 2, botY, W - m * 2 - pw * 2 - gap * 2, botH, slant, 0.5, null);
  drawTitle(ctx, W / 2, H * 0.5, W * 0.92, script);
  seal(ctx, W * 0.9, H * 0.515, H * 0.055);
  barcode(ctx, W * 0.865, H * 0.845, W * 0.11, H * 0.07);
}

// --- public entry ---

/** Draws the full cover. `state.images` maps slot -> image (dj, driver, queen,
 * pilot, diver, car, aerial). Without `size`, the layout's native frame is
 * used; an explicit {w, h} re-frames the same composition for export. */
export function drawCover(canvas, state, size) {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.slant;
  canvas.width = size ? size.w : layout.w;
  canvas.height = size ? size.h : layout.h;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.fillStyle = PLUM;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.filter = grade.filter;
  if (state.layout === 'hero') layoutHero(ctx, W, H, state.images, grade, state.caption);
  else if (state.layout === 'portrait') layoutPortrait(ctx, W, H, state.images, grade, state.caption);
  else layoutSlant(ctx, W, H, state.images, grade, state.caption);
  ctx.restore();
  ctx.filter = 'none';
  dressing(ctx, W, H);
  billing(ctx, W, H);
  frameAndFinish(ctx, W, H, grade);
}
