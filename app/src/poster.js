// poster.js — layouts, colour grades, the photographic poster pipeline
// and the poster lettering and dressing of Vice Coast Cover Studio
// (round 8). The pipeline order matters and is kept light on purpose:
// FIRST the photo finish on the raw panel (fine luminance grain, gentle
// highlight bloom, a slight contrast S-curve), THEN the poster treatment
// (posterize at many levels, a very subtle halftone that follows
// brightness, and a brightness-to-gradient-ramp colour map). The default
// mix reads as a graded photograph with a print texture, never as a dot
// screen with a picture behind it.

import { clamp01, hexRgb, lerp, mulberry32 } from './noise.js';

// ---------- colour grades: brightness-to-ramp maps ----------

export const GRADES = {
  sunset: { name: 'Sunset', ramp: ['#160a24', '#5e1d4e', '#c22a5e', '#f26a3c', '#ffb02e', '#fff3cf'] },
  neon: { name: 'Neon', ramp: ['#0a0618', '#3d1660', '#a83a9e', '#ff2e88', '#ff8ab0', '#d8f6ff'] },
  golden: { name: 'Golden', ramp: ['#1d0f04', '#6e3410', '#c9741e', '#f2a83c', '#ffd76e', '#fff8dc'] },
  miami: { name: 'Miami', ramp: ['#041e2a', '#0e5a6e', '#1db8c9', '#ff7da8', '#ffc2d4', '#f2feff'] },
  viceblue: { name: 'Vice Blue', ramp: ['#040a1f', '#14295e', '#2a5eb8', '#5e94e8', '#a8cdf5', '#f2f8ff'] },
  comic: { name: 'Comic Ink', ramp: ['#12061f', '#12061f', '#7d1d8d', '#7d1d8d', '#ffb02e', '#fff3cf'] },
};

export const GRADE_ORDER = ['sunset', 'neon', 'golden', 'miami', 'viceblue', 'comic'];

// ---------- layouts: panels as polygons in unit space ----------
// Each layout returns an array of panels; a panel is a polygon (array of
// [x, y] points in 0..1 space). Comic layouts slant their dividers so
// panels touch edge to edge at angles inside the keyline frame.

function rect(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

export const LAYOUTS = {
  comicA: {
    name: 'Comic Slant A',
    panels() {
      return [
        [[0, 0], [0.52, 0], [0.46, 0.55], [0, 0.62]],
        [[0.52, 0], [1, 0], [1, 0.3], [0.62, 0.42], [0.46, 0.55]],
        [[0.62, 0.42], [1, 0.3], [1, 0.58], [0.58, 0.62]],
        [[0, 0.62], [0.46, 0.55], [0.58, 0.62], [0.55, 1], [0, 1]],
        [[0.58, 0.62], [1, 0.58], [1, 1], [0.55, 1]],
      ];
    },
  },
  comicB: {
    name: 'Comic Slant B',
    panels() {
      return [
        [[0, 0], [0.62, 0], [0.56, 0.38], [0, 0.44]],
        [[0.62, 0], [1, 0], [1, 0.42], [0.56, 0.38]],
        [[0, 0.44], [0.56, 0.38], [0.5, 0.72], [0, 0.78]],
        [[0.56, 0.38], [1, 0.42], [1, 0.7], [0.5, 0.72]],
        [[0, 0.78], [0.5, 0.72], [1, 0.7], [1, 1], [0, 1]],
      ];
    },
  },
  heroSplit: {
    name: 'Hero Split',
    panels() {
      return [
        rect(0, 0, 0.58, 1),
        rect(0.58, 0, 0.42, 0.34),
        rect(0.58, 0.34, 0.42, 0.33),
        rect(0.58, 0.67, 0.42, 0.33),
      ];
    },
  },
  gridSix: {
    name: 'Grid Six',
    panels() {
      const out = [];
      for (let r = 0; r < 2; r += 1) {
        for (let c = 0; c < 3; c += 1) out.push(rect(c / 3, r / 2, 1 / 3, 1 / 2));
      }
      return out;
    },
  },
  marquee: {
    name: 'Marquee',
    panels() {
      return [
        rect(0, 0, 1, 0.52),
        rect(0, 0.52, 0.34, 0.48),
        rect(0.34, 0.52, 0.33, 0.48),
        rect(0.67, 0.52, 0.33, 0.48),
      ];
    },
  },
  wideReel: {
    name: 'Wide Reel',
    panels() {
      return [
        rect(0, 0.18, 0.4, 0.64),
        rect(0.4, 0.18, 0.3, 0.64),
        rect(0.7, 0.18, 0.3, 0.64),
        rect(0, 0, 1, 0.18),
        rect(0, 0.82, 1, 0.18),
      ];
    },
  },
  portraitStack: {
    name: 'Portrait Stack',
    panels() {
      return [
        rect(0, 0, 1, 0.46),
        rect(0, 0.46, 0.5, 0.54),
        rect(0.5, 0.46, 0.5, 0.54),
      ];
    },
  },
};

export const LAYOUT_ORDER = ['comicA', 'comicB', 'heroSplit', 'gridSix', 'marquee', 'wideReel', 'portraitStack'];

// The largest layouts hold eight photo slots: gridSix is drawn with an
// extra row pair when the cover is tall; the editor simply cycles the
// loaded photos across however many panels a layout defines, and the
// eight-slot variant below serves the square and portrait sizes.
export function panelsFor(layoutId, aspect) {
  if (layoutId === 'gridSix' && aspect <= 1) {
    const out = [];
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 2; c += 1) out.push(rect(c / 2, r / 4, 1 / 2, 1 / 4));
    }
    return out;
  }
  return LAYOUTS[layoutId].panels();
}

export function polygonBounds(poly) {
  let minX = 1; let minY = 1; let maxX = 0; let maxY = 0;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function tracePolygon(ctx, poly, w, h) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * w, y * h);
    else ctx.lineTo(x * w, y * h);
  });
  ctx.closePath();
}

// ---------- the panel pipeline ----------

// Draw an image into a panel polygon with cover-fit cropping, honouring
// the per-panel zoom and pan the editor stores.
export function drawPanelImage(ctx, img, poly, w, h, view) {
  const b = polygonBounds(poly);
  const bw = b.w * w;
  const bh = b.h * h;
  if (bw < 2 || bh < 2) return;
  ctx.save();
  tracePolygon(ctx, poly, w, h);
  ctx.clip();
  const zoom = view && view.zoom ? view.zoom : 1;
  const panX = view && view.panX ? view.panX : 0;
  const panY = view && view.panY ? view.panY : 0;
  const flip = view && view.flip ? -1 : 1;
  const iw = img.width || img.naturalWidth;
  const ih = img.height || img.naturalHeight;
  const scale = Math.max(bw / iw, bh / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = b.x * w + (bw - dw) / 2 + panX * bw * 0.4;
  const dy = b.y * h + (bh - dh) / 2 + panY * bh * 0.4;
  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.scale(flip, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// Photo finish, then poster treatment, applied to one panel canvas in
// place. ink is the Poster Ink strength 0..1; grainAmt and the halftone
// follow it, so ink 0 is a clean graded photograph.
export function finishPanel(canvas, gradeId, ink, grainAmt, seed) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  if (w < 4 || h < 4) return;
  // gentle highlight bloom: a blurred copy of the brights, screened back
  if (ink > 0.02) {
    const bloom = document.createElement('canvas');
    bloom.width = Math.max(2, Math.floor(w / 3));
    bloom.height = Math.max(2, Math.floor(h / 3));
    const bctx = bloom.getContext('2d');
    bctx.drawImage(canvas, 0, 0, bloom.width, bloom.height);
    ctx.save();
    ctx.globalAlpha = 0.18 * ink + 0.1;
    ctx.globalCompositeOperation = 'screen';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bloom, 0, 0, w, h);
    ctx.restore();
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const ramp = GRADES[gradeId].ramp.map((c) => hexRgb(c).slice(0, 3));
  const levels = gradeId === 'comic' ? 5 : 10;
  const rand = mulberry32(seed || 99);
  // pre-roll a grain row so the loop stays cheap and deterministic
  const grainRow = new Float32Array(w);
  for (let x = 0; x < w; x += 1) grainRow[x] = rand() - 0.5;
  const posterMix = gradeId === 'comic' ? ink * 0.9 : ink * 0.55;
  const rampMix = gradeId === 'comic' ? ink * 0.85 : ink * 0.5;
  const dotSpacing = 5;
  for (let y = 0; y < h; y += 1) {
    // a fresh grain row every row: reusing one across rows would print
    // as vertical streaks instead of fine luminance grain
    for (let x = 0; x < w; x += 1) grainRow[x] = rand() - 0.5;
    const dotRow = Math.floor(y / dotSpacing);
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      let r = d[i] / 255;
      let g = d[i + 1] / 255;
      let b = d[i + 2] / 255;
      // slight contrast S-curve (the photo finish)
      r = clamp01(r + Math.sin((r - 0.5) * Math.PI) * 0.06);
      g = clamp01(g + Math.sin((g - 0.5) * Math.PI) * 0.06);
      b = clamp01(b + Math.sin((b - 0.5) * Math.PI) * 0.06);
      // posterize into many levels, mixed back by ink
      const pr = Math.round(r * (levels - 1)) / (levels - 1);
      const pg = Math.round(g * (levels - 1)) / (levels - 1);
      const pb = Math.round(b * (levels - 1)) / (levels - 1);
      r = lerp(r, pr, posterMix);
      g = lerp(g, pg, posterMix);
      b = lerp(b, pb, posterMix);
      // brightness-to-ramp colour map
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const scaled = clamp01(lum) * (ramp.length - 1);
      const idx = Math.min(ramp.length - 2, Math.floor(scaled));
      const ft = scaled - idx;
      const rr = lerp(ramp[idx][0], ramp[idx + 1][0], ft) / 255;
      const rg = lerp(ramp[idx][1], ramp[idx + 1][1], ft) / 255;
      const rb = lerp(ramp[idx][2], ramp[idx + 1][2], ft) / 255;
      // keep the photo's own chroma: map luminance, preserve hue drift
      r = lerp(r, clamp01(rr * (0.35 + lum * 1.3)), rampMix);
      g = lerp(g, clamp01(rg * (0.35 + lum * 1.3)), rampMix);
      b = lerp(b, clamp01(rb * (0.35 + lum * 1.3)), rampMix);
      // very subtle halftone that follows brightness
      if (ink > 0.03) {
        const dotCol = Math.floor(x / dotSpacing);
        const cellX = (x % dotSpacing) / dotSpacing - 0.5;
        const cellY = (y % dotSpacing) / dotSpacing - 0.5;
        const dist = Math.sqrt(cellX * cellX + cellY * cellY);
        const dotR = (1 - lum) * 0.52;
        if (dist < dotR) {
          const k = 1 - 0.16 * ink * (gradeId === 'comic' ? 2.2 : 1);
          r *= k; g *= k; b *= k;
        }
        void dotRow;
      }
      // fine luminance grain, last of the photo finish
      const grain = grainRow[x] * grainAmt * 0.14;
      d[i] = clamp01(r + grain) * 255;
      d[i + 1] = clamp01(g + grain) * 255;
      d[i + 2] = clamp01(b + grain) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- poster lettering and dressing (all original wording) ----------

function star(ctx, cx, cy, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// The title block: very large bold display letters filled with a
// vertical three-stop gradient, a thick dark outline, a hard offset
// drop shadow and a slight italic slant; a neon-glow script subtitle
// overlapping its lower edge. Drawn centred at (cx, cy).
export function drawTitleBlock(ctx, w, h, text) {
  const { title, subtitle } = text;
  const cx = w / 2;
  const cy = h * (text.titleY != null ? text.titleY : 0.52);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  let size = h * 0.16;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const setFont = (s) => { ctx.font = `900 ${s}px "Arial Black", "Archivo Black", Impact, sans-serif`; };
  setFont(size);
  const widest = Math.max(...words.map((word) => ctx.measureText(word).width), 1);
  if (widest > w * 0.94) {
    size *= (w * 0.94) / widest;
    setFont(size);
  }
  const lineH = size * 0.92;
  const startY = -((words.length - 1) * lineH) / 2;
  words.forEach((word, i) => {
    const y = startY + i * lineH;
    const grad = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
    grad.addColorStop(0, '#fff8dc');
    grad.addColorStop(0.45, '#ffd76e');
    grad.addColorStop(0.75, '#ff7a3c');
    grad.addColorStop(1, '#e83a6e');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = size * 0.16;
    ctx.save();
    ctx.translate(size * 0.045, size * 0.06);
    ctx.fillStyle = 'rgba(22,6,36,0.85)';
    ctx.fillText(word, 0, y);
    ctx.restore();
    ctx.strokeText(word, 0, y);
    ctx.fillStyle = grad;
    ctx.fillText(word, 0, y);
  });
  // neon script subtitle overlapping the title's lower edge
  if (subtitle) {
    const sub = subtitle.toUpperCase();
    let subSize = size * 0.34;
    ctx.font = `italic 700 ${subSize}px "Segoe Script", "Brush Script MT", cursive`;
    const sw = ctx.measureText(sub).width;
    if (sw > w * 0.8) {
      subSize *= (w * 0.8) / sw;
      ctx.font = `italic 700 ${subSize}px "Segoe Script", "Brush Script MT", cursive`;
    }
    const sy = startY + (words.length - 1) * lineH + size * 0.52;
    ctx.save();
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.22;
    ctx.fillStyle = '#ff5ea8';
    ctx.fillText(sub, w * 0.1, sy);
    ctx.fillText(sub, w * 0.1, sy);
    ctx.restore();
    ctx.fillStyle = '#ffd7ec';
    ctx.fillText(sub, w * 0.1, sy);
  }
  ctx.restore();
  const top = cy + startY - size * 0.72;
  const bottom = cy + startY + (words.length - 1) * lineH + size * 0.85;
  return { top, bottom, size };
}

// Press quote with five stars, above the title.
export function drawQuoteLine(ctx, w, y, quote, source) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const starR = Math.max(6, w * 0.011);
  for (let i = 0; i < 5; i += 1) star(ctx, w / 2 + (i - 2) * starR * 2.5, y, starR, '#ffc93c');
  const line = `"${quote}" — ${source}`.toUpperCase();
  let size = w * 0.02;
  ctx.font = `800 ${size}px "Arial Narrow", Arial, sans-serif`;
  if (ctx.measureText(line).width > w * 0.9) {
    size *= (w * 0.9) / ctx.measureText(line).width;
    ctx.font = `800 ${size}px "Arial Narrow", Arial, sans-serif`;
  }
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = 'rgba(16,4,24,0.85)';
  ctx.strokeText(line, w / 2, y + starR * 2.1);
  ctx.fillStyle = '#fff3cf';
  ctx.fillText(line, w / 2, y + starR * 2.1);
  ctx.restore();
}

// Starburst seal badge with an editable two-line centre text.
export function drawSeal(ctx, x, y, r, line1, line2) {
  ctx.save();
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i += 1) {
    const ang = (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? r : r * 0.84;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#e83a6e';
  ctx.fill();
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = r * 0.05;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#ffeec2';
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) star(ctx, x + (i - 1) * r * 0.3, y - r * 0.3, r * 0.1, '#160a24');
  ctx.fillStyle = '#160a24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let sealSize = r * 0.3;
  ctx.font = `900 ${sealSize}px "Arial Black", Impact, sans-serif`;
  const sealText = line1.toUpperCase();
  if (ctx.measureText(sealText).width > r * 1.2) {
    sealSize *= (r * 1.2) / ctx.measureText(sealText).width;
    ctx.font = `900 ${sealSize}px "Arial Black", Impact, sans-serif`;
  }
  ctx.fillText(sealText, x, y + r * 0.08);
  ctx.font = `700 ${r * 0.17}px "Arial Narrow", Arial, sans-serif`;
  ctx.fillText(line2.toUpperCase(), x, y + r * 0.38);
  ctx.restore();
}

// Bottom strip: palm silhouettes against a sunset gradient, tagline
// lettered across it.
export function drawPalmStrip(ctx, w, h, tagline, rand) {
  const stripH = h * 0.07;
  // the strip sits just above the black bottom band that carries the
  // billing block, the barcode and the monogram
  const y0 = h - stripH - h * 0.032;
  const stripBottom = y0 + stripH;
  const grad = ctx.createLinearGradient(0, y0, 0, stripBottom);
  grad.addColorStop(0, '#7d1d6e');
  grad.addColorStop(0.55, '#e83a5e');
  grad.addColorStop(1, '#ffb02e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y0, w, stripH);
  // sun sliver in the strip
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.arc(w * 0.32, stripBottom, stripH * 0.8, Math.PI, Math.PI * 2);
  ctx.fill();
  // palm silhouettes
  ctx.fillStyle = '#160a24';
  const palms = 9;
  for (let i = 0; i < palms; i += 1) {
    const px = (i + 0.5) * (w / palms) + (rand() - 0.5) * 8;
    const ph = stripH * (0.7 + rand() * 0.35);
    ctx.fillRect(px - 1.2, stripBottom - ph, 2.4, ph);
    for (let f = 0; f < 5; f += 1) {
      const ang = Math.PI * (0.15 + f * 0.18);
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(ang) * ph * 0.22, stripBottom - ph - Math.sin(ang) * ph * 0.1, ph * 0.24, ph * 0.055, -ang * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = stripH * 0.42;
  ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
  const line = tagline.toUpperCase();
  if (ctx.measureText(line).width > w * 0.92) {
    size *= (w * 0.92) / ctx.measureText(line).width;
    ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
  }
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = 'rgba(16,4,24,0.9)';
  ctx.strokeText(line, w / 2, y0 + stripH * 0.52);
  ctx.fillStyle = '#fff8dc';
  ctx.fillText(line, w / 2, y0 + stripH * 0.52);
  ctx.restore();
}

// Movie-style billing block in tiny capitals along the very bottom.
export function drawBilling(ctx, w, h, title) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = Math.max(7, h * 0.013);
  ctx.font = `600 ${size}px "Arial Narrow", Arial, sans-serif`;
  const line = `VICE COAST COVER STUDIO PRESENTS "${title.toUpperCase()}" · STARRING YOU · SHOT ON YOUR OWN CAMERA · LETTERING AND SEAL ORIGINAL · NO UPLOAD, EVER`;
  if (ctx.measureText(line).width > w * 0.86) {
    size *= (w * 0.86) / ctx.measureText(line).width;
    ctx.font = `600 ${size}px "Arial Narrow", Arial, sans-serif`;
  }
  ctx.fillStyle = 'rgba(240,235,255,0.85)';
  ctx.fillText(line, w / 2, h - size * 0.85);
  ctx.restore();
}

// A small drawn barcode (decorative bars from the title's letters).
export function drawBarcode(ctx, x, y, w, h, seedText) {
  ctx.save();
  ctx.fillStyle = '#f5f2ea';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#14100c';
  const rand = mulberry32([...seedText].reduce((a, c) => a + c.charCodeAt(0), 7));
  let bx = x + w * 0.06;
  while (bx < x + w * 0.92) {
    const bw = 1 + rand() * 3;
    if (rand() > 0.35) ctx.fillRect(bx, y + h * 0.1, bw, h * 0.66);
    bx += bw + 1 + rand() * 2.4;
  }
  ctx.font = `${Math.max(6, h * 0.2)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('0 261120 2608 7', x + w / 2, y + h * 0.92);
  ctx.restore();
}

// Studio monogram chip.
export function drawMonogram(ctx, x, y, s) {
  ctx.save();
  ctx.fillStyle = '#e83a6e';
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, s * 0.18);
  ctx.fill();
  ctx.fillStyle = '#fff3cf';
  ctx.font = `900 ${s * 0.5}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VC', x + s / 2, y + s * 0.54);
  ctx.restore();
}

// Thin pale keyline frame around the whole cover.
export function drawCoverFrame(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = '#f5efe2';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = Math.max(6, w * 0.012);
  ctx.strokeRect(-ctx.lineWidth / 2, -ctx.lineWidth / 2, w + ctx.lineWidth, h + ctx.lineWidth);
  ctx.restore();
}

// ---------- whole-cover composition ----------

// Compose a full cover at (w, h): every panel is rendered on its own
// canvas, finished with the pipeline, then clipped into its polygon;
// pale keylines separate the panels; the title lies across the middle
// band over the art; the dressing frames it. state carries photos,
// per-panel views and ink, layout, grade and all editable texts.
export function composeCover(w, h, state) {
  const cover = document.createElement('canvas');
  cover.width = w;
  cover.height = h;
  const ctx = cover.getContext('2d');
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  const panels = panelsFor(state.layout, w / h);
  const ink = state.ink != null ? state.ink : 0.65;
  panels.forEach((poly, i) => {
    const b = polygonBounds(poly);
    const pw = Math.max(8, Math.ceil(b.w * w));
    const ph = Math.max(8, Math.ceil(b.h * h));
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = pw;
    panelCanvas.height = ph;
    const pctx = panelCanvas.getContext('2d');
    const photo = state.panelPhotos[i % Math.max(1, state.panelPhotos.length)];
    if (photo) {
      const full = document.createElement('canvas');
      full.width = pw;
      full.height = ph;
      drawPanelImage(full.getContext('2d'), photo.canvas || photo, [[0, 0], [1, 0], [1, 1], [0, 1]], pw, ph, state.panelViews[i] || {});
      pctx.drawImage(full, 0, 0);
    }
    const panelInk = state.panelInk && state.panelInk[i] != null ? state.panelInk[i] : ink;
    finishPanel(panelCanvas, state.grade, panelInk, state.grain != null ? state.grain : 0.5, 500 + i * 37);
    ctx.save();
    tracePolygon(ctx, poly, w, h);
    ctx.clip();
    ctx.drawImage(panelCanvas, b.x * w, b.y * h);
    ctx.restore();
    // pale keyline on the panel edge
    ctx.save();
    tracePolygon(ctx, poly, w, h);
    ctx.strokeStyle = '#f5efe2';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.stroke();
    ctx.restore();
  });
  drawVignette(ctx, w, h, state.vignette != null ? state.vignette : 0.45);
  // dressing: quote above the title, seal overlapping a corner panel
  const titleInfo = drawTitleBlock(ctx, w, h, state);
  drawQuoteLine(ctx, w, titleInfo.top - h * 0.055, state.quote, state.quoteSource);
  const rand = mulberry32(42);
  drawSeal(ctx, w * 0.86, h * 0.3, w * 0.062, state.sealLine1, state.sealLine2);
  drawPalmStrip(ctx, w, h, state.tagline, rand);
  drawBilling(ctx, w, h, state.title);
  const mono = Math.max(20, w * 0.032);
  drawMonogram(ctx, w * 0.014, h - mono - h * 0.006, mono);
  drawBarcode(ctx, w - w * 0.105 - w * 0.014, h - h * 0.045 - h * 0.004, w * 0.105, h * 0.045, state.title);
  drawCoverFrame(ctx, w, h);
  return cover;
}

// Soft vignette over a whole cover, drawn after the panels.
export function drawVignette(ctx, w, h, strength) {
  if (strength <= 0.01) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(8,2,14,0)');
  g.addColorStop(1, `rgba(8,2,14,${0.55 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
