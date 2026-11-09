// build-broadcast · test/recorder.test.mjs — the episode file (B4): the WebM is laid out exactly from the chunks and their
// timestamps (so the same frames make the same file), and it reads back as written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import W, { vint, el, uint, ID, webm, readVint, parseWebm, frameHash } from '../recorder.mjs';

test('EBML pieces: sizes, unsigned numbers and elements', () => {
  assert.deepEqual([...vint(0)], [0x80]); assert.deepEqual([...vint(5)], [0x85]); assert.deepEqual([...vint(126)], [0xfe]);
  assert.deepEqual([...vint(127)], [0x40, 0x7f], '127 is reserved in one byte'); assert.deepEqual([...vint(300)], [0x41, 0x2c]);
  assert.deepEqual([...vint(16382)], [0x7f, 0xfe]); assert.deepEqual([...vint(16383)], [0x20, 0x3f, 0xff]); assert.deepEqual([...vint(2 ** 21)], [0x10, 0x20, 0x00, 0x00]);
  assert.deepEqual([...vint(-3)], [0x80]); assert.deepEqual([...vint(1.5)], [0x80]); assert.equal(vint(2 ** 50).length, 8); assert.equal(vint(2 ** 56).length, 1, 'beyond 8 bytes: nothing');
  for (const n of [0, 1, 126, 127, 300, 16383, 70000, 2 ** 28, 2 ** 40]) { const v = vint(n); assert.deepEqual(readVint(v, 0), { value: n, len: v.length }, String(n)); }
  assert.deepEqual([...uint(0)], [0]); assert.deepEqual([...uint(255)], [255]); assert.deepEqual([...uint(256)], [1, 0]); assert.deepEqual([...uint(1000000)], [0x0f, 0x42, 0x40]);
  assert.deepEqual([...uint(-1)], [0]); assert.deepEqual([...uint('x')], [0]);
  assert.deepEqual([...el([0x86], new Uint8Array([1, 2]))], [0x86, 0x82, 1, 2]); assert.deepEqual([...el([0x1a, 0x45], null)], [0x1a, 0x45, 0x80]);
  assert.deepEqual(readVint(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]), 0, true), { value: 0x1a45dfa3, len: 4 }, 'an id keeps its marker');
  assert.deepEqual(readVint(Uint8Array.from([0]), 0), { value: -1, len: 1 }); assert.deepEqual(readVint(new Uint8Array(0), 0), { value: -1, len: 1 });
  assert.deepEqual(readVint(Uint8Array.from([0x40]), 0), { value: 0, len: 2 }, 'a cut-off size reads as zeros, never throws');
  assert.ok(Object.isFrozen(ID)); assert.deepEqual(ID.SimpleBlock, [0xa3]); assert.deepEqual(ID.Cluster, [0x1f, 0x43, 0xb6, 0x75]);
});

const chunk = (n, ts, key) => ({ data: Uint8Array.from({ length: n }, (_, i) => (i * 7 + ts) % 256), ts, key });

test('B4: a WebM laid out from its chunks: header, track, clusters at key frames, blocks at their times', () => {
  const chunks = [chunk(10, 0, true), chunk(4, 33333, false), chunk(5, 66667, false), chunk(9, 2000000, true), chunk(3, 2033333, false)];
  const bytes = webm({ width: 1280, height: 720, codec: 'V_VP8', chunks, frameUs: 33333 });
  const p = parseWebm(bytes);
  assert.equal(p.docType, 'webm'); assert.equal(p.width, 1280); assert.equal(p.height, 720); assert.equal(p.codec, 'V_VP8');
  assert.equal(p.clusters, 2, 'a cluster at each key frame');
  assert.deepEqual(p.blocks, [{ ms: 0, key: true, size: 10 }, { ms: 33, key: false, size: 4 }, { ms: 67, key: false, size: 5 }, { ms: 2000, key: true, size: 9 }, { ms: 2033, key: false, size: 3 }]);
  assert.equal(p.durationMs, 2033 + 33, 'the last frame and its length');
  assert.deepEqual([...bytes.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3]);
  const again = webm({ width: 1280, height: 720, codec: 'V_VP8', chunks: chunks.map((c) => ({ ...c, data: c.data.slice() })), frameUs: 33333 });
  assert.equal(createHash('sha256').update(again).digest('hex'), createHash('sha256').update(bytes).digest('hex'), 'the same chunks, the same file, byte for byte');
  const other = webm({ width: 1280, height: 720, codec: 'V_VP8', chunks: [...chunks.slice(0, 4), chunk(3, 2066667, false)], frameUs: 33333 });
  assert.notEqual(createHash('sha256').update(other).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
  // a cluster never holds a block more than 30 s from its start
  const long = webm({ width: 2, height: 2, chunks: [chunk(1, 0, true), chunk(1, 29000000, false), chunk(1, 31000000, false)] });
  assert.deepEqual(parseWebm(long).blocks.map((b) => [b.ms, b.key]), [[0, true], [29000, false], [31000, false]]);
  assert.equal(parseWebm(long).clusters, 2);
  const edge = webm({ width: 2, height: 2, chunks: [chunk(1, 0, true), chunk(1, 30000000, false), chunk(1, 30001000, false), chunk(1, 60001000, false)] });
  assert.equal(parseWebm(edge).clusters, 2, 'exactly 30 s from the start of a cluster stays in it; past it, a new one (at 30.001 s, which then holds 60.001 s)');
  assert.equal(parseWebm(webm({ codec: 'V_VP9', chunks: [chunk(1, 0, true)] })).codec, 'V_VP9');
  assert.equal(parseWebm(webm({ codec: 5, chunks: [chunk(1, 0, true)] })).codec, 'V_VP8'); assert.equal(parseWebm(webm({ codec: '', chunks: [chunk(1, 0, true)] })).codec, 'V_VP8');
  // an empty element (size 0) is read past, not a stop
  const withEmpty = Uint8Array.from([...el(ID.Video, new Uint8Array(0)), ...el(ID.PixelWidth, uint(7))]);
  assert.equal(parseWebm(withEmpty).width, 7);
  const def = parseWebm(webm({ chunks: [chunk(1, 0, true)] }));
  assert.equal(def.codec, 'V_VP8'); assert.equal(def.width, 0); assert.equal(def.durationMs, 33, 'a default frame length');
  assert.equal(parseWebm(webm({ chunks: [chunk(1, 0, 'yes')] })).clusters, 1, 'the first chunk opens a cluster');
  assert.equal(parseWebm(webm({ chunks: [chunk(1, 0, 'yes')] })).blocks[0].key, false, 'only a real true is a key frame');
  const empty = parseWebm(webm(null));
  assert.equal(empty.docType, 'webm'); assert.equal(empty.clusters, 0); assert.equal(empty.durationMs, 0);
  assert.equal(parseWebm(webm({ chunks: [{ data: 'x', ts: 0 }, { data: new Uint8Array(1), ts: NaN }, null] })).blocks.length, 0, 'bad chunks are left out');
});

test('the reader never throws on garbage, and a frame hash is FNV-1a over the bytes', () => {
  for (const g of [null, 'x', new Uint8Array(0), Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x88, 1]), Uint8Array.from([0xff, 0xff, 0xff]), Uint8Array.from([0x1f, 0x43, 0xb6, 0x75, 0x81, 0xe7])]) parseWebm(g);
  assert.equal(frameHash(new Uint8Array(0)), '811c9dc5'); assert.equal(frameHash(Uint8Array.from([97])), 'e40c292c', 'FNV-1a of "a"');
  assert.equal(frameHash([97, 98]), frameHash(Uint8Array.from([97, 98]))); assert.notEqual(frameHash([1, 2]), frameHash([2, 1])); assert.equal(frameHash(null), '811c9dc5');
  assert.equal(frameHash([353]), frameHash([97]), 'bytes, so only the low 8 bits count');
  assert.deepEqual(Object.keys(W), ['vint', 'el', 'uint', 'ID', 'webm', 'readVint', 'parseWebm', 'frameHash']);
});
