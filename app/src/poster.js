// Poster-ink pipeline for Vice Coast Cover Studio.
// Every photo panel is turned into poster art on canvas: the pixel colours are
// flattened (posterize), re-coloured through a grade's gradient map, then
// overprinted with a halftone dot screen. No network, no library, plain Canvas 2D.

// Five colour grades. Each grade is a 4-stop gradient map from shadow to
// highlight, plus a swatch shown in the grade picker. Vice Blue is the cold
// grade: the warm-only field has nothing like it.
export const POSTER_GRADES = [
  {
    id: 'sunset', name: 'Sunset',
    swatch: 'linear-gradient(90deg,#2b0a3d,#ff2e63,#ff9a3d,#ffe9a8)',
    stops: [[0, 43, 10, 61], [0.38, 163, 20, 74], [0.68, 255, 110, 51], [1, 255, 233, 168]],
  },
  {
    id: 'neon', name: 'Neon',
    swatch: 'linear-gradient(90deg,#12002e,#ff2e88,#00e5ff,#e6fbff)',
    stops: [[0, 18, 0, 46], [0.38, 150, 20, 120], [0.68, 255, 46, 136], [1, 230, 251, 255]],
  },
  {
    id: 'golden', name: 'Golden',
    swatch: 'linear-gradient(90deg,#2a1500,#b25b00,#ffb347,#fff3c4)',
    stops: [[0, 42, 21, 0], [0.38, 150, 70, 0], [0.68, 255, 179, 71], [1, 255, 243, 196]],
  },
  {
    id: 'miami', name: 'Miami',
    swatch: 'linear-gradient(90deg,#03202e,#00b3a6,#ff5ea8,#ffd166)',
    stops: [[0, 3, 32, 46], [0.38, 0, 120, 130], [0.68, 255, 94, 168], [1, 255, 209, 102]],
  },
  {
    id: 'viceblue', name: 'Vice Blue',
    swatch: 'linear-gradient(90deg,#050b26,#1b3a8f,#4d9fff,#cfe8ff)',
    stops: [[0, 5, 11, 38], [0.38, 27, 58, 143], [0.68, 77, 159, 255], [1, 207, 232, 255]],
  },
];

export function gradeById(id) {
  return POSTER_GRADES.find((g) => g.id === id) || POSTER_GRADES[0];
}

// How many poster levels an ink amount gives: 0 ink keeps 8 soft levels,
// full ink flattens the picture to 3 bold levels.
export function posterLevelsForInk(ink) {
  const t = Math.max(0, Math.min(100, ink)) / 100;
  return Math.round(8 - t * 5);
}

function mapThroughStops(stops, lum) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (lum <= b[0] || i === stops.length - 2) {
      const f = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (lum - a[0]) / (b[0] - a[0])));
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3]];
}

// Stylize `source` (canvas or image) into `target` canvas at target size.
// ink 0..100 controls posterize strength, halftone density and gradient-map
// weight. Returns the target canvas.
export function applyPosterGrade(source, target, grade, ink) {
  const w = target.width;
  const h = target.height;
  const ctx = target.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const levels = posterLevelsForInk(ink);
  const weight = 0.35 + (ink / 100) * 0.65; // how far the grade re-colours the photo
  let image;
  try {
    image = ctx.getImageData(0, 0, w, h);
  } catch {
    return target; // tainted canvas: leave the plain draw in place
  }
  const d = image.data;
  const step = 1 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const flat = Math.round(lum * (levels - 1)) * step;
    const [gr, gg, gb] = mapThroughStops(grade.stops, flat);
    d[i] = r + (gr - r) * weight;
    d[i + 1] = g + (gg - g) * weight;
    d[i + 2] = b + (gb - b) * weight;
  }
  ctx.putImageData(image, 0, 0);
  halftoneOverlay(ctx, image, w, h, ink);
  return target;
}

// Halftone dot screen: dark dots whose size follows the shadow under them.
// Drawn after the gradient map, so the dots read as print ink.
export function halftoneOverlay(ctx, image, w, h, ink) {
  if (ink < 8) return;
  const t = ink / 100;
  const spacing = Math.max(5, Math.round(Math.min(w, h) / 90));
  const d = image.data;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 4, 32, 0.85)';
  for (let y = spacing / 2; y < h; y += spacing) {
    for (let x = spacing / 2; x < w; x += spacing) {
      const px = Math.min(w - 1, Math.max(0, Math.round(x)));
      const py = Math.min(h - 1, Math.max(0, Math.round(y)));
      const i = (py * w + px) * 4;
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const darkness = 1 - lum;
      const radius = darkness * darkness * spacing * 0.62 * (0.35 + 0.65 * t);
      if (radius < 0.6) continue;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Light print grain over a finished cover, for a paper-poster feel.
export function addPrintGrain(ctx, w, h, amount) {
  const dots = Math.round(((w * h) / 9000) * amount);
  ctx.save();
  ctx.globalAlpha = 0.10 * amount;
  ctx.fillStyle = '#000';
  for (let i = 0; i < dots; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

// Soft darkening at the cover edges so the title band and panels sit in a frame.
export function addCoverVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,28,0.34)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
