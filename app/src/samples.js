// Original sample scenes for Vice Coast Cover Studio.
// Every scene is drawn procedurally by this file's own drawing code — no
// photo, no stock art, no Rockstar artwork. Each scene is layered like a
// photograph: a soft sky, a mid-ground, a sharp foreground, then grain, a
// vignette and a colour wash so it reads as a photo at a glance, never as
// flat geometric illustration.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Soft radial glow: a bright core fading to transparent.
function glow(ctx, x, y, r, colour, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Fine random grain over the whole scene, like film grain.
function grain(ctx, w, h, rng, amount) {
  const nw = 180, nh = 120;
  const noise = document.createElement('canvas');
  noise.width = nw; noise.height = nh;
  const nctx = noise.getContext('2d');
  const id = nctx.createImageData(nw, nh);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = (rng() * 255) | 0;
    id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  nctx.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(noise, 0, 0, w, h);
  ctx.restore();
}

// Darkened corners, as a camera lens leaves them.
function vignette(ctx, w, h, strength) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function wash(ctx, w, h, colour, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function finishPhoto(ctx, w, h, rng, washColour, washAlpha) {
  wash(ctx, w, h, washColour, washAlpha);
  grain(ctx, w, h, rng, 0.10);
  vignette(ctx, w, h, 0.34);
}

// A soft-edged ellipse, blurred like an out-of-focus shape.
function softEllipse(ctx, x, y, rx, ry, colour, alpha, blur) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// One palm tree silhouette. Fronds are many thin arcs so the crown reads as
// leaves, not a flat star.
function palm(ctx, x, y, s, rng, colour, blur) {
  ctx.save();
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  // Trunk, gently curved.
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.06, y - s * 0.5, x + s * 0.16, y - s * 0.92);
  ctx.stroke();
  const topX = x + s * 0.16, topY = y - s * 0.92;
  // Fronds.
  ctx.lineWidth = s * 0.045;
  for (let i = 0; i < 9; i++) {
    const a = (-Math.PI * 0.15) - (i / 8) * Math.PI * 0.7 + (rng() - 0.5) * 0.12;
    const len = s * (0.42 + rng() * 0.18);
    const droop = s * (0.10 + rng() * 0.22);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.55,
      topX + Math.cos(a) * len, topY + Math.sin(a) * len * 0.6 + droop,
    );
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - s * 0.03, topY + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.04, topY + s * 0.05, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A walking person, drawn as a soft dark silhouette with a long shadow.
function walker(ctx, x, y, s, rng, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = s * 0.06;
  // Head.
  ctx.beginPath();
  ctx.arc(x, y - s * 0.86, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Torso, drawn as a solid shape so the figure has a body, not a line.
  ctx.lineWidth = s * 0.17;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.76);
  ctx.lineTo(x + s * 0.02, y - s * 0.42);
  ctx.stroke();
  // Legs, mid-stride.
  ctx.lineWidth = s * 0.085;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.02, y - s * 0.42);
  ctx.lineTo(x - s * 0.14, y);
  ctx.moveTo(x + s * 0.02, y - s * 0.42);
  ctx.lineTo(x + s * 0.18, y - s * 0.04);
  ctx.stroke();
  // Arms, swinging.
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.7);
  ctx.lineTo(x - s * 0.16, y - s * 0.5);
  ctx.moveTo(x, y - s * 0.7);
  ctx.lineTo(x + s * 0.14, y - s * 0.56);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- beach ---
function drawBeach(ctx, w, h, rng) {
  const horizon = h * 0.44;
  // Sky: deep violet at the top, burning orange at the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.45, '#7a2a6d');
  sky.addColorStop(0.8, '#ff6a3d');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 2);
  // Sun low over the water: a soft disc (bright core, fading edge) inside
  // a wide haze, so it reads as a photographed sun, not a flat circle.
  const sunX = w * 0.62, sunY = horizon - h * 0.05;
  glow(ctx, sunX, sunY, w * 0.30, '#ffd98a', 0.85);
  glow(ctx, sunX, sunY, w * 0.13, '#fff3c4', 0.95);
  const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.065);
  disc.addColorStop(0, '#fffbe0');
  disc.addColorStop(0.75, '#fff0b8');
  disc.addColorStop(1, 'rgba(255,240,184,0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sunX, sunY, h * 0.065, 0, Math.PI * 2);
  ctx.fill();
  // Soft clouds, blurred, catching the pink light.
  for (let i = 0; i < 7; i++) {
    const cx = rng() * w, cy = h * (0.06 + rng() * 0.28);
    softEllipse(ctx, cx, cy, w * (0.08 + rng() * 0.10), h * (0.015 + rng() * 0.02),
      i % 2 ? '#e87a9a' : '#c96bb0', 0.28 + rng() * 0.2, 6);
  }
  // Birds, far away.
  ctx.strokeStyle = 'rgba(40,16,50,0.8)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const bx = w * (0.1 + rng() * 0.5), by = h * (0.08 + rng() * 0.16);
    const s = 5 + rng() * 6;
    ctx.beginPath();
    ctx.moveTo(bx - s, by); ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.6, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.6, bx + s, by);
    ctx.stroke();
  }
  // Sea: dark mauve at the top, a glittering sun path below.
  const sea = ctx.createLinearGradient(0, horizon, 0, h * 0.60);
  sea.addColorStop(0, '#5a2a55');
  sea.addColorStop(0.5, '#8a4a52');
  sea.addColorStop(1, '#c97a4a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h * 0.16);
  // A thin haze band hugs the horizon, so the sea melts into the sky.
  softEllipse(ctx, w * 0.5, horizon, w * 0.55, h * 0.02, '#ffb27a', 0.35, 8);
  // Sun glitter on the water: many short bright dashes near the sun's column.
  for (let i = 0; i < 90; i++) {
    const spread = (1 - (rng() * rng())) * w * 0.16;
    const gx = sunX + (rng() - 0.5) * 2 * spread * (0.4 + rng());
    const gy = horizon + rng() * h * 0.15;
    const len = 6 + rng() * 26;
    ctx.strokeStyle = `rgba(255,${200 + ((rng() * 40) | 0)},140,${0.25 + rng() * 0.55})`;
    ctx.lineWidth = 1 + rng() * 1.6;
    ctx.beginPath();
    ctx.moveTo(gx - len / 2, gy);
    ctx.lineTo(gx + len / 2, gy);
    ctx.stroke();
  }
  // Wet sand with the sun's reflection, then dry sand.
  const sand = ctx.createLinearGradient(0, h * 0.60, 0, h);
  sand.addColorStop(0, '#d98a52');
  sand.addColorStop(0.35, '#e8a06a');
  sand.addColorStop(1, '#9a5a34');
  ctx.fillStyle = sand;
  ctx.fillRect(0, h * 0.60, w, h * 0.40);
  // Wet band: a mirror of the sun on the sand.
  glow(ctx, sunX, h * 0.66, w * 0.16, '#ffcf8a', 0.5);
  for (let i = 0; i < 40; i++) {
    const gx = sunX + (rng() - 0.5) * w * 0.22;
    const gy = h * (0.60 + rng() * 0.07);
    ctx.strokeStyle = `rgba(255,220,160,${0.2 + rng() * 0.35})`;
    ctx.lineWidth = 1 + rng();
    ctx.beginPath();
    ctx.moveTo(gx - 8 - rng() * 14, gy);
    ctx.lineTo(gx + 8 + rng() * 14, gy);
    ctx.stroke();
  }
  // Palm on the left, and its long shadow reaching across the sand —
  // blurred and soft, as a real low-sun shadow is.
  ctx.save();
  ctx.filter = 'blur(7px)';
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = '#3a1a22';
  ctx.beginPath();
  ctx.moveTo(w * 0.10, h * 0.98);
  ctx.lineTo(w * 0.30, h * 0.66);
  ctx.lineTo(w * 0.46, h * 0.68);
  ctx.lineTo(w * 0.24, h * 0.99);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  palm(ctx, w * 0.09, h * 0.99, h * 0.52, rng, '#24101e', 0);
  // Second, smaller palm further down the beach, slightly hazed.
  palm(ctx, w * 0.90, h * 0.86, h * 0.30, rng, '#3a1c28', 1);
  // Two people walking along the waterline, with long shadows.
  const p1x = w * 0.46, p1y = h * 0.80, p1s = h * 0.115;
  const p2x = w * 0.545, p2y = h * 0.815, p2s = h * 0.105;
  for (const [px, py, ps] of [[p1x, p1y, p1s], [p2x, p2y, p2s]]) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#2a1218';
    ctx.beginPath();
    ctx.moveTo(px - ps * 0.2, py);
    ctx.lineTo(px - ps * 1.5, py + ps * 0.28);
    ctx.lineTo(px - ps * 1.1, py + ps * 0.34);
    ctx.lineTo(px + ps * 0.25, py + ps * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    walker(ctx, px, py, ps, rng, '#1d0c16');
  }
  // Footprints trailing behind them.
  for (let i = 0; i < 12; i++) {
    const fx = p1x - i * w * 0.012 - rng() * 4;
    const fy = p1y + i * h * 0.004 + (i % 2 ? 3 : -3);
    ctx.fillStyle = 'rgba(60,25,20,0.5)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 3, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sand speckle.
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(${120 + ((rng() * 80) | 0)},60,30,${0.12 + rng() * 0.2})`;
    ctx.fillRect(rng() * w, h * (0.62 + rng() * 0.38), 1.4, 1.4);
  }
  finishPhoto(ctx, w, h, rng, '#ff8a3d', 0.07);
}

// ----------------------------------------------------------------- neon ---
function drawNeon(ctx, w, h, rng) {
  // Night sky, deep indigo to purple.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, '#070418');
  sky.addColorStop(0.7, '#1c0b38');
  sky.addColorStop(1, '#3d1450');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.55);
  // Far buildings, hazed and blurred.
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.globalAlpha = 0.75;
  for (let x = 0; x < w; x += w * 0.09) {
    const bw = w * (0.05 + rng() * 0.04);
    const bh = h * (0.18 + rng() * 0.22);
    ctx.fillStyle = '#241040';
    ctx.fillRect(x, h * 0.52 - bh, bw, bh);
  }
  ctx.restore();
  // Near buildings left and right, dark with lit windows.
  const near = (x0, x1) => {
    let x = x0;
    while (x < x1) {
      const bw = w * (0.07 + rng() * 0.06);
      const bh = h * (0.22 + rng() * 0.26);
      ctx.fillStyle = '#0e071e';
      ctx.fillRect(x, h * 0.55 - bh, bw, bh);
      // Lit windows.
      for (let wy = h * 0.55 - bh + 8; wy < h * 0.52; wy += 14) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 12) {
          if (rng() < 0.42) {
            const warm = rng() < 0.7;
            ctx.fillStyle = warm
              ? `rgba(255,${190 + ((rng() * 50) | 0)},90,${0.5 + rng() * 0.5})`
              : `rgba(120,220,255,${0.5 + rng() * 0.5})`;
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      x += bw + 4;
    }
  };
  near(0, w * 0.24);
  near(w * 0.76, w);
  // Neon signs: glowing bars with short words.
  const sign = (x, y, sw, sh, colour, text) => {
    glow(ctx, x + sw / 2, y + sh / 2, sw, colour, 0.8);
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = 16;
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, sw, sh);
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.round(sh * 0.5)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + sw / 2, y + sh / 2 + 1);
    ctx.restore();
  };
  sign(w * 0.03, h * 0.16, w * 0.10, h * 0.075, '#ff2e88', 'BAR');
  sign(w * 0.86, h * 0.12, w * 0.11, h * 0.075, '#2ee6c8', '24H');
  sign(w * 0.79, h * 0.30, w * 0.07, h * 0.14, '#ff7a18', 'HOTEL');
  // Sidewalk.
  const walk = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.68);
  walk.addColorStop(0, '#241a33');
  walk.addColorStop(1, '#120c1e');
  ctx.fillStyle = walk;
  ctx.fillRect(0, h * 0.55, w, h * 0.13);
  // Wet road.
  const road = ctx.createLinearGradient(0, h * 0.68, 0, h);
  road.addColorStop(0, '#171024');
  road.addColorStop(1, '#05030c');
  ctx.fillStyle = road;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  // Neon reflections on the wet road: long vertical streaks, blurred.
  ctx.save();
  ctx.filter = 'blur(3px)';
  const streaks = [
    [w * 0.08, '#ff2e88', 0.75], [w * 0.20, '#ff2e88', 0.4],
    [w * 0.82, '#2ee6c8', 0.75], [w * 0.90, '#ff7a18', 0.5],
    [w * 0.50, '#ff2e88', 0.35], [w * 0.64, '#7a5cff', 0.45],
  ];
  for (const [sx, colour, a] of streaks) {
    ctx.globalAlpha = a;
    ctx.fillStyle = colour;
    ctx.fillRect(sx - 5, h * 0.68, 10, h * (0.18 + rng() * 0.14));
  }
  ctx.restore();
  // Puddle highlights.
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(200,220,255,${0.08 + rng() * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(rng() * w, h * (0.70 + rng() * 0.26), 8 + rng() * 26, 2 + rng() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glossy car, centre, side profile with neon underglow.
  const cx = w * 0.5, cy = h * 0.82, cw = w * 0.46, ch = h * 0.13;
  glow(ctx, cx, cy + ch * 0.7, cw * 0.55, '#ff2e88', 0.5);
  ctx.save();
  // Body.
  const body = ctx.createLinearGradient(cx - cw / 2, cy - ch, cx + cw / 2, cy + ch);
  body.addColorStop(0, '#3d0a3d');
  body.addColorStop(0.4, '#a3135f');
  body.addColorStop(0.75, '#2a0a2e');
  body.addColorStop(1, '#12060f');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx - cw / 2, cy + ch * 0.55);
  ctx.lineTo(cx - cw * 0.46, cy - ch * 0.15);
  ctx.quadraticCurveTo(cx - cw * 0.30, cy - ch * 0.55, cx - cw * 0.08, cy - ch * 0.62);
  ctx.lineTo(cx + cw * 0.18, cy - ch * 0.62);
  ctx.quadraticCurveTo(cx + cw * 0.38, cy - ch * 0.5, cx + cw * 0.48, cy - ch * 0.05);
  ctx.quadraticCurveTo(cx + cw * 0.52, cy + ch * 0.35, cx + cw * 0.44, cy + ch * 0.55);
  ctx.closePath();
  ctx.fill();
  // Cabin glass.
  const glass = ctx.createLinearGradient(cx - cw * 0.2, cy - ch * 0.6, cx + cw * 0.2, cy);
  glass.addColorStop(0, '#9fd8ff');
  glass.addColorStop(0.5, '#3d6a8a');
  glass.addColorStop(1, '#12222e');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.26, cy - ch * 0.18);
  ctx.quadraticCurveTo(cx - cw * 0.10, cy - ch * 0.52, cx + cw * 0.06, cy - ch * 0.52);
  ctx.lineTo(cx + cw * 0.24, cy - ch * 0.18);
  ctx.closePath();
  ctx.fill();
  // Neon streak reflected along the body.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,90,190,0.9)';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.42, cy + ch * 0.1);
  ctx.quadraticCurveTo(cx, cy - ch * 0.05, cx + cw * 0.42, cy + ch * 0.05);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,230,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.40, cy + ch * 0.3);
  ctx.lineTo(cx + cw * 0.40, cy + ch * 0.28);
  ctx.stroke();
  // Headlight beam.
  glow(ctx, cx + cw * 0.48, cy + ch * 0.1, 26, '#fff6c8', 0.9);
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(cx + cw * 0.48, cy + ch * 0.1, 5, 0, Math.PI * 2);
  ctx.fill();
  // Wheels.
  for (const wx of [cx - cw * 0.30, cx + cw * 0.30]) {
    ctx.fillStyle = '#050308';
    ctx.beginPath();
    ctx.arc(wx, cy + ch * 0.5, ch * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8c8d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, cy + ch * 0.5, ch * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Pedestrians on the sidewalk, soft silhouettes.
  walker(ctx, w * 0.16, h * 0.66, h * 0.10, rng, '#0a0514');
  walker(ctx, w * 0.235, h * 0.665, h * 0.09, rng, '#0d0618');
  walker(ctx, w * 0.72, h * 0.66, h * 0.095, rng, '#0a0514');
  // Street lamp with a cone of light.
  ctx.strokeStyle = '#1c1430';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.68, h * 0.68);
  ctx.lineTo(w * 0.68, h * 0.30);
  ctx.stroke();
  glow(ctx, w * 0.68, h * 0.29, 30, '#ffd98a', 0.9);
  const cone = ctx.createLinearGradient(0, h * 0.30, 0, h * 0.68);
  cone.addColorStop(0, 'rgba(255,217,138,0.20)');
  cone.addColorStop(1, 'rgba(255,217,138,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(w * 0.68, h * 0.30);
  ctx.lineTo(w * 0.60, h * 0.68);
  ctx.lineTo(w * 0.76, h * 0.68);
  ctx.closePath();
  ctx.fill();
  finishPhoto(ctx, w, h, rng, '#2a0a4d', 0.06);
}

// ----------------------------------------------------------------- coast ---
function drawCoast(ctx, w, h, rng) {
  // Golden-hour sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, '#ffcf7a');
  sky.addColorStop(0.55, '#ff9a3d');
  sky.addColorStop(1, '#e05a6a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.5);
  // Sun glare, upper right — a soft disc inside a wide haze.
  const sunX = w * 0.78, sunY = h * 0.16;
  glow(ctx, sunX, sunY, w * 0.34, '#fff0b8', 0.9);
  glow(ctx, sunX, sunY, w * 0.12, '#fffbe0', 1);
  const sunDisc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.06);
  sunDisc.addColorStop(0, '#fffbe0');
  sunDisc.addColorStop(0.7, '#ffedb0');
  sunDisc.addColorStop(1, 'rgba(255,237,176,0)');
  ctx.fillStyle = sunDisc;
  ctx.beginPath();
  ctx.arc(sunX, sunY, h * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Thin warm clouds.
  for (let i = 0; i < 6; i++) {
    softEllipse(ctx, rng() * w, h * (0.08 + rng() * 0.3), w * (0.10 + rng() * 0.12),
      h * 0.014, '#ffd9a0', 0.35, 5);
  }
  // Sea on the left, catching the sun. Its edge is a diagonal coastline,
  // not a hard rectangle, so the water meets the land like a real shore.
  const sea = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.72);
  sea.addColorStop(0, '#2a6a8a');
  sea.addColorStop(0.5, '#3d8aa8');
  sea.addColorStop(1, '#c98a4a');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w * 0.46, h * 0.5);
  ctx.lineTo(w * 0.33, h * 0.72);
  ctx.lineTo(0, h * 0.72);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 60; i++) {
    const gx = w * (0.05 + rng() * 0.28); // stays left of the coastline
    const gy = h * (0.52 + rng() * 0.18);
    ctx.strokeStyle = `rgba(255,220,150,${0.2 + rng() * 0.45})`;
    ctx.lineWidth = 1 + rng();
    ctx.beginPath();
    ctx.moveTo(gx - 6 - rng() * 16, gy);
    ctx.lineTo(gx + 6 + rng() * 16, gy);
    ctx.stroke();
  }
  // Distant headland, hazed.
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.fillStyle = 'rgba(120,60,70,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.52);
  ctx.quadraticCurveTo(w * 0.2, h * 0.42, w * 0.44, h * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The road: a perspective trapezoid from the horizon to the viewer.
  const horizonY = h * 0.52;
  const vanishX = w * 0.58;
  ctx.fillStyle = '#2e2a33';
  ctx.beginPath();
  ctx.moveTo(vanishX - w * 0.02, horizonY);
  ctx.lineTo(vanishX + w * 0.02, horizonY);
  ctx.lineTo(w * 0.98, h);
  ctx.lineTo(w * 0.10, h);
  ctx.closePath();
  ctx.fill();
  // Warm light washing the road's right edge.
  const edge = ctx.createLinearGradient(w * 0.5, 0, w, 0);
  edge.addColorStop(0, 'rgba(255,170,80,0)');
  edge.addColorStop(1, 'rgba(255,170,80,0.28)');
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.moveTo(vanishX + w * 0.02, horizonY);
  ctx.lineTo(w * 0.98, h);
  ctx.lineTo(w * 0.86, h);
  ctx.lineTo(vanishX + w * 0.015, horizonY);
  ctx.closePath();
  ctx.fill();
  // Centre dashes, converging to the horizon.
  ctx.fillStyle = '#ffd98a';
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const y0 = lerp(horizonY, h, t * t);
    const y1 = lerp(horizonY, h, Math.min(1, (t + 0.09) * (t + 0.09)));
    const cx = lerp(vanishX, w * 0.54, t * t);
    const halfW = lerp(1, 7, t * t);
    ctx.save();
    ctx.globalAlpha = 0.9 - t * 0.3;
    ctx.fillRect(cx - halfW, y0, halfW * 2, Math.max(2, y1 - y0));
    ctx.restore();
  }
  // A distant car on the road, small, headlights on.
  const carX = w * 0.565, carY = h * 0.60, carS = h * 0.022;
  glow(ctx, carX, carY, 10, '#fff2b0', 0.8);
  ctx.fillStyle = '#1c1420';
  ctx.beginPath();
  ctx.ellipse(carX, carY, carS * 1.2, carS * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff2b0';
  ctx.beginPath();
  ctx.arc(carX - carS * 0.5, carY + carS * 0.2, 1.6, 0, Math.PI * 2);
  ctx.arc(carX + carS * 0.5, carY + carS * 0.2, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Palm trees lining the road: far ones soft and hazed, near ones sharp.
  const palmsLeft = [0.86, 0.70, 0.58, 0.50];
  const palmsRight = [0.88, 0.74, 0.63, 0.55];
  palmsLeft.forEach((t, i) => {
    const px = lerp(vanishX - w * 0.05, w * 0.02, t * t);
    const py = lerp(horizonY, h * 0.98, t * t);
    const ps = lerp(h * 0.10, h * 0.46, t * t);
    palm(ctx, px, py, ps, rng, i < 2 ? '#5a2a30' : '#241018', i < 2 ? 2 : 0);
  });
  palmsRight.forEach((t, i) => {
    const px = lerp(vanishX + w * 0.05, w * 1.0, t * t);
    const py = lerp(horizonY, h * 0.98, t * t);
    const ps = lerp(h * 0.10, h * 0.48, t * t);
    palm(ctx, px, py, ps, rng, i < 2 ? '#5a2a30' : '#22101a', i < 2 ? 2 : 0);
  });
  // Sandy verge on the right, with tufts of grass.
  ctx.fillStyle = '#b98a52';
  ctx.beginPath();
  ctx.moveTo(w * 0.86, h * 0.72);
  ctx.quadraticCurveTo(w * 0.95, h * 0.85, w, h);
  ctx.lineTo(w * 0.86, h);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 40; i++) {
    const gx = w * (0.88 + rng() * 0.11);
    const gy = h * (0.74 + rng() * 0.24);
    ctx.strokeStyle = `rgba(60,80,30,${0.4 + rng() * 0.4})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + (rng() - 0.5) * 6, gy - 5 - rng() * 7);
    ctx.stroke();
  }
  finishPhoto(ctx, w, h, rng, '#ff9a3d', 0.08);
}

// --------------------------------------------------------------- skyline ---
function drawSkyline(ctx, w, h, rng) {
  // Dusk sky: deep blue above, a band of orange at the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#070d26');
  sky.addColorStop(0.5, '#16224e');
  sky.addColorStop(0.8, '#6a3a5e');
  sky.addColorStop(1, '#e07a4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.62);
  // Early stars.
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rng() * 0.6})`;
    ctx.fillRect(rng() * w, rng() * h * 0.3, 1.4, 1.4);
  }
  // Moon with a soft halo.
  glow(ctx, w * 0.82, h * 0.12, w * 0.10, '#e8ecff', 0.7);
  ctx.fillStyle = '#f2f4ff';
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.12, h * 0.028, 0, Math.PI * 2);
  ctx.fill();
  // Far skyline, blurred and lighter.
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.fillStyle = 'rgba(58,52,96,0.85)';
  let x = 0;
  while (x < w) {
    const bw = w * (0.04 + rng() * 0.05);
    const bh = h * (0.16 + rng() * 0.20);
    ctx.fillRect(x, h * 0.62 - bh, bw, bh);
    x += bw + w * 0.012;
  }
  ctx.restore();
  // Near skyline, sharp and dark, with hundreds of lit windows.
  const lit = [];
  x = -4;
  while (x < w + 4) {
    const bw = w * (0.05 + rng() * 0.07);
    const bh = h * (0.24 + rng() * 0.30);
    const top = h * 0.62 - bh;
    ctx.fillStyle = '#0b0817';
    ctx.fillRect(x, top, bw, bh);
    // Rooftop details: antenna or water tower on some buildings.
    if (rng() < 0.3) {
      ctx.strokeStyle = '#0b0817';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + bw / 2, top);
      ctx.lineTo(x + bw / 2, top - h * 0.05);
      ctx.stroke();
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath();
      ctx.arc(x + bw / 2, top - h * 0.05, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let wy = top + 10; wy < h * 0.60; wy += 13) {
      for (let wx = x + 7; wx < x + bw - 8; wx += 11) {
        if (rng() < 0.38) {
          const warm = rng() < 0.8;
          const col = warm
            ? `rgba(255,${180 + ((rng() * 55) | 0)},90,${0.55 + rng() * 0.45})`
            : `rgba(140,220,255,${0.55 + rng() * 0.45})`;
          ctx.fillStyle = col;
          ctx.fillRect(wx, wy, 5, 7);
          if (rng() < 0.12) lit.push([wx + 2.5, wy + 3.5]);
        }
      }
    }
    x += bw + w * 0.008;
  }
  // A few windows glow a little wider.
  for (const [lx, ly] of lit) glow(ctx, lx, ly, 12, '#ffd98a', 0.5);
  // Water in the foreground, dark, with the city's lights reflected.
  const water = ctx.createLinearGradient(0, h * 0.62, 0, h);
  water.addColorStop(0, '#141024');
  water.addColorStop(1, '#05030c');
  ctx.fillStyle = water;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.save();
  ctx.filter = 'blur(2px)';
  for (let i = 0; i < 46; i++) {
    const rx = rng() * w;
    const warm = rng() < 0.75;
    ctx.fillStyle = warm
      ? `rgba(255,190,100,${0.25 + rng() * 0.4})`
      : `rgba(120,200,255,${0.25 + rng() * 0.35})`;
    ctx.fillRect(rx, h * (0.63 + rng() * 0.06), 3 + rng() * 5, h * (0.10 + rng() * 0.2));
  }
  ctx.restore();
  // Ripples.
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(200,220,255,${0.08 + rng() * 0.14})`;
    ctx.lineWidth = 1;
    const rx = rng() * w, ry = h * (0.64 + rng() * 0.34);
    ctx.beginPath();
    ctx.moveTo(rx - 10 - rng() * 20, ry);
    ctx.lineTo(rx + 10 + rng() * 20, ry);
    ctx.stroke();
  }
  finishPhoto(ctx, w, h, rng, '#1a2a6a', 0.06);
}

export const SCENES = [
  { id: 'beach', name: 'Beach Sunset', seed: 101, draw: drawBeach },
  { id: 'neon', name: 'Neon Street', seed: 202, draw: drawNeon },
  { id: 'coast', name: 'Coastal Road', seed: 303, draw: drawCoast },
  { id: 'skyline', name: 'Dusk Skyline', seed: 404, draw: drawSkyline },
];

// Draw a scene into a fresh canvas and return it, so it can be used as a
// photo source anywhere an image can.
export function renderScene(sceneId, width, height) {
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  scene.draw(ctx, width, height, makeRng(scene.seed));
  return canvas;
}
