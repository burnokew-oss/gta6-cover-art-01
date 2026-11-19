# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos and a caption into cover art in
the multi-panel GTA poster style: comic panels with slanted dividers, huge
gradient poster lettering laid over the art, a neon script subtitle, and a
Vice City sunset or neon colour grade — exported as a PNG in the common
post sizes (1080 × 1080, 1080 × 1350, 1920 × 1080). Everything is original:
the scenes, lettering and seal are drawn by the app itself, and your photos
never leave your machine.

## What it does

- **Six procedural sample scenes** drawn by the app's own canvas code —
  a sunset beach with two walkers, a neon night street with a glossy car, a
  palm-lined coastal road, a dusk skyline across water, a boardwalk
  portrait, and an aerial coast — each layered with clouds, haze, texture
  and glare so the printed result reads like a posterized photograph.
- **A print pipeline per panel**: colours are posterized into flat levels,
  mapped through a colour gradient ramp, and screened with a halftone dot
  pattern. A Poster Ink slider per panel, plus one for the whole cover.
- **Six colour grades**: Sunset, Neon, Golden, Miami, Vice Blue and the
  bold two-colour Comic Ink duotone.
- **Seven layouts**, two of them comic layouts whose panel dividers are
  slanted, panels touching edge to edge inside a thin pale keyline frame;
  up to eight panels in the largest layout.
- **Any photo**: load photos from your machine, crop / pan / zoom / flip
  per panel, spread many photos and scenes across a cover in one click, or
  fill every panel with a different crop of a single photo.
- **Full poster dressing**, all editable: a five-star press-quote line, a
  starburst seal, a palm-silhouette sunset strip behind the tagline, a
  movie-style billing block, a barcode derived from the title, and a studio
  monogram.
- **Fast flow**: photo in, caption typed, PNG out — with an
  export-every-size action that saves all three post sizes at once.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Then open http://localhost:8080 in a desktop browser. No build step, no
install, no network: the app is the static files under `app/`. Add photos,
pick a layout and grade, type your caption, and export — most covers take
under a minute from the first click.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
make.fun library in `vendor/makefun-app.ts`.

## License

MIT — see `LICENSE`.
