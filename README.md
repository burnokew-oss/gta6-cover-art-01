# Marlin Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns photos into GTA-style multi-panel cover art and exports it as a PNG to share. Built for the [make.fun gta6-cover-art-01 competition](https://make.fun/c/gta6-cover-art-01).

## What it makes

**MARLIN COAST** — five faces, one coastline, no way back. The flagship **Cast Slant** cover stacks five photographic cast panels — the Night DJ, the Getaway Driver, the Boardwalk Queen, the Storm Pilot and the Pearl Diver — over an aerial strip of the coast and a red convertible on a wet neon boulevard, dressed as a poster: gradient title, script line (*where the tide keeps secrets*), Harbor Gazette star quote (*A POSTCARD WITH TEETH*), NO. 10 chip, ORIGINAL PHOTOGRAPHY seal, barcode, billing strip and a double frame.

Two more layouts ship beside it: **Hero Car** (the convertible takes the left half, the cast stacks down the right) and **Portrait Cast** (one big portrait beside a four-panel cast grid).

## How it works

- **Any photo** — seven original photos ship with the studio, and every panel takes your own photo instead: pick a panel, tap *Use your photo*, and it stays in your browser. Nothing is uploaded, ever.
- **Framing per panel** — zoom and pan sliders per panel, with face-aware crops that keep faces centred.
- **Colour grades** — Sunset, Neon or Miami. A light grade plus fine grain; halftone dots live only on the title band, so the faces stay photographic.
- **Fast to a PNG** — pick a layout, a grade and a size, then Export. Post sizes: 1080 × 1080, 1080 × 1350 and 1920 × 1080.
- **Offline** — static files under `app/` only, no network requests, no fonts fetched from anywhere (system type only).

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored `vendor/makefun-app.ts` library.

## Files

- `app/index.html` — the studio page
- `app/style.css` — the editor chrome
- `app/src/cover.js` — the cover renderer (layouts, grades, dressing)
- `app/src/main.js` — editor state, uploads, crop controls, export
- `app/src/shots.js` — screenshot scenes (`?shot=cover` / `?shot=editor`)
- `app/assets/` — the seven original bundled photographs
- `screenshots/` — the cover and the editor at work
- `main.ts`, `serve.ts`, `shots.json` — entry program, local server, shot list

## Credits

All photographs are original images made for this studio. No Rockstar Games logo, artwork, character or font is used, and no game assets appear anywhere in the app. Licensed under the MIT License — see `LICENSE`.
