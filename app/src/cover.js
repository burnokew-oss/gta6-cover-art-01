// Marlin Coast Cover Studio — cover renderer (round 12).
// Draws the whole poster on a 2D canvas from bundled photographs: five
// photographic cast panels, an aerial strip, a car panel and a dressed
// title band. No network, no fonts fetched anywhere: system type only.

export const CAST = [
  { key: 'dj', label: 'THE NIGHT DJ', file: 'assets/cast-dj.jpg', fx: 0.5, fy: 0.34 },
  { key: 'driver', label: 'THE GETAWAY DRIVER', file: 'assets/cast-driver.jpg', fx: 0.5, fy: 0.36 },
  { key: 'queen', label: 'THE BOARDWALK QUEEN', file: 'assets/cast-queen.jpg', fx: 0.5, fy: 0.3 },
  { key: 'pilot', label: 'THE STORM PILOT', file: 'assets/cast-pilot.jpg', fx: 0.5, fy: 0.34 },
  { key: 'diver', label: 'THE PEARL DIVER', file: 'assets/cast-diver.jpg', fx: 0.5, fy: 0.36 },
];

export const PHOTO_FILES = {
  dj: 'assets/cast-dj.jpg',
  driver: 'assets/cast-driver.jpg',
  queen: 'assets/cast-queen.jpg',
  pilot: 'assets/cast-pilot.jpg',
  diver: 'assets/cast-diver.jpg',
  car: 'assets/car.jpg',
  aerial: 'assets/aerial.jpg',
};

export const LAYOUTS = [
  { id: 'slant', name: 'Cast Slant', blurb: 'Five slanted cast panels over an aerial strip and the red convertible.' },
  { id: 'hero', name: 'Hero Car', blurb: 'The convertible takes the left half; the cast stacks down the right.' },
  { id: 'portrait', name: 'Portrait Cast', blurb: 'One big portrait beside a four-panel cast grid.' },
];

export const GRADES = [
  { id: 'sunset', name: 'Sunset', top: '#ff9a3d', bottom: '#ff2e63', tint: '#ff7a18' },
  { id: 'neon', name: 'Neon', top: '#ff2fb3', bottom: '#22d3ee', tint: '#7b2fff' },
  { id: 'miami', name: 'Miami', top: '#2dd4bf', bottom: '#f472b6', tint: '#fda4af' },
];

export const SIZES = {
  square: { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { id: 'wide', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

export function defaultState() {
  const crops = {};
  for (const c of CAST) crops[c.key] = { zoom: 1, dx: 0, dy: 0 };
  crops.car = { zoom: 1, dx: 0, dy: 0 };
  crops.aerial = { zoom: 1, dx: 0, dy: 0 };
  return {
    layout: 'slant',
    grade: 'sunset',
    size: 'square',
    title: 'MARLIN COAST',
    script: 'where the tide keeps secrets',
    quote: 'A POSTCARD WITH TEETH',
    quoteBy: 'The Harbor Gazette',
    crops,
  };
}

export function loadPhotos(base = '') {
  const out = {};
  const jobs = Object.entries(PHOTO_FILES).map(([key, file]) => new Promise((done) => {
    const img = new Image();
    img.onload = () => { out[key] = img; done(); };
    img.onerror = () => done();
    img.src = base + file;
  }));
  return Promise.all(jobs).then(() => out);
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Cover-fit an image into a rectangle, keeping the face point centred.
// zoom magnifies; dx/dy nudge the framing as fractions of the rect.
export function paintPhoto(ctx, img, r, fx, fy, crop) {
  const zoom = crop?.zoom ?? 1;
  const dx = crop?.dx ?? 0;
  const dy = crop?.dy ?? 0;
  const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  let ox = r.x + r.w / 2 - fx * dw + dx * r.w;
  let oy = r.y + r.h / 2 - fy * dh + dy * r.h;
  ox = clamp(ox, r.x + r.w - dw, r.x);
  oy = clamp(oy, r.y + r.h - dh, r.y);
  ctx.drawImage(img, ox, oy, dw, dh);
}

function slantPath(ctx, r, lean) {
  ctx.beginPath();
  ctx.moveTo(r.x + lean, r.y);
  ctx.lineTo(r.x + r.w + lean, r.y);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
}

function rectPath(ctx, r) {
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
}

function panel(ctx, img, r, fx, fy, crop, lean, border) {
  ctx.save();
  if (lean) slantPath(ctx, r, lean); else rectPath(ctx, r);
  ctx.clip();
  ctx.fillStyle = '#10202e';
  ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  if (img) paintPhoto(ctx, img, { x: r.x, y: r.y, w: r.w, h: r.h }, fx, fy, crop);
  // A faint warm wash inside the photo keeps the panels in one world.
  const wash = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  wash.addColorStop(0, 'rgba(255,150,60,0.10)');
  wash.addColorStop(1, 'rgba(20,40,90,0.16)');
  ctx.fillStyle = wash;
  ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  ctx.restore();
  ctx.save();
  if (lean) slantPath(ctx, r, lean); else rectPath(ctx, r);
  ctx.lineWidth = border;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.stroke();
  ctx.restore();
}

// A slanted name tag pinned to the foot of a cast panel, sized to the
// panel itself so long names never spill past its edges.
function nameTag(ctx, text, r) {
  let px = Math.max(11, Math.round(Math.min(r.w * 0.075, r.h * 0.2)));
  ctx.font = `800 ${px}px "Arial Black", Arial, sans-serif`;
  while (px > 9 && ctx.measureText(text).width > r.w - 14) {
    px -= 1;
    ctx.font = `800 ${px}px "Arial Black", Arial, sans-serif`;
  }
  ctx.save();
  ctx.translate(r.x + 8, r.y + r.h - 10);
  ctx.rotate(-0.07);
  const tw = ctx.measureText(text).width;
  const pad = Math.round(px * 0.55);
  const th = px + Math.round(px * 0.7);
  ctx.fillStyle = 'rgba(8,18,32,0.88)';
  ctx.beginPath();
  ctx.roundRect(-pad, -th + 4, tw + pad * 2, th, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -th / 2 + 5);
  ctx.restore();
}

function fitFont(ctx, text, maxW, px, family, weight) {
  let size = px;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function arcText(ctx, text, cx, cy, radius, a0, a1) {
  const chars = [...text];
  const step = (a1 - a0) / Math.max(1, chars.length - 1);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, i) => {
    const a = a0 + step * i;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function barcode(ctx, x, y, w, h, seed) {
  const roll = rng(seed);
  let cx = x;
  ctx.fillStyle = '#101418';
  while (cx < x + w - 3) {
    const bw = 1 + Math.floor(roll() * 4);
    if (roll() > 0.42) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1 + Math.floor(roll() * 3);
  }
}

// Panel geometry for each layout, all in fractions of the canvas.
function geometry(layout, W, H) {
  const m = Math.round(W * 0.033);
  const g = Math.max(6, Math.round(W * 0.011));
  const billH = Math.max(18, Math.round(H * 0.02));
  const innerW = W - m * 2;
  if (layout === 'hero') {
    const aerialH = Math.round(H * 0.11);
    const midY = m + aerialH + g;
    const midH = Math.round(H * 0.5);
    const titleY = midY + midH + g;
    const carW = Math.round(innerW * 0.58);
    const colX = m + carW + g;
    const colW = innerW - carW - g;
    const ph = (midH - g * 4) / 5;
    return {
      m, g, billH,
      aerial: { x: m, y: m, w: innerW, h: aerialH, lean: 0 },
      car: { x: m, y: midY, w: carW, h: midH, lean: 0 },
      cast: CAST.map((c, i) => ({ key: c.key, x: colX, y: midY + i * (ph + g), w: colW, h: ph, lean: 0 })),
      title: { x: m, y: titleY, w: innerW, h: H - titleY - m - billH - g },
      billing: { x: m, y: H - m - billH, w: innerW, h: billH },
    };
  }
  if (layout === 'portrait') {
    const topH = Math.round(H * 0.52);
    const bigW = Math.round(innerW * 0.46);
    const gridX = m + bigW + g;
    const gridW = innerW - bigW - g;
    const cellW = (gridW - g) / 2;
    const cellH = (topH - g) / 2;
    const rest = CAST.slice(1);
    const aerialY = m + topH + g;
    const aerialH = Math.round(H * 0.09);
    const botY = aerialY + aerialH + g;
    const botH = H - botY - m - billH - g;
    const carW = Math.round(innerW * 0.42);
    return {
      m, g, billH,
      aerial: { x: m, y: aerialY, w: innerW, h: aerialH, lean: 0 },
      car: { x: m, y: botY, w: carW, h: botH, lean: 0 },
      cast: [
        { key: 'queen', x: m, y: m, w: bigW, h: topH, lean: 0 },
        ...rest.map((c, i) => ({
          key: c.key,
          x: gridX + (i % 2) * (cellW + g),
          y: m + Math.floor(i / 2) * (cellH + g),
          w: cellW, h: cellH, lean: 0,
        })),
      ],
      title: { x: m + carW + g, y: botY, w: innerW - carW - g, h: botH },
      billing: { x: m, y: H - m - billH, w: innerW, h: billH },
    };
  }
  // slant — the flagship
  const castH = Math.round(H * 0.5);
  const castY = m + 6;
  const pw = (innerW - g * 4) / 5;
  const aerialY = castY + castH + g;
  const aerialH = Math.round(H * 0.1);
  const botY = aerialY + aerialH + g;
  const botH = H - botY - m - billH - g;
  const carW = Math.round(innerW * 0.52);
  return {
    m, g, billH,
    aerial: { x: m, y: aerialY, w: innerW, h: aerialH, lean: -Math.round(innerW * 0.012) },
    car: { x: m, y: botY, w: carW, h: botH, lean: 0 },
    cast: CAST.map((c, i) => ({
      key: c.key, x: m + i * (pw + g), y: castY, w: pw, h: castH,
      lean: Math.round(pw * 0.13),
    })),
    title: { x: m + carW + g, y: botY, w: innerW - carW - g, h: botH },
    billing: { x: m, y: H - m - billH, w: innerW, h: billH },
  };
}

function gradeWash(ctx, grade, W, H) {
  const wash = ctx.createLinearGradient(0, 0, W * 0.35, H);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Vignette: darker corners, brighter centre.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,8,24,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function grain(ctx, W, H) {
  const roll = rng(20261121);
  ctx.save();
  for (let i = 0; i < Math.floor((W * H) / 260); i++) {
    const v = roll();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(Math.floor(roll() * W), Math.floor(roll() * H), 1.4, 1.4);
  }
  ctx.restore();
}

// Halftone dots live only on the title band — the photos stay photographic.
function titleHalftone(ctx, r) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  for (let y = r.y + 4; y < r.y + r.h; y += 9) {
    for (let x = r.x + 4; x < r.x + r.w; x += 9) {
      const rad = 0.6 + 1.3 * Math.abs(Math.sin(x * 0.021 + y * 0.013));
      ctx.fillStyle = 'rgba(20,10,30,0.10)';
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function dressTitle(ctx, state, t) {
  const { x, y, w, h } = t;
  const pad = Math.max(10, Math.round(w * 0.04));
  // Band ground: dusk navy to magenta, so the title gradient pops.
  const ground = ctx.createLinearGradient(x, y, x + w, y + h);
  ground.addColorStop(0, '#1b1440');
  ground.addColorStop(0.55, '#3d1150');
  ground.addColorStop(1, '#120e2a');
  ctx.fillStyle = ground;
  ctx.fillRect(x, y, w, h);
  titleHalftone(ctx, t);

  const ink = ctx.createLinearGradient(x, y, x + w, y + h * 0.7);
  ink.addColorStop(0, '#ffd319');
  ink.addColorStop(0.5, '#ff2975');
  ink.addColorStop(1, '#ff7a18');
  const words = state.title.split(/\s+/);
  // Size the lettering from the band's HEIGHT first (wide bands get tall
  // text otherwise), with the width only as a cap — the whole dressing
  // (title, script, quote, seal, barcode) must fit inside the band.
  const titlePx = Math.max(20, Math.round(Math.min(w * 0.16, h * 0.17)));
  ctx.textBaseline = 'alphabetic';
  let ty = y + pad + titlePx * 0.95;
  for (const word of words) {
    const size = fitFont(ctx, word, w - pad * 2, titlePx, '"Arial Black", Arial, sans-serif', '900');
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeStyle = 'rgba(20,8,28,0.85)';
    ctx.strokeText(word, x + pad, ty);
    ctx.fillStyle = ink;
    ctx.fillText(word, x + pad, ty);
    ty += size * 1.04;
  }

  // Script line under the title.
  const scriptPx = Math.max(11, Math.round(Math.min(w * 0.055, h * 0.055)));
  ctx.font = `italic 600 ${scriptPx}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(state.script, x + pad, ty + scriptPx * 0.4);

  // Star quote.
  const qY = ty + scriptPx * 2.1;
  const qPx = Math.max(11, Math.round(Math.min(w * 0.05, h * 0.05)));
  ctx.font = `800 ${qPx}px Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  const qText = `★ ${state.quote}`;
  fitFont(ctx, qText, w - pad * 2, qPx, 'Arial, sans-serif', '800');
  ctx.fillText(qText, x + pad, qY);
  ctx.font = `italic 400 ${Math.round(qPx * 0.85)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(`— ${state.quoteBy}`, x + pad, qY + qPx * 1.25);

  // NO. 10 chip, top-right of the band.
  const chip = 'NO. 10';
  const chipPx = Math.max(11, Math.round(Math.min(w * 0.045, h * 0.06)));
  ctx.font = `800 ${chipPx}px Arial, sans-serif`;
  const cw = ctx.measureText(chip).width + chipPx * 1.2;
  const ch = chipPx * 1.9;
  ctx.fillStyle = '#ffd319';
  ctx.beginPath();
  ctx.roundRect(x + w - pad - cw, y + pad * 0.7, cw, ch, ch / 2);
  ctx.fill();
  ctx.fillStyle = '#1b1440';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(chip, x + w - pad - cw / 2, y + pad * 0.7 + ch / 2 + 1);
  ctx.textAlign = 'left';

  // Circular ORIGINAL PHOTOGRAPHY seal, bottom-right of the band.
  const sealR = Math.max(20, Math.round(Math.min(w * 0.19, h * 0.22)));
  const scx = x + w - pad - sealR;
  const scy = y + h - pad - sealR;
  ctx.save();
  ctx.beginPath();
  ctx.arc(scx, scy, sealR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,211,25,0.94)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1b1440';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(scx, scy, sealR * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#1b1440';
  ctx.font = `800 ${Math.max(7, Math.round(sealR * 0.2))}px Arial, sans-serif`;
  arcText(ctx, 'ORIGINAL PHOTOGRAPHY • ', scx, scy, sealR * 0.86, -Math.PI * 0.85, Math.PI * 0.85);
  ctx.font = `900 ${Math.round(sealR * 0.5)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', scx, scy + 1);
  ctx.restore();

  // Barcode, bottom-left of the band.
  barcode(ctx, x + pad, y + h - pad - Math.max(14, Math.round(h * 0.09)), Math.round(w * 0.3), Math.max(14, Math.round(h * 0.09)), 7);
}

export function drawCover(canvas, photos, state) {
  const size = SIZES[state.size] ?? SIZES.square;
  const W = size.w;
  const H = size.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES.find((g) => g.id === state.grade) ?? GRADES[0];

  // Backdrop.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0e1b2c');
  bg.addColorStop(1, '#241536');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const geo = geometry(state.layout, W, H);
  const border = Math.max(2, Math.round(W * 0.003));

  for (const p of geo.cast) {
    const cast = CAST.find((c) => c.key === p.key);
    panel(ctx, photos[p.key], p, cast.fx, cast.fy, state.crops[p.key], p.lean, border);
    nameTag(ctx, cast.label, p);
  }
  panel(ctx, photos.aerial, geo.aerial, 0.5, 0.5, state.crops.aerial, geo.aerial.lean, border);
  panel(ctx, photos.car, geo.car, 0.5, 0.55, state.crops.car, 0, border);

  dressTitle(ctx, state, geo.title);

  // Billing strip along the bottom inside the frame.
  const b = geo.billing;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const billPx = Math.max(9, Math.round(b.h * 0.52));
  fitFont(ctx, 'MARLIN COAST COVER STUDIO  •  FIVE FACES  •  ONE COASTLINE  •  NO WAY BACK', b.w - 4, billPx, 'Arial, sans-serif', '700');
  ctx.textBaseline = 'middle';
  ctx.fillText('MARLIN COAST COVER STUDIO  •  FIVE FACES  •  ONE COASTLINE  •  NO WAY BACK', b.x + 2, b.y + b.h / 2 + 1);

  gradeWash(ctx, grade, W, H);
  grain(ctx, W, H);

  // Double frame: thick white outer line, thin inner line whose bottom
  // edge stops above the billing strip so it never crosses the text.
  const m = geo.m;
  ctx.lineWidth = Math.max(4, Math.round(W * 0.008));
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(m / 2, m / 2, W - m, H - m);
  ctx.lineWidth = Math.max(1, Math.round(W * 0.0015));
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeRect(m + 6, m + 6, W - (m + 6) * 2, H - (m + 6) * 2 - geo.billH - geo.g);
  return { w: W, h: H };
}
