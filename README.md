[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Coast Cover Studio

An offline web app that turns a person's photo and a caption into multi-panel
GTA-style cover art — slanted comic panels edge to edge, a giant gradient
poster title laid over the art, a neon script subtitle, and a full set of
printed dressing (press quote with five stars, a starburst seal, a palm strip,
a movie-style billing block, a barcode and a studio monogram) — then exports
it as a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080, or all three at once.

Six original procedural sample scenes are built in — a modelled portrait at a
magenta sunset bay, dawn beach walkers, a neon street with a detailed car and
its wet-road reflection, a land-first aerial coast, a blue-hour skyline and a
golden coastal road — each with its own sky. Six colour grades (Sunset, Neon,
Golden, Miami, Vice Blue and the duotone Comic Ink) run through a light
photographic poster finish: an S-curve and grain first, then a many-level
posterize, a subtle halftone and the grade ramp, so panels still read as
photographs with a print texture.

Photos are handled per panel — crop, pan, zoom and flip, a one-photo mode
that gives every panel a different crop, and a spread action that deals the
loaded photos and scenes across the panels. Everything runs from the static
files in `app/`; photos never leave the machine and the app makes no network
request. All artwork, lettering and wording are the studio's own.

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
```

Then open the address in a desktop browser, add a photo, type a caption and
export. To hand the entry in the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes its `dossier.json` with the vendored
make.fun library in `vendor/`, copied unchanged from the competition kit.

## Screenshots

`screenshots/1-cover.jpg` is the flagship export: the Comic Hero Plus layout
(portrait hero, neon car, aerial coast, dawn walkers) in the Sunset grade at
1080 × 1350, with the full dressing. `3-cover.jpg` is a second export in the
Miami grade at 1920 × 1080 with a different scene mix; `2-editor.jpg` and
`4-editor.jpg` show the editor itself, panels loaded and controls in view.

MIT licensed — see `LICENSE`.
