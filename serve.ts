// Marlin Coast Cover Studio — tiny static server (round 12, Node 22, stdlib only).
// Serves app/ on http://localhost:8080 so the entry can be tried in a
// desktop browser with no build step: `node serve.ts` (or --port <n>).
// A development convenience, not a server for the internet: it only reads
// files under app/, sends the MIME types an offline app needs, and
// refuses anything that climbs out of app/.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const flagAt = process.argv.indexOf('--port');
const wanted = flagAt === -1 ? 8080 : Number(process.argv[flagAt + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(requestedPath) {
  let clean;
  try {
    clean = decodeURIComponent(requestedPath);
  } catch {
    return null;
  }
  if (clean.endsWith('/')) clean += 'index.html';
  const target = resolve(join(appRoot, normalize(clean)));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) return null;
  return target;
}

createServer((req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  const file = safePath(path);
  if (!file) {
    res.writeHead(400).end('bad request');
    return;
  }
  let bytes;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    bytes = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': bytes,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`Marlin Coast Cover Studio is on http://localhost:${port}`);
});
