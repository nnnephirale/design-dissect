#!/usr/bin/env node
// design-feedback service: serves the design library on localhost and saves every comment made
// on a specimen to that reference's feedback.json, whether the page was opened from
// http://localhost:4777/<ref>/specimen.html or straight from Finder (file://).
//
//   node server.mjs                 → whole library at http://localhost:4777/ (run at login by install.sh)
//   node server.mjs <dir> [port]    → one folder only (what scripts/serve-specimen.mjs uses)
//
// POST <path>/__feedback      from a served page: body is the page's entries (array or {entries})
// POST /__feedback            from a file:// page: body is {file: <page path>, entries}
// Both merge per id (newest wins, see lib.mjs) and answer with the merged list, so the page
// picks up comments an agent resolved in the meantime.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, extname, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { libraryRoots, inside, merge, readFeedback, updateFeedback, references, PORT } from './lib.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8' };
// file:// pages have an opaque origin; the private-network header lets Chromium (Arc, Chrome) reach localhost.
// Only pages opened from disk (Origin: null) or served here may talk to it, so no website can
// plant comments that agents would later read as preferences.
const CORS = { 'access-control-allow-origin': 'null', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-allow-private-network': 'true' };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function start({ root = null, port = PORT } = {}) {
  const roots = () => (root ? [resolve(root)] : libraryRoots());
  // A URL path maps to the first root that has it.
  const local = (p) => { for (const r of roots()) { const f = normalize(join(r, p)); if (inside(r, f) && existsSync(f)) return f; } return null; };

  const send = (res, code, body, type = 'application/json') => res.writeHead(code, { ...CORS, 'content-type': type, 'cache-control': 'no-store' }).end(body);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = decodeURIComponent(url.pathname);
    const origin = req.headers.origin;
    if (origin && origin !== 'null' && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return res.writeHead(403).end();
    if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();

    if (path === '/__health') return send(res, 200, JSON.stringify({ service: 'design-feedback', roots: roots() }));

    // /__open?file=<page path>: redirect to that page's URL here (used by "STARTTHIS.command").
    if (path === '/__open') {
      const f = resolve(url.searchParams.get('file') || ''), r = roots().find((x) => inside(x, f));
      if (!r || !existsSync(f)) return send(res, 404, 'not in the design library', 'text/plain');
      return res.writeHead(302, { location: '/' + f.slice(r.length + 1).split('/').map(encodeURIComponent).join('/') }).end();
    }

    if (path.endsWith('/__feedback')) {
      let body = '';
      if (req.method === 'POST') for await (const chunk of req) { body += chunk; if (body.length > 4e6) return send(res, 413, '"too large"'); }
      let data = {};
      try { data = body ? JSON.parse(body) : {}; } catch { return send(res, 400, '"invalid JSON"'); }
      const entries = Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : null;
      // Which folder: the page's own file path (file://), else the served path before /__feedback.
      const file = data.file || url.searchParams.get('file');
      const dir = file ? dirname(resolve(file)) : local(path.replace(/__feedback$/, '') || '/');
      if (!dir || !roots().some((r) => inside(r, dir)) || !existsSync(dir) || !statSync(dir).isDirectory()) return send(res, 403, '"outside the design library"');
      try {
        const out = entries ? await updateFeedback(dir, (cur) => merge(cur, entries)) : await readFeedback(dir);
        return send(res, 200, JSON.stringify(out));
      } catch (e) { return send(res, 500, JSON.stringify(String(e.message))); }
    }

    if (path === '/' && !root) {
      const refs = await references();
      const rows = await Promise.all(refs.map(async (r) => {
        const fb = await readFeedback(r.dir), open = fb.filter((f) => f.status !== 'resolved').length;
        const href = '/' + r.name.split('/').map(encodeURIComponent).join('/') + '/' + (r.hasSpecimen ? 'specimen.html' : 'feedback.json');
        return `<a href="${href}"><span>${esc(r.name)}</span><em>${open ? `${open} open` : ''} ${fb.length} comment${fb.length === 1 ? '' : 's'}</em></a>`;
      }));
      return send(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Design library</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400&display=swap">
<style>body{margin:0;min-height:100vh;background:linear-gradient(#FCFCFC,#F4F4F4);font:300 13px/1.6 'IBM Plex Mono',ui-monospace,monospace;color:#525252}
main{max-width:560px;margin:72px auto;padding:0 16px}h1{font-weight:400;font-size:13px;color:#171717;margin:0 0 20px}
a{display:flex;justify-content:space-between;gap:16px;padding:14px 18px;margin:0 0 8px;border-radius:20px;background:#fff;border:1px solid rgba(0,0,0,.04);box-shadow:0 1px 2px rgba(0,0,0,.03),0 8px 24px rgba(0,0,0,.04);color:inherit;text-decoration:none;transition:transform .5s cubic-bezier(.16,1,.3,1),box-shadow .5s cubic-bezier(.16,1,.3,1),color .2s}
a:hover{color:#171717;transform:translateY(-3px);box-shadow:0 2px 4px rgba(0,0,0,.04),0 16px 40px rgba(0,0,0,.07)}em{font-style:normal;color:#a3a3a3}
@media (hover:none){a:hover{transform:none}}</style>
<main><h1>Design library</h1>${rows.join('') || '<p>No references yet.</p>'}</main>`, 'text/html; charset=utf-8');
    }

    let f = local(path);
    if (f && statSync(f).isDirectory()) f = existsSync(join(f, 'specimen.html')) ? join(f, 'specimen.html') : existsSync(join(f, 'index.html')) ? join(f, 'index.html') : null;
    if (!f) return send(res, 404, 'not found', 'text/plain');
    res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(f));
  });

  server.on('error', async (e) => {
    if (e.code !== 'EADDRINUSE') throw e;
    // Already running (usually the always-on library service): point at it instead of failing.
    try {
      const h = await (await fetch(`http://localhost:${port}/__health`)).json();
      const r = root && h.roots.find((x) => inside(x, resolve(root)));
      if (h.service === 'design-feedback') {
        console.log(r ? `specimen: http://localhost:${port}/${resolve(root).slice(r.length + 1)}/specimen.html  (already served; comments save to feedback.json)` : `design-feedback is already running on :${port}`);
        process.exit(0);
      }
    } catch {}
    console.error(`port ${port} is in use by something else`); process.exit(1);
  });

  server.listen(port, '127.0.0.1', () => console.log(root
    ? `specimen: http://localhost:${port}/specimen.html  (comments save to ${resolve(root)}/feedback.json)`
    : `design-feedback: http://localhost:${port}/  (library: ${roots().join(', ') || 'none mounted yet'})`));
  return server;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  start({ root: process.argv[2] || null, port: +(process.argv[3] || PORT) });
}
