// Fixed scenes for the studio's screenshots. A `?shot=cover` page shows
// only the cover, drawn at the window's own size; `?shot=editor` shows
// the full studio. `layout` and `grade` pick the scene. The page sets
// window.__shotReady once the bundled photographs are in and the cover
// has been painted twice, so a screenshot never catches a half-load.
export async function runShotScene(shot, query, applyScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  await applyScene(query.get('layout') ?? 'slant', query.get('grade') ?? 'sunset');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
