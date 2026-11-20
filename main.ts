// Vice Coast Cover Studio — entry program for gta6-cover-art-01 (Node 22,
// standard library only). The app itself is the static site in app/: a
// multi-panel GTA-style cover maker that runs offline in a desktop
// browser, turns any photo plus a caption into poster cover art and
// exports PNGs at 1080 x 1080, 1080 x 1350 and 1920 x 1080.
// This program hands the entry in: it copies app/ and screenshots/ to the
// output directory and writes dossier.json with the vendored make.fun
// library, byte for byte as the scorer rebuilds it.
// Try the app locally with `node serve.ts`, then open
// http://localhost:8080. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program is deterministic: two runs over the same tree write the
// same dossier bytes, which the gate requires.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Caps mirrored from the gate so an oversized entry fails here first:
// at most 4 screenshots of at most 256 KiB, at most 993 app entries and
// 48 MiB of app files, no app path over 1000 bytes, dossier text capped.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
