# Vice Coast Cover Studio

An offline web app that turns your photos and a caption into multi-panel
cover art in the spirit of a Vice City poster — slanted comic panels filled
edge to edge, a giant gradient title lying over the art, a neon script
subtitle, press stars, a starburst seal, a palm-silhouette strip, a billing
block, and a PNG export in the three common post sizes
(1080 × 1080, 1080 × 1350, 1920 × 1080).

Everything is drawn by the app itself: six built-in sample scenes are
painted procedurally with continuous tone — layered gradients, seeded
multi-octave noise, soft shadows, bokeh, bloom and a shaded portrait hero —
then finished with a light poster grade (many posterize levels, a whisper
of halftone, fine grain) so the photography survives into the print.
Your own photos get the same treatment, with per-panel crop, pan, zoom,
flip and ink controls, six colour grades, seven layouts (two of them
slanted comic layouts), and a one-photo mode that gives every panel a
different crop.

## Screenshots

`screenshots/` holds the studio at work: the hero exported cover (a
slanted comic layout, portrait hero panel, full dressing), the editor
with the sample scenes spread across its panels, a second exported cover
in another size and grade, and the editor in a second layout with the
per-panel controls open.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Or open `app/index.html` through any static file server. No network is
used and photos never leave your machine.

## Hand the entry in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library in `vendor/makefun-app.ts`.

## On make.fun

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

All lettering, artwork and wording are original to this studio — no
Rockstar Games logo, artwork or fonts. MIT licensed.
