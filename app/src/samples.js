// Procedural sample photos for Vice Coast Cover Studio.
// Every sample scene is drawn with canvas code — no photo of a real person,
// no image from the internet, nothing downloaded. The poster-ink pipeline
// turns these flat vector scenes into striking poster panels.

function sky(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function sunDisc(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function palmTree(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -60, 26, -108);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.15) - (i * Math.PI) / 7.2;
    const tx = 26 + Math.cos(a) * 52;
    const ty = -108 + Math.sin(a) * 30 + 12;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(26, -108);
    ctx.quadraticCurveTo(26 + Math.cos(a) * 30, -108 + Math.sin(a) * 12, tx, ty);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(30, -104, 7, 0, Math.PI * 2);
  ctx.arc(20, -100, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function cityRow(ctx, w, baseY, hMin, hMax, color, lit) {
  let x = 0;
  while (x < w) {
    const bw = 40 + Math.random() * 70;
    const bh = hMin + Math.random() * (hMax - hMin);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (lit) {
      ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
      for (let wy = baseY - bh + 10; wy < baseY - 12; wy += 18) {
        for (let wx = x + 8; wx < x + bw - 10; wx += 16) {
          if (Math.random() < 0.4) ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
    x += bw + 4;
  }
}

function convertible(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-150, 0);
  ctx.lineTo(-120, -34);
  ctx.lineTo(-58, -40);
  ctx.lineTo(-30, -8);
  ctx.lineTo(52, -8);
  ctx.lineTo(96, -38);
  ctx.lineTo(140, -30);
  ctx.lineTo(155, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-92, 2, 26, 0, Math.PI * 2);
  ctx.arc(92, 2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(-92, 2, 10, 0, Math.PI * 2);
  ctx.arc(92, 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roadPerspective(ctx, w, h, horizonY) {
  ctx.fillStyle = '#1c1233';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.42, horizonY);
  ctx.lineTo(w * 0.58, horizonY);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const y = horizonY + (h - horizonY) * t * t;
    const lw = 4 + t * 14;
    ctx.fillRect(w / 2 - lw / 2, y, lw, 10 + t * 26);
  }
}

export const SAMPLE_SCENES = [
  {
    id: 'boulevard', name: 'Sunset Boulevard',
    draw(ctx, w, h) {
      sky(ctx, w, h, [[0, '#ff9a3d'], [0.45, '#ff5e78'], [0.75, '#7b2ff7'], [1, '#2b0a3d']]);
      sunDisc(ctx, w * 0.5, h * 0.42, w * 0.11, '#ffe9a8');
      ctx.fillStyle = '#3d1458';
      cityRow(ctx, w, h * 0.62, h * 0.08, h * 0.2, '#3d1458', false);
      roadPerspective(ctx, w, h, h * 0.62);
      palmTree(ctx, w * 0.08, h * 0.66, w / 900, '#14082b');
      palmTree(ctx, w * 0.9, h * 0.62, w / 780, '#14082b');
      palmTree(ctx, w * 0.16, h * 0.6, w / 1300, '#241040');
      convertible(ctx, w * 0.5, h * 0.86, w / 900, '#0d0518');
    },
  },
  {
    id: 'palms', name: 'Palm Dusk',
    draw(ctx, w, h) {
      sky(ctx, w, h, [[0, '#2b0a3d'], [0.5, '#c22a6e'], [0.8, '#ff7a18'], [1, '#ffd166']]);
      sunDisc(ctx, w * 0.68, h * 0.55, w * 0.13, '#fff3c4');
      ctx.fillStyle = '#123a5c';
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      ctx.fillStyle = 'rgba(255, 233, 168, 0.5)';
      ctx.fillRect(0, h * 0.62, w, 4);
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = 'rgba(255, 220, 140, 0.35)';
        ctx.fillRect(Math.random() * w, h * 0.64 + Math.random() * h * 0.3, 30 + Math.random() * 60, 3);
      }
      palmTree(ctx, w * 0.16, h * 0.66, w / 620, '#0d0518');
      palmTree(ctx, w * 0.34, h * 0.68, w / 800, '#0d0518');
      palmTree(ctx, w * 0.84, h * 0.64, w / 700, '#0d0518');
    },
  },
  {
    id: 'neon', name: 'Neon Street',
    draw(ctx, w, h) {
      sky(ctx, w, h, [[0, '#050b26'], [0.6, '#12083a'], [1, '#2a0a4d']]);
      cityRow(ctx, w, h * 0.58, h * 0.2, h * 0.46, '#0a0618', true);
      const signs = ['#ff2e88', '#00e5ff', '#ffd166', '#7b2ff7', '#ff5e78'];
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = signs[i % signs.length];
        const sx = 20 + i * (w / 7.4);
        ctx.fillRect(sx, h * (0.18 + (i % 3) * 0.1), 14, h * 0.22);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(sx - 6, h * (0.18 + (i % 3) * 0.1) - 6, 26, h * 0.22 + 12);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#0d0b1e';
      ctx.fillRect(0, h * 0.58, w, h * 0.42);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = signs[i % signs.length];
        ctx.globalAlpha = 0.25 + Math.random() * 0.3;
        ctx.fillRect(Math.random() * w, h * 0.6 + Math.random() * h * 0.36, 4 + Math.random() * 22, 3);
      }
      ctx.globalAlpha = 1;
      convertible(ctx, w * 0.5, h * 0.88, w / 1000, '#000');
      ctx.fillStyle = '#ff2e88';
      ctx.fillRect(w * 0.32, h * 0.9, w * 0.36, 5);
    },
  },
  {
    id: 'pier', name: 'Pier Morning',
    draw(ctx, w, h) {
      sky(ctx, w, h, [[0, '#7fe3d0'], [0.45, '#2fa8a0'], [0.7, '#ffb347'], [1, '#ff7a18']]);
      sunDisc(ctx, w * 0.3, h * 0.3, w * 0.09, '#fff8dc');
      ctx.fillStyle = '#0e5f7a';
      ctx.fillRect(0, h * 0.52, w, h * 0.48);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(w * (0.05 + i * 0.12), h * (0.56 + (i % 3) * 0.09), w * 0.09, 4);
      }
      ctx.fillStyle = '#5a3a22';
      ctx.beginPath();
      ctx.moveTo(w * 0.42, h);
      ctx.lineTo(w * 0.48, h * 0.52);
      ctx.lineTo(w * 0.52, h * 0.52);
      ctx.lineTo(w * 0.58, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3d2716';
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const t = i / 9;
        const y = h * 0.52 + (h * 0.48) * t;
        ctx.beginPath();
        ctx.moveTo(w * (0.48 - 0.06 * t), y);
        ctx.lineTo(w * (0.52 + 0.06 * t), y);
        ctx.stroke();
      }
      palmTree(ctx, w * 0.86, h * 0.56, w / 900, '#0d2b1e');
    },
  },
  {
    id: 'skyline', name: 'Skyline Gold',
    draw(ctx, w, h) {
      sky(ctx, w, h, [[0, '#ffd166'], [0.5, '#ff9a3d'], [0.8, '#c22a6e'], [1, '#4a1042']]);
      sunDisc(ctx, w * 0.5, h * 0.5, w * 0.12, '#fff3c4');
      cityRow(ctx, w, h * 0.78, h * 0.18, h * 0.5, '#1c0b2e', true);
      ctx.fillStyle = '#12061f';
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
      ctx.strokeStyle = '#12061f';
      ctx.lineWidth = 3;
      for (const [bx, by, s] of [[0.2, 0.2, 1], [0.3, 0.14, 0.7], [0.72, 0.18, 0.9]]) {
        const x = w * bx;
        const y = h * by;
        ctx.beginPath();
        ctx.moveTo(x - 14 * s, y);
        ctx.quadraticCurveTo(x, y - 10 * s, x + 14 * s, y);
        ctx.stroke();
      }
    },
  },
  {
    id: 'cruiser', name: 'Beach Cruiser',
    draw(ctx, w, h) {
      sky(ctx, w, h, [[0, '#4d9fff'], [0.5, '#7fe3d0'], [0.72, '#ffe9a8'], [1, '#ffd166']]);
      sunDisc(ctx, w * 0.78, h * 0.24, w * 0.08, '#fff8dc');
      ctx.fillStyle = '#0e7a8a';
      ctx.fillRect(0, h * 0.58, w, h * 0.18);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.08 + i * 0.16), h * (0.62 + (i % 2) * 0.06), w * 0.1, 4);
      ctx.fillStyle = '#f2d8a0';
      ctx.fillRect(0, h * 0.76, w, h * 0.24);
      palmTree(ctx, w * 0.1, h * 0.8, w / 750, '#14301f');
      convertible(ctx, w * 0.52, h * 0.9, w / 850, '#8f1d2e');
    },
  },
];

// Draw one sample scene onto a fresh canvas and return it.
export function makeSamplePhoto(scene, w = 900, h = 900) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  scene.draw(ctx, w, h);
  return canvas;
}
