// Vice Coast Cover Studio — the program that hands the entry in.
// The app itself is the static site under app/ (open app/index.html in a
// desktop browser, fully offline). This program copies app/ and
// screenshots/ into the output directory and writes the dossier the judge
// reads, using the vendored make.fun library exactly as shipped in the kit.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

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

// Caps mirror the gate so an oversized entry fails here first, not later:
// at most 4 screenshots of 256 KiB, at most 993 app entries / 48 MiB total,
// no app path longer than 1000 bytes, dossier text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Vice Coast Cover Studio handed in: app/ + screenshots/ + dossier.json -> ${outputDir}`);
