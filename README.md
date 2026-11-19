# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Coast Cover Studio is an offline web app that turns your own photos and a caption into multi-panel GTA-style cover art: slanted comic panels or straight poster layouts, six colour grades, a photographic finish (grain, bloom, S-curve) under a light poster treatment (many-level posterize, subtle halftone, brightness-to-ramp colour mapping), big gradient poster lettering with a neon script subtitle, and full poster dressing — a five-star press quote, a starburst seal, a palm-silhouette tagline strip, a movie-style billing block, a barcode and a studio monogram. Six original procedural sample scenes (a modelled sunset portrait, a dawn beach, a neon night car with a wet-road reflection, an aerial coast, a blue-hour skyline and a golden coastal road) load as photos with one click, and any photo can be cropped, panned, zoomed and flipped per panel, spread across panels, or filled into every panel with a different crop. Exports are real PNGs at 1080 × 1080, 1080 × 1350 and 1920 × 1080, one size at a time or all three at once. Everything runs from the static files in `app/` — no network request, and photos never leave the machine. All art, lettering and wording are the studio's own; no Rockstar Games logo, artwork or fonts.

## How it is made

The sample scenes and the portrait hero are painted procedurally on canvas with many-step gradients and a seeded multi-octave noise field, lit by one soft key light per scene with rims and pooled contact shadows, then finished as photographs first (grain, highlight bloom, contrast S-curve) and as posters second (many-level posterize, a subtle brightness-following halftone, and a gradient-ramp colour map per grade). The program at `main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes the dossier with the vendored make.fun library.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser
# hand the entry in with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=d2zmzjc5&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
