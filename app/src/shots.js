// Fixed scenes for the screenshots in ../shots.json.
//
// ?shot=cover strips the page to the cover alone at the requested post size;
// ?shot=editor keeps the whole studio on screen. Either way the bundled
// photographs are loaded, the query's layout / grade / caption / size are
// applied, the cover is painted, and window.__shotReady is set after two
// animation frames so the screenshot pipeline never catches a half-paint.
export async function runShot(query, app) {
  const { state, els, canvas, loadBundled, redraw } = app;
  const kind = query.get('shot');
  if (query.get('layout')) els.layout.value = query.get('layout');
  if (query.get('grade')) els.grade.value = query.get('grade');
  if (query.get('caption')) els.caption.value = query.get('caption');
  if (query.get('size')) els.size.value = query.get('size');
  if (kind === 'cover') document.body.classList.add('shot-cover');
  if (kind === 'editor') document.body.classList.add('shot-editor');
  await loadBundled();
  if (query.get('photo')) {
    state.images.user = state.images[query.get('photo')] || null;
    state.userKey = query.get('photo');
    els.target.value = query.get('photo');
  }
  redraw();
  if (kind === 'cover') {
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
