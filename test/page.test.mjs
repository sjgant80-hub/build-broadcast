// build-broadcast · test/page.test.mjs — the page talks only to itself, carries no video stand-in and no secret, labels
// live and recorded from the law, explains itself, and every control it names exists; the vendored files are FallGarden
// Live's, byte for byte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import B from '../broadcast.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html'), app = read('app.mjs');

test('the page talks only to itself, and names no outside address but its own source', () => {
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';[^"]*connect-src 'self'/);
  assert.equal(/<script[^>]+src="(?!\.\/app\.mjs")/.test(html), false);
  const fetches = [...app.matchAll(/fetch\(([^,)]+)/g)].map((m) => m[1].trim());
  assert.ok(fetches.every((f) => /^['`]\.\//.test(f) || f === "'./api/live?since=' + since"), fetches.join(' | '));
  assert.equal(/https?:\/\//.test(app), false, 'the glue names no address');
  assert.equal(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(app), false, 'words reach the page as text only');
});
test('B4 + U5: no video stand-in, the label from the law, live only from the local tap', () => {
  assert.equal(/<video|\.mp4/i.test(html), false, 'the page shows the real render, never a video');
  assert.match(app, /\$\('label'\)\.textContent = B\.labelFor\(S\.mode, S\.log\);/);
  assert.match(app, /S\.mode = ep\.live \? 'live' : 'recorded';/);
  assert.match(app, /if \(LOCAL\) \{ try \{ const h = await \(await fetch\('\.\/api\/hello'/, 'a live episode is offered only by this machine\'s own tap');
  assert.match(app, /No WebGPU here: the same real build on a plainer 2D canvas \(no video, no stand-in\)/);
});
test('the voice is only ever a voice on this device', () => {
  assert.match(app, /filter\(\(x\) => x\.localService && \/\^en\/i\.test\(x\.lang\)\)/);
});
test('ui gate: every element the glue names exists, and the page explains itself', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const id of new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]))) assert.ok(ids.has(id), '#' + id + ' named by app.mjs is missing');
  for (const id of ['play', 'restart', 'voice', 'record', 'fit']) assert.match(app, new RegExp("\\$\\('" + id + "'\\)\\.onclick = "), '#' + id + ' is wired');
  assert.match(app, /\$\('scrub'\)\.oninput = /); assert.match(app, /\$\('speed'\)\.onchange = /);
  for (const s of ['what', 'start', 'how', 'narrator', 'blueprint', 'business', 'adoption', 'limits']) assert.match(html, new RegExp('<section id="' + s + '">'), s);
  assert.match(html, /<svg viewBox=/); assert.match(html, /Powered by the Konomi architecture, created by Thomas Frumkin\./);
  assert.deepEqual([...html.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]).filter((v) => !new RegExp('--' + v + ':').test(html)), [], 'every colour token is defined');
  assert.ok(B.plain('Watch a real build, explained simply.'));
});
test('the brochure: every role, the cost case from the law and the sourced basis only, the supplier as recorded, no price of ours', () => {
  for (const who of ['CEO', 'CFO', 'COO', 'CTO / CISO', 'Delivery teams', 'Clients and stakeholders', 'Compliance and audit']) assert.match(html, new RegExp('<td>' + who), who);
  for (const h of ['The cost case', 'The case for the board', 'Security, compliance and data protection', 'Risks and questions, answered straight', 'Support and ownership', 'Rolling it out']) assert.ok(html.includes(h), h);
  assert.match(app, /const r = B\.reviewCase\(BASIS, \{/, 'the numbers come from the law');
  assert.match(app, /fetch\('\.\/vendor\/basis\.json'/);
  assert.match(html, /Supplied by <a href="https:\/\/www\.ai-nativesolutions\.com" rel="noopener">AI Native Solutions<\/a>; contact us through that site\. Support, SLA, warranty and liability are agreed per deployment, in each deployment's agreement\./);
  const text = html.replace(/<[^>]+>/g, ' ');
  assert.equal(/[£$€]\s?\d|\/mo\b|per seat|pricing|priceCurrency|"@type":\s*"Offer"/i.test(text), false, 'no price typed on the page');
  assert.ok(app.includes("const CASE_IN = ['c-people', 'c-hours', 'c-report', 'c-share', 'c-months'];"), 'every input is read');
  for (const id of ['c-people', 'c-hours', 'c-report', 'c-share', 'c-months']) { assert.match(html, new RegExp('<input id="' + id + '" type="number"'), id); assert.ok(app.includes("num('" + id + "')"), id + ' goes into the law'); }
});
test('the vendored files are FallGarden Live\'s, byte for byte, and nothing else is unpinned', () => {
  const src = JSON.parse(read('SOURCES.json'));
  assert.equal(src.from, 'sjgant80-hub/fallgarden @ 775c3fa (live/)');
  assert.equal(src.files.length, 9);
  for (const f of src.files) assert.equal(createHash('sha256').update(readFileSync(new URL('../' + f.path, import.meta.url))).digest('hex'), f.sha256, f.path);
  const own = new Set(['index.html', 'app.mjs', 'broadcast.mjs', 'recorder.mjs', 'server.mjs', 'SOURCES.json', 'receipts.json', 'README.md', 'CLAIMS.md', 'RESULTS.md', 'LICENSE', 'package.json', '.gitignore', '.gitattributes']);
  const pinned = new Set(src.files.map((f) => f.path));
  for (const n of readdirSync(new URL('../', import.meta.url))) if (/\.m?js$/.test(n)) assert.ok(own.has(n) || pinned.has(n), n + ' is neither our own nor pinned');
  for (const n of readdirSync(new URL('../vendor/', import.meta.url))) assert.ok(pinned.has('vendor/' + n), 'vendor/' + n + ' is not pinned');
});
