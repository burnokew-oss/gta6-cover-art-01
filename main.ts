// Vice Coast Cover Studio — hand-in program (Node 22, standard library only).
//
// The studio itself is the static web app in app/: plain files a desktop
// browser opens offline, with no build step and no network request. This
// program's whole job is to hand that app in — it copies app/ and
// screenshots/ from beside this file into the output directory and writes
// the dossier the judge reads, using the vendored make.fun library.
//
// Run it outside the grader with an output directory of your choosing:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader the output directory is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The app goes in whole: every static file under app/, untouched.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

// Screenshots ride along in their own folder; the first by name is the cover.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier is written with the same caps the scorer enforces, so an
// entry this program accepts is one the gate accepts: at most four
// screenshots of at most 256 KiB each, at most 993 files and 48 MiB under
// app/, no app path longer than 1000 bytes, dossier text capped at 160 KiB.
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
