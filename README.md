# Vice Coast Cover Studio

A web app that turns your photos into multi-panel GTA-style poster art —
bold lettering, a Vice City sunset or neon grade — and exports it as a PNG
to share. It runs offline in a desktop browser from its own static files;
photos never leave the machine.

## What it does

- **Multi-panel posters**: four layouts — Hero Split, Triptych, Grid + Title,
  Skyline Strip — with three photo slots per cover.
- **Any photo**: per-photo crop (fill / fit), pan by dragging, zoom by
  scrolling or slider, flip, reset, and sensible auto-framing for portrait
  and landscape shots.
- **Caption editing**: editable text and tagline, size and placement
  controls, three lettering styles (solid white, sunset fill, neon glow).
- **Colour grades**: Vice Sunset, Neon Nights and Noir, with a strength
  slider. The skyline, sun and frame are drawn by the app itself.
- **Fast export**: one click exports a PNG at 1080×1080, 1080×1350 or
  1920×1080, shown in the app and downloadable.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22, standard library only. Original art, lettering and code — no
Rockstar Games logo, artwork or font is used. MIT licensed.
