// Vice Coast Cover Studio — the hand-in program for gta6-cover-art-01
// (Node 22, standard library only).
//
// The app itself is the static site in app/: plain files a desktop browser
// opens offline, with no build step and no network request. This program's
// whole job is to hand that app in — it copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there
// with the vendored make.fun library, so the judge reads the same summary
// every entry is judged by.
//
// Round 7 of the studio: the scenes were rebuilt toward photographs — a
// portrait modelled from shaded facial planes with stranded hair, a car with
// a real glasshouse and wet-road reflection, fully shaded small figures, and
// a land-first aerial coast — while the layouts, grades and editor carried
// over in spirit and were rewritten with them.
//
// Try the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

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

// The scorer's own caps, passed through so an entry the scorer would refuse
// is refused here first: at most 4 screenshots of at most 256 KiB each, at
// most 993 files and 48 MiB under app/, and no app/ path over 1000 bytes.
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
