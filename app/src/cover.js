// Marlin Coast Cover Studio — the cover renderer.
//
// Everything the studio knows about drawing a cover lives here: three
// multi-panel layouts in the GTA poster manner (Cast Slant, Hero Car,
// Portrait Cast), three colour grades (Sunset, Neon, Miami) and the full
// poster dressing — a giant gradient title with a halftone band, a script
// line, a star quote, a NO. 10 chip, a circular photography seal, a
// barcode, a billing strip and a double frame.
//
// The poster treatment is deliberately LIGHT. Photographs are drawn as
// photographs: a canvas filter grade (saturation, contrast, a breath of
// sepia) plus a fine grain over the finished cover. There is no ink or
// cartoon pass and faces stay photographic; halftone dots live only on
// the title band, behind the lettering, where a printed poster would
// carry them.

// The five cast members of the bundled example cover, with the slanted
// name tag each one wears and the face-aware focus point (fractions of
// the photograph) its panel crop is centred on, so a panel change never
// crops a face away.
export const CAST_MEMBERS = [
  { id: 'dj', name: 'THE NIGHT DJ', asset: 'assets/cast-dj.jpg', focus: { x: 0.5, y: 0.3 } },
  { id: 'driver', name: 'THE GETAWAY DRIVER', asset: 'assets/cast-driver.jpg', focus: { x: 0.5, y: 0.3 } },
  { id: 'queen', name: 'THE BOARDWALK QUEEN', asset: 'assets/cast-queen.jpg', focus: { x: 0.5, y: 0.29 } },
  { id: 'pilot', name: 'THE STORM PILOT', asset: 'assets/cast-pilot.jpg', focus: { x: 0.5, y: 0.31 } },
  { id: 'diver', name: 'THE PEARL DIVER', asset: 'assets/cast-diver.jpg', focus: { x: 0.5, y: 0.3 } },
];

// The two scene panels: the car gets a panel of its own at full side
// profile, and the aerial coast runs as a strip through every layout.
export const SCENE_PANELS = [
  { id: 'car', name: 'THE CONVERTIBLE', asset: 'assets/car.jpg', focus: { x: 0.5, y: 0.55 } },
  { id: 'aerial', name: 'THE COAST FROM ABOVE', asset: 'assets/aerial.jpg', focus: { x: 0.5, y: 0.5 } },
];

export const ALL_PANELS = [...CAST_MEMBERS, ...SCENE_PANELS];

// The wording the studio dresses every cover with.
export const COVER_WORDING = {
  title: 'MARLIN COAST',
  script: 'where the tide keeps secrets',
  tagline: 'FIVE FACES · ONE COASTLINE · NO WAY BACK',
  quote: '“A POSTCARD WITH TEETH”',
  quoteBy: 'The Harbor Gazette',
  chip: 'NO. 10',
  seal: 'ORIGINAL PHOTOGRAPHY',
  billing: 'MARLIN COAST PICTURES PRESENTS · THE NIGHT DJ · THE GETAWAY DRIVER · THE BOARDWALK QUEEN · THE STORM PILOT · THE PEARL DIVER · A POSTCARD WITH TEETH',
  barcodeDigits: '8 90410 20261 0',
};

// The three grades. `filter` is applied to each photograph as it is
// drawn; `wash` is a transparent gradient laid over the whole cover;
// `band` paints the title band; `titleStops` gradient the lettering.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.32) contrast(1.07) brightness(1.03) sepia(0.16)',
    band: ['#2a1030', '#57153f', '#8f1f4d'],
    titleStops: ['#ffe259', '#ff7518', '#ff2e88'],
    wash: [[0, 'rgba(255, 140, 60, 0.16)'], [0.5, 'rgba(255, 60, 120, 0.05)'], [1, 'rgba(160, 20, 100, 0.26)']],
    accent: '#ffb03a',
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.48) contrast(1.13) brightness(0.99) hue-rotate(-8deg)',
    band: ['#0d1030', '#25124d', '#4d1160'],
    titleStops: ['#7df9ff', '#2ea6ff', '#ff2ec4'],
    wash: [[0, 'rgba(0, 229, 255, 0.13)'], [0.5, 'rgba(120, 0, 255, 0.05)'], [1, 'rgba(255, 0, 128, 0.28)']],
    accent: '#2ee6ff',
  },
  miami: {
    label: 'Miami',
    filter: 'saturate(1.18) contrast(1.02) brightness(1.08) sepia(0.07)',
    band: ['#123a4d', '#175d6b', '#7a3d63'],
    titleStops: ['#d8fff2', '#7fe7d2', '#ff9ecf'],
    wash: [[0, 'rgba(120, 240, 220, 0.15)'], [0.5, 'rgba(255, 255, 255, 0.03)'], [1, 'rgba(255, 120, 180, 0.17)']],
    accent: '#7fe7d2',
  },
};

const TITLE_FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const CAPS_FONT = 'Arial, "Helvetica Neue", sans-serif';
const SCRIPT_FONT = 'Georgia, "Times New Roman", serif';

/** A fresh panel record: the bundled photograph, no crop adjustment. */
export function freshPanel(def) {
  return { def, img: null, zoom: 1, dx: 0, dy: 0, focus: { ...def.focus } };
}

/** The studio's starting state: every panel on its bundled photograph. */
export function freshStudioState() {
  const panels = {};
  for (const def of ALL_PANELS) panels[def.id] = freshPanel(def);
  return {
    layout: 'slant',
    grade: 'sunset',
    title: COVER_WORDING.title,
    caption: COVER_WORDING.tagline,
    heroId: 'dj',
    panels,
  };
}

/** Deterministic small random source, so grain and barcodes never change between draws. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** A tile of fine monochrome noise, built once and reused as a pattern. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 240; tile.height = 240;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(240, 240);
  const rand = seededRandom(20261120);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 96 + Math.floor(rand() * 96);
    image.data[i] = v; image.data[i + 1] = v; image.data[i + 2] = v; image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  grainTile = tile;
  return tile;
}

function polygonPath(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
}

function polygonBounds(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Draws one panel's photograph inside its polygon: cover-fit, centred on
 * the panel's face-aware focus point, with the user's zoom and drag
 * offsets applied and clamped so the photograph always covers the panel.
 */
function drawPanelPhoto(ctx, panel, poly, filter) {
  const b = polygonBounds(poly);
  ctx.save();
  polygonPath(ctx, poly);
  ctx.clip();
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const img = panel.img;
  if (img && img.naturalWidth > 0) {
    const scale = Math.max(b.w / img.naturalWidth, b.h / img.naturalHeight) * panel.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    let ox = b.x + b.w / 2 - panel.focus.x * dw + panel.dx * b.w;
    let oy = b.y + b.h / 2 - panel.focus.y * dh + panel.dy * b.h;
    ox = Math.min(b.x, Math.max(b.x + b.w - dw, ox));
    oy = Math.min(b.y, Math.max(b.y + b.h - dh, oy));
    ctx.filter = filter;
    ctx.drawImage(img, ox, oy, dw, dh);
    ctx.filter = 'none';
    // A panel far wider than its photograph (the car panel on a landscape
    // cover) would crop the subject away, so the car stands whole on a
    // designed banner backdrop — a dusk gradient, a glow and neon rules —
    // with both wheels always in frame.
    if (panel.def.id === 'car' && b.w / b.h > (img.naturalWidth / img.naturalHeight) * 1.9) {
      const backdrop = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      backdrop.addColorStop(0, '#3a1440');
      backdrop.addColorStop(0.62, '#7a1e52');
      backdrop.addColorStop(0.63, '#160d20');
      backdrop.addColorStop(1, '#160d20');
      ctx.fillStyle = backdrop;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      const glow = ctx.createRadialGradient(b.x + b.w / 2, b.y + b.h * 0.6, 4, b.x + b.w / 2, b.y + b.h * 0.6, b.w * 0.3);
      glow.addColorStop(0, 'rgba(255, 110, 90, 0.5)');
      glow.addColorStop(1, 'rgba(255, 110, 90, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(46, 230, 255, 0.65)';
      ctx.fillRect(b.x, b.y + b.h * 0.2, b.w, Math.max(1.5, b.h * 0.014));
      ctx.fillStyle = 'rgba(255, 46, 136, 0.7)';
      ctx.fillRect(b.x, b.y + b.h * 0.3, b.w, Math.max(1.5, b.h * 0.014));
      ctx.fillStyle = 'rgba(255, 176, 58, 0.5)';
      ctx.fillRect(b.x, b.y + b.h * 0.4, b.w, Math.max(1.5, b.h * 0.012));
      // The photograph is blown up past the panel's height, anchored on
      // its focus point, so the car fills the banner while the crop only
      // eats sky and street — never the car itself. Its side edges are
      // feathered into the backdrop through an offscreen mask, so the
      // photograph melts into the banner instead of ending in a hard
      // rectangle.
      let fit = (b.h / img.naturalHeight) * 1.7 * panel.zoom;
      if (img.naturalWidth * fit > b.w * 0.98) fit = (b.w * 0.98) / img.naturalWidth;
      const fw = img.naturalWidth * fit;
      const fh = img.naturalHeight * fit;
      let fy = b.y + b.h / 2 - (panel.focus.y + 0.03) * fh + panel.dy * b.h;
      fy = Math.min(b.y, Math.max(b.y + b.h - fh, fy));
      const stage = document.createElement('canvas');
      stage.width = Math.max(2, Math.round(fw));
      stage.height = Math.max(2, Math.round(fh));
      const sctx = stage.getContext('2d');
      sctx.filter = filter;
      sctx.drawImage(img, 0, 0, stage.width, stage.height);
      sctx.filter = 'none';
      sctx.globalCompositeOperation = 'destination-in';
      const feather = sctx.createLinearGradient(0, 0, stage.width, 0);
      feather.addColorStop(0, 'rgba(0, 0, 0, 0)');
      feather.addColorStop(0.16, 'rgba(0, 0, 0, 1)');
      feather.addColorStop(0.84, 'rgba(0, 0, 0, 1)');
      feather.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = feather;
      sctx.fillRect(0, 0, stage.width, stage.height);
      sctx.globalCompositeOperation = 'source-over';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = b.h * 0.12;
      ctx.shadowOffsetY = b.h * 0.05;
      ctx.drawImage(stage, b.x + (b.w - fw) / 2 + panel.dx * b.w, fy, fw, fh);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.filter = 'none';
    }
    // A soft scrim at the panel's foot keeps its name tag readable.
    const scrim = ctx.createLinearGradient(0, b.y + b.h * 0.68, 0, b.y + b.h);
    scrim.addColorStop(0, 'rgba(8, 4, 16, 0)');
    scrim.addColorStop(1, 'rgba(8, 4, 16, 0.55)');
    ctx.fillStyle = scrim;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  ctx.restore();
}

/** The comic edge between panels: a pale keyline inside a dark rule. */
function strokePanelEdges(ctx, panels, w) {
  for (const { poly } of panels) {
    polygonPath(ctx, poly);
    ctx.lineWidth = Math.max(2, w * 0.0075);
    ctx.strokeStyle = '#f7f1e3';
    ctx.stroke();
    polygonPath(ctx, poly);
    ctx.lineWidth = Math.max(1.2, w * 0.0038);
    ctx.strokeStyle = '#17101f';
    ctx.stroke();
  }
}

/** A slanted name tag across the foot of a cast panel. */
function drawNameTag(ctx, panel, poly, w, h) {
  const b = polygonBounds(poly);
  const tagH = Math.min(h * 0.052, b.h * 0.2);
  const cy = b.y + b.h - tagH * 0.92;
  // The tag is sized to the panel's cross-section at the tag's own
  // height — a slanted panel is narrower there than its bounding box,
  // and a bounding-box tag would spill over its neighbours.
  const [tl, tr, br, bl] = poly;
  const tLeft = (cy - tl.y) / Math.max(1, bl.y - tl.y);
  const tRight = (cy - tr.y) / Math.max(1, br.y - tr.y);
  const leftAtY = tl.x + (bl.x - tl.x) * tLeft;
  const rightAtY = tr.x + (br.x - tr.x) * tRight;
  const rectW = (rightAtY - leftAtY) * 0.96;
  const cx = Math.min(w - rectW / 2 - 4, Math.max(rectW / 2 + 4, (leftAtY + rightAtY) / 2));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.055);
  ctx.fillStyle = 'rgba(10, 7, 18, 0.85)';
  ctx.fillRect(-rectW / 2, -tagH / 2, rectW, tagH);
  ctx.fillStyle = '#ffb03a';
  ctx.fillRect(-rectW / 2, tagH / 2 - Math.max(2, h * 0.004), rectW, Math.max(2, h * 0.004));
  fitText(ctx, panel.def.name, rectW * 0.92, tagH * 0.5, 900, CAPS_FONT);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(panel.def.name, 0, 0);
  ctx.restore();
}

/** Sets a font that fits `text` inside `maxWidth`, shrinking from `startPx`. Returns the size used. */
function fitText(ctx, text, maxWidth, startPx, weight, family) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && px > 7) {
    px -= 1.5;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

/** Draws centred text with even letter spacing, for strips and seals. */
function drawSpacedText(ctx, text, cx, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

/** Halftone dots, used on the title band only. */
function drawHalftoneBand(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  const gap = Math.max(9, w * 0.011);
  for (let row = 0, yy = y + gap / 2; yy < y + h; row++, yy += gap) {
    const fade = 1 - (yy - y) / h;
    for (let xx = x + (row % 2 ? gap / 2 : 0); xx < x + w; xx += gap) {
      const r = gap * 0.11 * fade + 0.3;
      ctx.globalAlpha = 0.22 * fade + 0.04;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** The round ORIGINAL PHOTOGRAPHY seal, its letters set on a circle. */
function drawSeal(ctx, cx, cy, r, accent) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12, 8, 20, 0.78)';
  ctx.fill();
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = '#f7f1e3';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.03;
  ctx.strokeStyle = accent;
  ctx.stroke();
  const ring = `${COVER_WORDING.seal} · MARLIN COAST · `;
  ctx.fillStyle = '#f7f1e3';
  ctx.font = `700 ${r * 0.185}px ${CAPS_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / ring.length;
  for (let i = 0; i < ring.length; i++) {
    ctx.save();
    ctx.rotate(i * step);
    ctx.fillText(ring[i], 0, -r * 0.885);
    ctx.restore();
  }
  ctx.fillStyle = accent;
  ctx.font = `${r * 0.62}px ${CAPS_FONT}`;
  ctx.fillText('★', 0, r * 0.04);
  ctx.restore();
}

/** A deterministic barcode with its digits, bottom corner dressing. */
function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f7f1e3';
  ctx.fillRect(x, y, w, h);
  const rand = seededRandom(41020261);
  ctx.fillStyle = '#17101f';
  let bx = x + w * 0.06;
  const barArea = w * 0.88;
  while (bx < x + barArea) {
    const bw = (0.5 + rand() * 2.2) * (w / 90);
    if (rand() > 0.34) ctx.fillRect(bx, y + h * 0.1, bw, h * 0.58);
    bx += bw + (0.6 + rand() * 1.6) * (w / 90);
  }
  ctx.font = `600 ${h * 0.2}px ${CAPS_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(COVER_WORDING.barcodeDigits, x + w / 2, y + h * 0.84);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Layouts. Each returns the panels to draw, as polygons in cover pixels,
// with the panel id each polygon belongs to. The title band sits above
// the panels; the caption and billing strips sit below them.
// ---------------------------------------------------------------------------

function slantLayout(w, h) {
  const bandBottom = h * 0.205;
  const contentBottom = h * 0.918;
  const castTop = bandBottom;
  const castBottom = bandBottom + (contentBottom - bandBottom) * 0.585;
  const aerialBottom = castBottom + (contentBottom - bandBottom) * 0.095;
  const lean = w * 0.05;
  const pw = (w + lean) / CAST_MEMBERS.length;
  const panels = [];
  CAST_MEMBERS.forEach((def, i) => {
    panels.push({
      id: def.id,
      poly: [
        { x: i * pw - lean, y: castTop },
        { x: (i + 1) * pw - lean, y: castTop },
        { x: (i + 1) * pw, y: castBottom },
        { x: i * pw, y: castBottom },
      ],
    });
  });
  panels.push({
    id: 'aerial',
    poly: [
      { x: -w * 0.03, y: castBottom },
      { x: w, y: castBottom },
      { x: w * 1.03, y: aerialBottom },
      { x: 0, y: aerialBottom },
    ],
  });
  panels.push({
    id: 'car',
    poly: [
      { x: 0, y: aerialBottom },
      { x: w, y: aerialBottom },
      { x: w, y: contentBottom },
      { x: 0, y: contentBottom },
    ],
  });
  return { panels, bandBottom };
}

function heroLayout(w, h) {
  const bandBottom = h * 0.175;
  const contentBottom = h * 0.918;
  const carBottom = bandBottom + (contentBottom - bandBottom) * 0.66;
  const aerialBottom = carBottom + (contentBottom - bandBottom) * 0.065;
  const panels = [{
    id: 'car',
    poly: [
      { x: 0, y: bandBottom },
      { x: w, y: bandBottom },
      { x: w, y: carBottom },
      { x: 0, y: carBottom },
    ],
  }, {
    id: 'aerial',
    poly: [
      { x: -w * 0.02, y: carBottom },
      { x: w, y: carBottom },
      { x: w * 1.02, y: aerialBottom },
      { x: 0, y: aerialBottom },
    ],
  }];
  const lean = w * 0.018;
  const pw = (w + lean) / CAST_MEMBERS.length;
  CAST_MEMBERS.forEach((def, i) => {
    panels.push({
      id: def.id,
      poly: [
        { x: i * pw - lean, y: aerialBottom },
        { x: (i + 1) * pw - lean, y: aerialBottom },
        { x: (i + 1) * pw, y: contentBottom },
        { x: i * pw, y: contentBottom },
      ],
    });
  });
  return { panels, bandBottom };
}

function portraitLayout(w, h, heroId) {
  const bandBottom = h * 0.16;
  const contentBottom = h * 0.918;
  const stripBottom = bandBottom + h * 0.038;
  const top = stripBottom + h * 0.012;
  const panels = [{
    id: 'aerial',
    poly: [
      { x: 0, y: bandBottom },
      { x: w, y: bandBottom },
      { x: w, y: stripBottom },
      { x: 0, y: stripBottom },
    ],
  }, {
    id: heroId,
    poly: [
      { x: w * 0.022, y: top },
      { x: w * 0.52, y: top },
      { x: w * 0.52, y: contentBottom },
      { x: w * 0.022, y: contentBottom },
    ],
  }];
  const others = CAST_MEMBERS.filter((def) => def.id !== heroId);
  const gx = w * 0.545;
  const gw = w * 0.433;
  const gridBottom = top + (contentBottom - top) * 0.6;
  const cellW = gw / 2;
  const cellH = (gridBottom - top) / 2;
  others.forEach((def, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    panels.push({
      id: def.id,
      poly: [
        { x: gx + col * cellW, y: top + row * cellH },
        { x: gx + (col + 1) * cellW, y: top + row * cellH },
        { x: gx + (col + 1) * cellW, y: top + (row + 1) * cellH },
        { x: gx + col * cellW, y: top + (row + 1) * cellH },
      ],
    });
  });
  panels.push({
    id: 'car',
    poly: [
      { x: gx, y: gridBottom },
      { x: gx + gw, y: gridBottom },
      { x: gx + gw, y: contentBottom },
      { x: gx, y: contentBottom },
    ],
  });
  return { panels, bandBottom };
}

const LAYOUTS = { slant: slantLayout, hero: heroLayout, portrait: portraitLayout };
export const LAYOUT_LABELS = { slant: 'Cast Slant', hero: 'Hero Car', portrait: 'Portrait Cast' };

/** Draws the title band: grade sky, halftone, gradient title, script, quote, chip. */
function drawTitleBand(ctx, w, bandBottom, state, grade) {
  const bandGrad = ctx.createLinearGradient(0, 0, 0, bandBottom);
  grade.band.forEach((stop, i) => bandGrad.addColorStop(i / (grade.band.length - 1), stop));
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, 0, w, bandBottom);
  drawHalftoneBand(ctx, 0, 0, w, bandBottom, grade.accent);

  const title = (state.title || COVER_WORDING.title).toUpperCase();
  const titlePx = fitText(ctx, title, w * 0.86, bandBottom * 0.52, 900, TITLE_FONT);
  const grad = ctx.createLinearGradient(0, bandBottom * 0.08, 0, bandBottom * 0.72);
  grade.titleStops.forEach((stop, i) => grad.addColorStop(i / (grade.titleStops.length - 1), stop));
  ctx.save();
  ctx.translate(w / 2, bandBottom * 0.47);
  ctx.scale(0.88, 1);
  ctx.font = `900 ${titlePx}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = titlePx * 0.16;
  ctx.strokeStyle = '#17101f';
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(w / 2, bandBottom * 0.8);
  ctx.rotate(-0.012);
  ctx.font = `italic 600 ${bandBottom * 0.145}px ${SCRIPT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9f4';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = bandBottom * 0.03;
  ctx.fillText(COVER_WORDING.script, 0, 0);
  ctx.restore();

  // The star quote, small at the band's left foot.
  ctx.font = `700 ${bandBottom * 0.085}px ${CAPS_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grade.accent;
  ctx.fillText('★★★★★', w * 0.018, bandBottom * 0.93);
  const starsW = ctx.measureText('★★★★★').width;
  ctx.fillStyle = '#f7f1e3';
  ctx.font = `700 ${bandBottom * 0.088}px ${CAPS_FONT}`;
  ctx.fillText(`${COVER_WORDING.quote} — ${COVER_WORDING.quoteBy}`, w * 0.018 + starsW + w * 0.008, bandBottom * 0.93);

  // The NO. 10 chip, tilted at the band's top-right corner.
  ctx.save();
  ctx.translate(w * 0.945, bandBottom * 0.24);
  ctx.rotate(0.07);
  const chipW = w * 0.082;
  const chipH = bandBottom * 0.21;
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = '#f7f1e3';
  ctx.lineWidth = Math.max(1.5, w * 0.002);
  ctx.beginPath();
  ctx.roundRect(-chipW / 2, -chipH / 2, chipW, chipH, chipH * 0.3);
  ctx.fill();
  ctx.stroke();
  fitText(ctx, COVER_WORDING.chip, chipW * 0.86, chipH * 0.52, 900, CAPS_FONT);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(COVER_WORDING.chip, 0, 0);
  ctx.restore();
}

/**
 * Draws the whole cover onto `ctx` at w x h from the studio state:
 * panels first, then the grade wash and grain, then all the dressing.
 */
export function drawCoverArt(ctx, w, h, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? slantLayout;
  const { panels, bandBottom } = state.layout === 'portrait'
    ? layout(w, h, state.heroId)
    : layout(w, h);

  ctx.fillStyle = '#17101f';
  ctx.fillRect(0, 0, w, h);
  drawTitleBand(ctx, w, bandBottom, state, grade);

  const placed = panels.map((p) => ({ ...p, panel: state.panels[p.id] }));
  for (const entry of placed) {
    if (entry.panel) drawPanelPhoto(ctx, entry.panel, entry.poly, grade.filter);
  }
  strokePanelEdges(ctx, placed, w);
  for (const entry of placed) {
    if (entry.panel && CAST_MEMBERS.some((def) => def.id === entry.id)) {
      drawNameTag(ctx, entry.panel, entry.poly, w, h);
    }
  }

  // The grade wash and a vignette, over panels and band alike.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of grade.wash) wash.addColorStop(at, color);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vignette.addColorStop(0, 'rgba(10, 4, 18, 0)');
  vignette.addColorStop(1, 'rgba(10, 4, 18, 0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Fine grain over everything: the light poster finish.
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // The seal and the barcode dress the car panel's foot, wherever the
  // layout puts that panel.
  const carEntry = placed.find((entry) => entry.id === 'car');
  if (carEntry) {
    const cb = polygonBounds(carEntry.poly);
    const sealR = Math.min(w, h) * 0.058;
    drawSeal(ctx, cb.x + cb.w - sealR - w * 0.018, cb.y + cb.h - sealR - h * 0.014, sealR, grade.accent);
    drawBarcode(ctx, cb.x + w * 0.02, cb.y + cb.h - h * 0.054, w * 0.148, h * 0.04);
  }

  // The caption line, letter-spaced capitals on a dark strip.
  ctx.fillStyle = '#120b1c';
  ctx.fillRect(0, h * 0.918, w, h * 0.04);
  ctx.font = `800 ${h * 0.02}px ${CAPS_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9f4';
  drawSpacedText(ctx, (state.caption || COVER_WORDING.tagline).toUpperCase(), w / 2, h * 0.938, h * 0.006);

  // The billing strip: the whole cast in tiny print at the very foot.
  ctx.font = `600 ${h * 0.0115}px ${CAPS_FONT}`;
  ctx.fillStyle = 'rgba(247, 241, 227, 0.75)';
  fitText(ctx, COVER_WORDING.billing, w * 0.94, h * 0.0115, 600, CAPS_FONT);
  ctx.fillText(COVER_WORDING.billing, w / 2, h * 0.978);

  // A double frame closes the poster.
  ctx.strokeStyle = '#f7f1e3';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(w * 0.008, h * 0.008, w * 0.984, h * 0.984);
  ctx.strokeStyle = 'rgba(23, 16, 31, 0.85)';
  ctx.lineWidth = Math.max(1.2, w * 0.0022);
  ctx.strokeRect(w * 0.017, h * 0.017, w * 0.966, h * 0.966);
}
