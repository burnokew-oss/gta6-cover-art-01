# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Marlin Coast Cover Studio** — a web app that turns your photo and a caption
into cover art in the multi-panel GTA-poster style, and exports it as a PNG to
share. The sheet is built from real photographs under a light poster finish —
a sunset, neon or Miami colour grade, a whisper of fine grain, and a halftone
dot screen on the title band only — so faces stay photographic while the page
still reads as a printed game cover.

The flagship **Cast Slant** layout lines up five slanted cast panels — THE
NIGHT DJ, THE GETAWAY DRIVER, THE BOARDWALK QUEEN, THE STORM PILOT and THE
PEARL DIVER, each with its own slanted name tag sized to the panel — over an
aerial strip of the coast and the Marlin GT convertible. **Hero Car** gives
the car the wide panel with three faces beneath it, and **Portrait Cast**
runs two tall portraits over the aerial strip. Every sheet is dressed the
same way: the gradient MARLIN COAST masthead with its script line *where the
tide keeps secrets*, the Harbor Gazette star quote “A POSTCARD WITH TEETH”,
the NO. 10 issue chip, the ORIGINAL PHOTOGRAPHY seal, a barcode and a
billing strip inside a double frame, under the tagline FIVE FACES · ONE
COASTLINE · NO WAY BACK.

Your part is fast: drop in one photo (or several — they fill the panels in
order from the panel you pick), type a caption, aim the photo with the zoom
and shift sliders, and export. Covers export as PNG at 1080 × 1080,
1080 × 1350 or 1920 × 1080. The studio runs fully offline from its own static
files in a desktop browser, and your photos never leave your machine — they
are read locally and drawn on a canvas, never uploaded. The bundled cast,
car and aerial photographs are original images made for this studio. All
lettering is drawn with system fonts; no Rockstar Games logo, artwork or
font is used anywhere.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
node main.ts           # hands the entry in: copies app/ + screenshots/ to /output and writes dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=burnokew-oss&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
