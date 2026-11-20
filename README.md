# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/burnokew-oss/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)


Marlin Coast Cover Studio is an offline web app that turns photographs and a caption into a multi-panel GTA-style cover poster. It opens with a ready-made cover built from its bundled cast of five original photographs, and every panel can be replaced with a photo of your own: pick the panel, choose a file, and the cover re-crops it face-aware (portrait panels focus near the top of the frame, so heads stay whole). Edit the script line, switch layout and colour grade, and export a PNG to share. Photos are read locally in the browser and never uploaded; there is no server and no network request.

The poster treatment is deliberately light on the photography. Photos stay photos: a colour grade, a whisper of film grain, and a halftone dot pattern that lives only on the flat title band. Each cast panel carries a slanted black name tag, and the cover is dressed with a giant gradient title, a flowing script line, a five-star press quote, an issue chip, a circular ORIGINAL PHOTOGRAPHY seal, a barcode and a billing strip, all inside a double keyline frame on deep plum.

## Layouts

- **Cast Slant** (native 1920 × 1080) — the flagship. Three slanted cast portraits across the top, the giant title over a thin aerial coastline strip in the middle, and a wide convertible panel plus two more cast portraits along the bottom.
- **Hero Car** (native 1080 × 1350) — two cast portraits at the top, the convertible large across the middle under the title, an aerial ribbon, and two more cast portraits below.
- **Portrait Cast** (native 1080 × 1080) — five cast portraits in two slanted comic rows with the title band between them and the convertible closing the bottom row.

## Grades

- **Sunset** — warm amber light with teal shadows.
- **Neon** — a pink/cyan push with deeper blacks.
- **Miami** — bright pastels with lifted shadows.

## Export

Every layout exports as a PNG at 1080 × 1080, 1080 × 1350 and 1920 × 1080.

## Photographs

The seven bundled photographs in `app/assets/` are original AI-generated images, created specially for this entry on 20 November 2026. They are not stock photography, not any competitor's work, and not recognisable real people. The full-resolution originals were downscaled to make the bundled copies.

- `cast-dj.jpg` — THE NIGHT DJ: a woman radio DJ in a neon boardwalk booth (portrait).
- `cast-driver.jpg` — THE GETAWAY DRIVER: a man in a floral shirt with sunglasses on his forehead, leaning on a car on a palm boulevard at golden hour (portrait).
- `cast-queen.jpg` — THE BOARDWALK QUEEN: an elegant woman in her fifties with silver-grey hair and a cream blazer, on a neon boardwalk at night (portrait).
- `cast-pilot.jpg` — THE STORM PILOT: a woman helicopter pilot in a flight jacket, a blurred helicopter behind her at sunset (portrait).
- `cast-diver.jpg` — THE PEARL DIVER: a man freediver in a half-open wetsuit holding his mask, at a marina in the morning (portrait).
- `car.jpg` — the convertible: a glossy red convertible in full side profile on a wet neon street (landscape).
- `aerial.jpg` — the coastline: an aerial photograph of a curved beach with colourful umbrellas and a coast road (landscape).

## Run it

```sh
node serve.ts
# then open http://localhost:8080
# hand the entry in with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=github-readme&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
