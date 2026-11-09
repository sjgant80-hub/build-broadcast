// build-broadcast · test/server.test.mjs — the local shell answers this machine only, saves recordings only where and as
// it should, and serves no private folder.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import S, { guard, saveName, makeServer } from '../server.mjs';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const srv = makeServer(PORT).listen(PORT, '127.0.0.1');
after(() => srv.close());
const call = (path, headers = {}, method = 'GET', body) => new Promise((done, fail) => {
  const r = request({ host: '127.0.0.1', port: PORT, path, method, headers: { host: '127.0.0.1:' + PORT, ...headers } }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => done({ status: res.statusCode, body: b, headers: res.headers })); });
  r.on('error', fail); if (body) r.write(body); r.end();
});

test('guard: this machine, this port, its own page; GET, or the one save', () => {
  const ok = (h) => guard({ method: 'GET', host: '127.0.0.1:9', path: '/', ...h }, 9);
  assert.deepEqual(ok({}), { ok: true }); assert.deepEqual(ok({ host: 'localhost:9' }), { ok: true });
  assert.deepEqual(ok({ method: 'HEAD' }), { ok: true }); assert.deepEqual(ok({ method: 'POST', path: '/api/save' }), { ok: true });
  assert.deepEqual(ok({ origin: 'http://127.0.0.1:9', fetchSite: 'same-origin' }), { ok: true }); assert.deepEqual(ok({ fetchSite: 'none' }), { ok: true });
  for (const [h, why] of [[{ host: 'evil.example' }, 'not this machine'], [{ host: '127.0.0.1:10' }, 'not this machine'], [{ host: undefined }, 'not this machine'],
    [{ origin: 'https://evil.example' }, 'another site'], [{ fetchSite: 'cross-site' }, 'another site'], [{ fetchSite: 'same-site' }, 'another site'],
    [{ method: 'POST', path: '/api/live' }, 'only GET, and POST to /api/save'], [{ method: 'DELETE' }, 'only GET, and POST to /api/save'], [{ method: 'PUT', path: '/api/save' }, 'only GET, and POST to /api/save']]) {
    assert.deepEqual(ok(h), { ok: false, why }, JSON.stringify(h));
  }
});

test('a recording is saved only as name.webm, name.vtt or name.frames.json', () => {
  for (const n of ['fallgarden-live.webm', 'a.vtt', 'x-short1.frames.json', 'a1-b2.webm']) assert.equal(saveName(n), n);
  for (const n of ['../x.webm', 'a/b.webm', 'X.webm', '-a.webm', 'a.exe', 'a.webm.exe', '', null, 'a'.repeat(90) + '.webm', 'a.json', '.webm']) assert.equal(saveName(n), '', String(n));
});

test('the server: hello, an empty live feed, the page, a save, and every refusal', async () => {
  const hello = JSON.parse((await call('/api/hello')).body);
  assert.equal(hello.ok, true); assert.equal(hello.server, 'build-broadcast'); assert.equal(hello.live, null, 'no live repo given');
  const live = JSON.parse((await call('/api/live?since=0')).body);
  assert.ok(Array.isArray(live.events));
  const page = await call('/');
  assert.equal(page.status, 200); assert.match(page.headers['content-type'], /text\/html/); assert.equal(page.headers['cache-control'], 'no-store'); assert.match(page.body, /Build Broadcast/);
  assert.match((await call('/app.mjs')).headers['content-type'], /javascript/);
  for (const p of ['/.git/config', '/live/live.log.json', '/node_modules/x', '/missing.mjs']) assert.equal((await call(p)).status, 404, p);
  assert.ok([403, 404].includes((await call('/..%2F..%2Fsecret.txt')).status));
  assert.equal((await call('/%E0%A4%A')).status, 400);
  for (const [h, m] of [[{ host: 'evil.example' }, 'GET'], [{ origin: 'https://evil.example' }, 'GET'], [{ 'sec-fetch-site': 'cross-site' }, 'GET'], [{}, 'DELETE']]) {
    const r = await call('/api/hello', h, m); assert.equal(r.status, 403, JSON.stringify(h)); assert.match(r.body, /^refused: /);
  }
  const bad = await call('/api/save?name=../x.webm', {}, 'POST', 'x');
  assert.equal(bad.status, 400);
  const name = 'test-' + PORT + '.vtt', file = new URL('../recordings/' + name, import.meta.url);
  const saved = await call('/api/save?name=' + name, { 'content-type': 'text/vtt' }, 'POST', 'WEBVTT\n');
  assert.equal(saved.status, 200); assert.deepEqual(JSON.parse(saved.body), { ok: true, saved: 'recordings/' + name, bytes: 7 });
  assert.ok(existsSync(file)); assert.equal(readFileSync(file, 'utf8'), 'WEBVTT\n'); unlinkSync(file);
  assert.deepEqual(Object.keys(S), ['guard', 'saveName', 'makeServer']);
});
