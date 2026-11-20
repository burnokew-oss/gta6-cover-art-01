// Marlin Coast Cover Studio — the hand-in program (Node 22, standard library only).
//
// The studio itself is the static web app in app/: plain files a desktop browser
// opens offline, with no build step and no network request. This program copies
// app/ and screenshots/ from beside itself into the output directory and writes
// dossier.json there with the vendored make.fun library, exactly as the kit asks.
//
// Run it the way the grader does:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Try the app locally with `node serve.ts`, then open http://localhost:8080.

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

// The caps below are the scorer's own (reference/gate.json): text_max_bytes is
// the one that shapes the dossier bytes; the rest refuse an entry the scorer
// would refuse anyway (over 4 screenshots or one over 256 KiB, over 993 files
// or 48 MiB under app/, or an app/ path over 1000 bytes).
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
