// Vice Coast Cover Studio — the program that hands the entry in
// (Node 22, standard library only). The app itself is the static file
// tree under app/: plain HTML, CSS and ES modules that a desktop
// browser opens offline, with no build step and no network request.
// This program copies app/ and screenshots/ from beside itself into
// the output directory and writes the dossier the judge reads, using
// the vendored make.fun library in vendor/makefun-app.ts.
//
// Run it outside the grader with a stand-in output directory:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Try the app itself with: node serve.ts  (then open localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the gate's own limits, so the dossier this
// program writes is the one the scorer rebuilds byte for byte: at most
// 4 screenshots of at most 256 KiB, at most 993 app entries totalling
// at most 48 MiB, no app path over 1000 bytes, dossier text capped at
// 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Vice Coast Cover Studio handed in: app/ and screenshots/ copied, dossier ${dossier.length} bytes.`);
