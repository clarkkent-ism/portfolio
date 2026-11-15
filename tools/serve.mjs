#!/usr/bin/env node
/* Local preview: builds the site, serves dist/ on http://localhost:8080 and rebuilds when you edit anything. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = +process.env.PORT || 8080;
const build = () => { const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/build.mjs')], { stdio: 'inherit', env: { ...process.env, DEV: '1' } }); return r.status === 0; };
build();
let t; for (const d of ['content', 'assets', 'tools']) fs.watch(path.join(ROOT, d), { recursive: true }, () => { clearTimeout(t); t = setTimeout(build, 200); });
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.yml': 'text/plain', '.webp': 'image/webp' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, 'dist', p);
  if (!f.startsWith(path.join(ROOT, 'dist'))) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(path.join(ROOT, 'dist/404.html'))); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`\nPreview: http://localhost:${PORT}   (Ctrl+C to stop)`));
