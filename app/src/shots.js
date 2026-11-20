// Fixed scenes for the entry's screenshots.
//
// ?shot=cover strips the page down to the cover alone, framed exactly like
// the exported PNG. ?shot=editor shows the full studio with a chosen layout
// and grade already dialled in. window.__shotReady flips once the cover has
// been painted over two animation frames, so a screenshot never catches a
// half-loaded photograph.

export async function runShot(shot, query, state, loadBundled, redraw) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (query.get('layout')) {
    state.layout = query.get('layout');
    document.querySelectorAll('#layouts button').forEach((b) =>
      b.classList.toggle('on', b.dataset.layout === state.layout));
  }
  if (query.get('grade')) {
    state.grade = query.get('grade');
    document.querySelectorAll('#grades button').forEach((b) =>
      b.classList.toggle('on', b.dataset.grade === state.grade));
  }
  if (query.get('caption')) {
    document.getElementById('caption').value = query.get('caption');
  }
  await loadBundled();
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
