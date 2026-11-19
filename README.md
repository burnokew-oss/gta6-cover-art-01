# Vice Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn any photo and a caption into multi-panel cover art in the style of GTA 6's posters — bold lettering, a Vice City sunset or neon colour grade — and export it as a PNG to share. It runs offline in a desktop browser from its own static files: your photos never leave the machine.

An entry for the [make.fun bounty "Make GTA 6 Cover Art" (gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01) — the 50 highest-ranked entries share $250, and make.fun features the winner in its posts.

## What it does

- **Five multi-panel layouts** — Hero Split (one large panel beside a stack of smaller ones), Sunset Grid (eight panels), Marquee (a wide top strip over smaller panels), Wide Reel (a horizontal band of panels) and Boulevard (panels over a bottom strip).
- **Any photo, handled well** — crop, pan, zoom and flip per panel, sensible automatic framing for portrait and landscape photos, and a one-photo mode where a single photo fills every panel with a different crop in each. An auto-fill button fills empty panels from the loaded photos.
- **A real poster pipeline** — every panel photo is posterized into flat colour levels, mapped through a colour gradient ramp, and overlaid with a halftone dot pattern whose dot size follows brightness. A Poster Ink slider per panel, plus one slider for all panels, controls how strong the effect is.
- **Five colour grades** — Sunset (warm orange and pink), Neon (hot pink and purple), Golden (amber and gold), Miami (teal and pink) and Vice Blue (cold blue).
- **Caption editing** — bold poster lettering with a two-colour gradient title and a white neon script subtitle, editable title, subtitle, tagline and badge text, a starburst badge with editable text, and a tagline bar. The title can be dragged to a new position by hand. By default the title block sits in its own band above the panel grid, so all eight panels are fully visible in the export.
- **Four original sample scenes** — drawn procedurally by the app itself so they read as photographs: a beach at sunset with two people walking and long palm shadows, a neon night street with a glossy car and pedestrians, a palm-lined coastal road at golden hour, and a dusk city skyline with lit windows. Every scene has film grain, a vignette, depth blur and small bright details.
- **Fast flow** — photo in, caption typed, PNG out in a few clicks. Export at 1080 × 1080, 1080 × 1350 and 1920 × 1080.

## How to run it

Requires Node.js 22.18 or later and a desktop browser such as Chrome.

```sh
node serve.ts
```

Then open http://localhost:8080, load a photo (or pick a sample scene), choose a layout and a grade, type a caption, and press **Export PNG**.

## How it is built

- `main.ts` — the program that hands the app in (Node 22, standard library only): it copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
- `app/index.html` — the editor page, which works offline.
- `app/src/main.js` — editor wiring: photos, samples, controls, panel editing, export.
- `app/src/cover.js` — layouts, the title band and tagline bar, panel framing, cover rendering.
- `app/src/poster.js` — the poster pipeline and the five colour grades.
- `app/src/samples.js` — the four original procedural sample scenes.
- `app/style.css` — the editor's styling.
- `vendor/makefun-app.ts` — the make.fun library, copied from the kit unchanged.
- `screenshots/` — screenshots of the app and the covers it exported.

Everything is original work: no Rockstar Games logo, official artwork or fonts are used anywhere.

## License

MIT — see [LICENSE](LICENSE).
