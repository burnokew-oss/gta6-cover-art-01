// The poster pipeline: turns any panel photo into printed-poster art.
// Every panel is posterized into a few flat colour levels, its brightness is
// mapped through a colour gradient ramp, and a halftone dot pattern whose
// dot size follows brightness is laid over it. Five grades, five ramps.

// Each grade: a ramp of [stop 0..1, [r, g, b]] and the dark ink used for
// halftone dots and outlines.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    swatch: 'linear-gradient(90deg,#ff6a3d,#ff2e88,#ffc46b)',
    ink: [26, 8, 34],
    ramp: [
      [0.00, [26, 8, 34]],
      [0.25, [122, 28, 74]],
      [0.50, [214, 74, 62]],
      [0.75, [255, 150, 72]],
      [1.00, [255, 226, 150]],
    ],
  },
  neon: {
    label: 'Neon',
    swatch: 'linear-gradient(90deg,#ff2e88,#7a2cff,#2ee6c8)',
    ink: [12, 4, 36],
    ramp: [
      [0.00, [10, 4, 30]],
      [0.30, [92, 16, 112]],
      [0.55, [214, 32, 142]],
      [0.80, [255, 90, 192]],
      [1.00, [182, 242, 255]],
    ],
  },
  golden: {
    label: 'Golden',
    swatch: 'linear-gradient(90deg,#7a4a10,#ff9a3d,#ffe9a8)',
    ink: [28, 17, 5],
    ramp: [
      [0.00, [26, 15, 5]],
      [0.30, [112, 68, 17]],
      [0.55, [202, 132, 32]],
      [0.80, [255, 192, 82]],
      [1.00, [255, 242, 182]],
    ],
  },
  miami: {
    label: 'Miami',
    swatch: 'linear-gradient(90deg,#0a4a52,#2ee6c8,#ff5a8a)',
    ink: [4, 26, 34],
    ramp: [
      [0.00, [4, 28, 36]],
      [0.30, [16, 112, 122]],
      [0.55, [42, 192, 172]],
      [0.80, [255, 112, 152]],
      [1.00, [255, 222, 202]],
    ],
  },
  viceblue: {
    label: 'Vice Blue',
    swatch: 'linear-gradient(90deg,#0a1a4a,#2a6aff,#bfe6ff)',
    ink: [4, 9, 32],
    ramp: [
      [0.00, [4, 9, 28]],
      [0.30, [22, 52, 112]],
      [0.55, [52, 112, 202]],
      [0.80, [122, 192, 255]],
      [1.00, [222, 242, 255]],
    ],
  },
};

export const GRADE_IDS = Object.keys(GRADES);

// Interpolate a colour along a grade's ramp.
export function rampColour(grade, t) {
  const stops = grade.ramp;
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (clamped <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (clamped - t0) / (t1 - t0 || 1);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return stops[stops.length - 1][1].slice();
}

// Draw an image (or canvas) into a panel-sized canvas with a cover-fit
// crop, then posterize it. crop: { zoom, panX, panY, flip } with pan in
// [-1, 1]. ink 0 leaves the photo untouched; ink 1 is full poster art.
export function posterizePanel(source, width, height, gradeId, ink, crop) {
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(width));
  canvas.height = Math.max(2, Math.round(height));
  const ctx = canvas.getContext('2d');
  const iw = source.naturalWidth || source.width;
  const ih = source.naturalHeight || source.height;
  const zoom = crop?.zoom ?? 1;
  const panX = crop?.panX ?? 0;
  const panY = crop?.panY ?? 0;
  const flip = crop?.flip ?? false;
  const scale = Math.max(canvas.width / iw, canvas.height / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (canvas.width - dw) / 2 + (panX * (dw - canvas.width)) / 2;
  const dy = (canvas.height - dh) / 2 + (panY * (dh - canvas.height)) / 2;
  ctx.save();
  if (flip) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, dx, dy, dw, dh);
  ctx.restore();

  if (ink <= 0.01) return canvas;

  // Posterize + ramp, per pixel.
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const levels = 5;
  const flat = ink * 0.85; // how much of the flat poster level shows
  const tint = ink * 0.8; // how much of the ramp colour shows
  // A small lookup table keeps the per-pixel loop fast.
  const table = new Uint8Array(256 * 3);
  for (let v = 0; v < 256; v++) {
    const lum = v / 255;
    const stepped = (Math.floor(lum * levels) + 0.5) / levels;
    const mixed = lum * (1 - flat) + stepped * flat;
    const [r, g, b] = rampColour(grade, mixed);
    table[v * 3] = r;
    table[v * 3 + 1] = g;
    table[v * 3 + 2] = b;
  }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const t = lum * 3;
    data[i] = Math.round(r * (1 - tint) + table[t] * tint);
    data[i + 1] = Math.round(g * (1 - tint) + table[t + 1] * tint);
    data[i + 2] = Math.round(b * (1 - tint) + table[t + 2] * tint);
  }
  ctx.putImageData(image, 0, 0);

  // Halftone dots: dot size follows brightness — big dots in the darks,
  // tiny dots in the lights. Laid over the posterized panel, sampling the
  // pixel data we already hold instead of re-reading the canvas per cell.
  const cell = Math.max(4, Math.round(canvas.width / 150));
  const [ir, ig, ib] = grade.ink;
  const cw = canvas.width;
  ctx.fillStyle = `rgb(${ir},${ig},${ib})`;
  ctx.globalAlpha = 0.30 * ink + 0.10;
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      const p = (y * cw + x) * 4;
      const lum = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
      const radius = (cell * 0.52 * (1 - lum)) * ink;
      if (radius < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}
