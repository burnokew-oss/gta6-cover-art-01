// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone
// (layout, grade, size and caption come from the query), ?shot=editor shows
// the editor with sample photos loaded. window.__shotReady is set once the
// scene has painted, so a headless browser can wait for it.
export async function runShot(shot, query, state, helpers) {
  const { loadImage, setPhoto, redraw, canvas } = helpers;
  state.layout = query.get('layout') || state.layout;
  state.grade = query.get('grade') || state.grade;
  state.title = query.get('caption') || state.title;
  state.subtitle = query.get('subtitle') || state.subtitle;
  state.titlePos = query.get('titlePos') || state.titlePos;

  // Sample photos: boulevard in slot 1, pier in slot 2, boulevard again
  // (different crop) in slot 3, so every panel has a photo.
  const [boulevard, pier] = await Promise.all([
    loadImage('samples/boulevard.jpg'),
    loadImage('samples/pier.jpg'),
  ]);
  await setPhoto(0, boulevard);
  await setPhoto(1, pier);
  state.photos[2] = { img: boulevard, zoom: 1.6, panX: 0.25, panY: -0.1 };
  // Wide tilted panels crop portrait photos top and bottom; pan down so the
  // faces (top third of each photo) stay in frame.
  if (state.layout === 'tilted') {
    state.photos[0].panY = 0.7;
    state.photos[1].panY = 0.6;
    state.photos[2] = { img: boulevard, zoom: 1.0, panX: 0, panY: 1.0 };
  }
  // The four-square panels are near-portrait already: no zoomed crop.
  if (state.layout === 'grid4') {
    state.photos[2] = { img: boulevard, zoom: 1, panX: 0, panY: 0 };
  }
  state.panelPhotos = state.layout === 'strip' ? [0, 1, 2] : [0, 1, 2, 0];

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = query.get('size') || '1080x1080';
    const [w, h] = size.split('x').map(Number);
    canvas.width = w;
    canvas.height = h;
  }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
