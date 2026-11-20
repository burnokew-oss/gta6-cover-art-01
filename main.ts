// Marlin Coast Cover Studio — gta6-cover-art-01 entry (Node 22, standard library only).
//
// The product is the static web app in app/: plain files a desktop browser
// loads fully offline (index.html plus its ES modules and the bundled cast
// photographs; no library, no network request). This program hands the entry
// in: it copies app/ and screenshots/ into the output directory and writes
// dossier.json there with the vendored make.fun library.
//
// Run it the way the grader does, or locally with an override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Try the app itself with `node serve.ts`, then http://localhost:8080.

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

// The caps below mirror the scorer's gate, so an entry the scorer would
// refuse is refused here first: at most 4 screenshots of at most 256 KiB
// each, at most 993 app files totalling at most 48 MiB, no app path longer
// than 1000 bytes, and dossier text capped at 160 KiB.
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
