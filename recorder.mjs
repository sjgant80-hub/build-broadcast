// build-broadcast · recorder.mjs — the episode file (§7.4). A minimal WebM writer: the browser's own encoder (WebCodecs)
// turns each frame, drawn on a fixed clock, into a VP8 chunk; this lays the chunks into a WebM file with their exact
// timestamps, so nothing about the file depends on the wall clock (B4). Also a small reader (for the tests and the
// checks) and the frame hash the reproduction check compares. Pure: bytes in, bytes out.

const te = new TextEncoder();
const isU8 = (x) => x instanceof Uint8Array;

/** vint(n) → an EBML variable-length size: the shortest of 1-8 bytes that holds n. */
export function vint(n) {
  const v = Number.isSafeInteger(n) ? Math.max(0, n) : 0;
  for (let len = 1; len <= 8; len++) {
    if (v < 2 ** (7 * len) - 1) {
      const out = new Uint8Array(len);
      let x = v;
      for (let i = len - 1; i >= 0; i--) { out[i] = x % 256; x = Math.floor(x / 256); }
      out[0] |= 0x80 >> (len - 1);
      return out;
    }
  }
  return vint(0);
}
const cat = (parts) => { const n = parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
/** el(id, body) → one EBML element: its id bytes, its size, its body. */
export function el(id, body) { const b = isU8(body) ? body : new Uint8Array(0); return cat([Uint8Array.from(id), vint(b.length), b]); }
/** uint(n) → the shortest big-endian bytes of n (at least one). */
export function uint(n) {
  let v = Number.isSafeInteger(n) ? Math.max(0, n) : 0;
  const bytes = [];
  do { bytes.unshift(v % 256); v = Math.floor(v / 256); } while (v > 0);
  return Uint8Array.from(bytes);
}
const f64 = (x) => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, Number.isFinite(x) ? x : 0); return b; };
export const ID = Object.freeze({
  EBML: [0x1a, 0x45, 0xdf, 0xa3], EBMLVersion: [0x42, 0x86], EBMLReadVersion: [0x42, 0xf7], EBMLMaxIDLength: [0x42, 0xf2], EBMLMaxSizeLength: [0x42, 0xf3],
  DocType: [0x42, 0x82], DocTypeVersion: [0x42, 0x87], DocTypeReadVersion: [0x42, 0x85], Segment: [0x18, 0x53, 0x80, 0x67], Info: [0x15, 0x49, 0xa9, 0x66],
  TimecodeScale: [0x2a, 0xd7, 0xb1], MuxingApp: [0x4d, 0x80], WritingApp: [0x57, 0x41], Duration: [0x44, 0x89], Tracks: [0x16, 0x54, 0xae, 0x6b],
  TrackEntry: [0xae], TrackNumber: [0xd7], TrackUID: [0x73, 0xc5], TrackType: [0x83], FlagLacing: [0x9c], CodecID: [0x86], Video: [0xe0],
  PixelWidth: [0xb0], PixelHeight: [0xba], Cluster: [0x1f, 0x43, 0xb6, 0x75], Timecode: [0xe7], SimpleBlock: [0xa3],
});
/** webm({ width, height, codec, chunks: [{ data, ts (µs), key }] }) → the file's bytes. A cluster starts at each key
 *  frame (and before a block would sit more than 30 s from its cluster's start); times are in milliseconds. */
export function webm(o) {
  const O = o && typeof o === 'object' ? o : {};
  const chunks = (Array.isArray(O.chunks) ? O.chunks : []).filter((c) => c && isU8(c.data) && Number.isFinite(c.ts));
  const w = Number.isSafeInteger(O.width) ? O.width : 0, h = Number.isSafeInteger(O.height) ? O.height : 0;
  const ms = (c) => Math.round(c.ts / 1000);
  const last = chunks.length ? ms(chunks[chunks.length - 1]) + Math.round((O.frameUs || 33333) / 1000) : 0;
  const header = el(ID.EBML, cat([el(ID.EBMLVersion, uint(1)), el(ID.EBMLReadVersion, uint(1)), el(ID.EBMLMaxIDLength, uint(4)), el(ID.EBMLMaxSizeLength, uint(8)),
    el(ID.DocType, te.encode('webm')), el(ID.DocTypeVersion, uint(2)), el(ID.DocTypeReadVersion, uint(2))]));
  const info = el(ID.Info, cat([el(ID.TimecodeScale, uint(1000000)), el(ID.MuxingApp, te.encode('build-broadcast')), el(ID.WritingApp, te.encode('build-broadcast')), el(ID.Duration, f64(last))]));
  const tracks = el(ID.Tracks, el(ID.TrackEntry, cat([el(ID.TrackNumber, uint(1)), el(ID.TrackUID, uint(1)), el(ID.TrackType, uint(1)), el(ID.FlagLacing, uint(0)),
    el(ID.CodecID, te.encode(typeof O.codec === 'string' && O.codec ? O.codec : 'V_VP8')), el(ID.Video, cat([el(ID.PixelWidth, uint(w)), el(ID.PixelHeight, uint(h))]))])));
  const clusters = [];
  let start = null, blocks = [];
  const flush = () => { if (start !== null) clusters.push(el(ID.Cluster, cat([el(ID.Timecode, uint(start)), ...blocks]))); blocks = []; };
  for (const c of chunks) {
    const t = ms(c);
    if (start === null || c.key === true || t - start > 30000) { flush(); start = t; }
    const rel = t - start, head = new Uint8Array(4);
    head[0] = 0x81; head[1] = (rel >> 8) & 0xff; head[2] = rel & 0xff; head[3] = c.key === true ? 0x80 : 0x00;
    blocks.push(el(ID.SimpleBlock, cat([head, c.data])));
  }
  flush();
  return cat([header, el(ID.Segment, cat([info, tracks, ...clusters]))]);
}

/** readVint(bytes, at) → { value, len } of an EBML size (or an id, with `keep` true: the marker bit kept). */
export function readVint(b, at, keep = false) {
  const first = b[at];
  if (first === undefined || first === 0) return { value: -1, len: 1 };
  let len = 1;
  while (!(first & (0x80 >> (len - 1)))) len++;   // a non-zero first byte has its marker within 8 bits
  let v = keep ? first : first & (0xff >> len);
  for (let i = 1; i < len; i++) v = v * 256 + (b[at + i] === undefined ? 0 : b[at + i]);
  return { value: v, len };
}
const MASTER = new Set([0x1a45dfa3, 0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0, 0x1f43b675]);
/** parseWebm(bytes) → { docType, width, height, codec, durationMs, clusters, blocks: [{ ms, key, size }] }: enough of the
 *  file to check what was written. */
export function parseWebm(bytes) {
  const b = isU8(bytes) ? bytes : new Uint8Array(0);
  const out = { docType: '', width: 0, height: 0, codec: '', durationMs: 0, clusters: 0, blocks: [] };
  let cluster = 0;
  const walk = (from, to) => {
    let at = from;
    while (at !== to) {
      const id = readVint(b, at, true); if (id.value === -1) return;
      const size = readVint(b, at + id.len); if (size.value === -1) return;
      const body = at + id.len + size.len, end = body + size.value;
      if (end > to) return;
      const u = () => { let v = 0; for (let i = body; i < end; i++) v = v * 256 + b[i]; return v; };
      const s = () => new TextDecoder().decode(b.subarray(body, end));
      if (MASTER.has(id.value)) { if (id.value === 0x1f43b675) out.clusters++; walk(body, end); }
      else if (id.value === 0x4282) out.docType = s();
      else if (id.value === 0xb0) out.width = u();
      else if (id.value === 0xba) out.height = u();
      else if (id.value === 0x86) out.codec = s();
      else if (id.value === 0x4489) out.durationMs = new DataView(b.buffer, b.byteOffset + body, 8).getFloat64(0);
      else if (id.value === 0xe7) cluster = u();
      else if (id.value === 0xa3) { const rel = (b[body + 1] << 8) | b[body + 2]; out.blocks.push({ ms: cluster + rel, key: (b[body + 3] & 0x80) !== 0, size: size.value - 4 }); }
      at = end;
    }
  };
  walk(0, b.length);
  return out;
}

/** frameHash(pixels) → FNV-1a over a frame's pixel bytes, 8 hex: two frames drawn alike hash alike. */
export function frameHash(px) {
  const p = px && typeof px.length === 'number' ? px : [];
  let h = 0x811c9dc5;
  for (let i = 0; i < p.length; i++) { h ^= p[i] & 0xff; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export default { vint, el, uint, ID, webm, readVint, parseWebm, frameHash };
