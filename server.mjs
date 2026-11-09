// build-broadcast · server.mjs — the local shell (this machine only). It serves the page, plays a build LIVE by running
// the tap on it every 15 seconds (§7.5: the live mode; streaming it outward is Simon's call, not this server's), and
// saves recordings to recordings/ on this disk. It answers 127.0.0.1 and localhost on its own port, from its own page.
//   node server.mjs [--port 8796] [--live-repo <path> --live-gh owner/name --live-title "<title>"]
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = fileURLToPath(new URL('./', import.meta.url));
const PORT = Number(arg('port', 8796)), LIVE_REPO = arg('live-repo', ''), LIVE_GH = arg('live-gh', ''), LIVE_TITLE = arg('live-title', 'this build, live');
const LIVE_FILE = join(ROOT, 'live', 'live.log.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.webm': 'video/webm', '.vtt': 'text/vtt' };
const MAX = 400 * 1024 * 1024;

/** guard(request) → { ok } or { ok: false, why }: this machine, this port, never another site; GET, or the one save. */
export function guard({ method, host, origin, fetchSite, path }, port) {
  const hosts = ['127.0.0.1:' + port, 'localhost:' + port];
  if (!hosts.includes(String(host || ''))) return { ok: false, why: 'not this machine' };
  if (origin !== undefined && origin !== null && !hosts.map((h) => 'http://' + h).includes(String(origin))) return { ok: false, why: 'another site' };
  if (fetchSite !== undefined && fetchSite !== null && !['same-origin', 'none'].includes(String(fetchSite))) return { ok: false, why: 'another site' };
  if (method === 'GET' || method === 'HEAD') return { ok: true };
  if (method === 'POST' && path === '/api/save') return { ok: true };
  return { ok: false, why: 'only GET, and POST to /api/save' };
}
/** saveName(name) → the file name a recording may be saved under, or '' (letters, digits and dashes; three kinds). */
export function saveName(name) { const n = String(name || ''); return /^[a-z0-9][a-z0-9-]{0,80}\.(webm|vtt|frames\.json)$/.test(n) ? n : ''; }

// the live tap: the real build, re-read every 15 s (the tap itself redacts and refuses to write anything private)
let tapping = false;
function tap() {
  if (!LIVE_REPO || tapping) return;
  tapping = true;
  const args = [join(ROOT, 'tools', 'tap.mjs'), '--repo', LIVE_REPO, '--id', 'live', '--title', LIVE_TITLE, '--out', 'live/live.log.json'];
  if (LIVE_GH) args.push('--gh', LIVE_GH);
  execFile(process.execPath, args, { windowsHide: true, timeout: 300000 }, () => { tapping = false; });
}
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
export function makeServer(port = PORT) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let p;
    try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'bad path', 'text/plain'); }
    const g = guard({ method: req.method, host: req.headers.host, origin: req.headers.origin, fetchSite: req.headers['sec-fetch-site'], path: p }, port);
    if (!g.ok) return send(res, 403, 'refused: ' + g.why, 'text/plain');
    if (p === '/api/hello') return send(res, 200, { ok: true, server: 'build-broadcast', live: LIVE_REPO ? LIVE_TITLE : null });
    if (p === '/api/live') {
      if (!existsSync(LIVE_FILE)) return send(res, 200, { events: [], meta: {} });
      const log = JSON.parse(readFileSync(LIVE_FILE, 'utf8')), since = Math.max(0, Math.floor(Number(url.searchParams.get('since')) || 0));
      const { events, ...meta } = log;
      return send(res, 200, { ...meta, meta, events: events.slice(since), total: events.length });
    }
    if (p === '/api/save') {
      const name = saveName(url.searchParams.get('name'));
      if (!name) return send(res, 400, 'refused: a recording is saved as name.webm, name.vtt or name.frames.json', 'text/plain');
      const parts = []; let n = 0;
      for await (const c of req) { n += c.length; if (n > MAX) return send(res, 413, 'refused: too large', 'text/plain'); parts.push(c); }
      await mkdir(join(ROOT, 'recordings'), { recursive: true });
      await writeFile(join(ROOT, 'recordings', name), Buffer.concat(parts));
      return send(res, 200, { ok: true, saved: 'recordings/' + name, bytes: n });
    }
    if (p.startsWith('/.git') || p.startsWith('/live/') || p.startsWith('/node_modules')) return send(res, 404, 'not found', 'text/plain');
    let f = normalize(join(ROOT, p === '/' ? 'index.html' : p));
    if (!f.startsWith(normalize(ROOT))) return send(res, 403, 'refused: outside the page', 'text/plain');
    try {
      if ((await stat(f)).isDirectory()) f = join(f, 'index.html');
      return send(res, 200, await readFile(f), TYPES[extname(f)] || 'application/octet-stream');
    } catch { return send(res, 404, 'not found', 'text/plain'); }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  makeServer().listen(PORT, '127.0.0.1', () => console.log('build-broadcast on http://127.0.0.1:' + PORT + '/' + (LIVE_REPO ? ' · live: ' + LIVE_REPO : '')));
  if (LIVE_REPO) { tap(); setInterval(tap, 15000); }
}
export default { guard, saveName, makeServer };
