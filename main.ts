// Marlin Coast Cover Studio — the program that hands this entry in.
//
// The studio itself is the static web app under app/: plain files, no build
// step, no network. This program's whole job is delivery. It copies app/ and
// screenshots/ from beside this file into the output directory and writes
// dossier.json there with buildDossier from the vendored make.fun library,
// byte for byte the way the scorer rebuilds it.
//
// Run it the way the grader does (MAKEFUN_OUTPUT_DIR stands in for /output
// outside the grader's container):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice and the output bytes do not change: the copy is a plain copy
// and buildDossier is deterministic over the same tree.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps below are the gate's own (reference/gate.json): the dossier text
// cap shapes the bytes, the rest refuse early what the scorer would refuse.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_LIMITS));
