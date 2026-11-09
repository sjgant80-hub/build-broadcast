// build-broadcast · app.mjs — the page's glue. It loads a real build's log, turns it into the episode script (the law,
// broadcast.mjs), and plays it: each beat's kernel events go to FallGarden Live's engine (the Living Visual draws them),
// its line goes on the caption bar (and to a voice on this device, if you turn one on), each kernel event's message
// runs along the LIGHT strip. It can record the episode to a WebM file on a fixed clock (recorder.mjs), cut Shorts, and
// play a build LIVE from the local tap. It decides nothing itself: the law does.
import K from './kernel.mjs';
import { createEngine } from './engine.mjs';
import B from './broadcast.mjs';
import W from './recorder.mjs';
import { prime, encode, decode } from './vendor/light-codec.mjs';
import { LIGHT_DICT } from './dict.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt !== undefined) x.textContent = txt; return x; };
const te = new TextEncoder(), td = new TextDecoder();
const PRIMED = prime(te.encode(LIGHT_DICT));
const qs = new URLSearchParams(location.search);
const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
const S = { episodes: [], ep: null, log: null, script: null, mode: 'recorded', t: 0, playing: false, speed: 1, k: 0, beat: -1, state: K.emptyState(), engine: null,
  dirty: true, voice: null, voiceOn: false, stream: [], stopAt: null, live: null, recording: null, server: false };
const fmt = (sec) => { const s = Math.max(0, Math.floor(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ── the LIGHT strip: each kernel event's message, coded and decodable ────────────────────────────────────────────
const braille = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(0x2800 + u8[i]); return s; };
function pushStream(ke, i) {
  const p = K.packetOf(ke);
  if (!p) return;
  const r = encode(te.encode(JSON.stringify(p)), PRIMED);
  if (r.ok) { S.stream.push({ ke, i, p, light: r.bytes }); if (S.stream.length > 400) S.stream.splice(0, S.stream.length - 400); }
}
function renderStrip() {
  const box = $('lines'), frag = document.createDocumentFragment();
  for (let j = Math.max(0, S.stream.length - 4); j < S.stream.length; j++) { const d = el('div', '', braille(S.stream[j].light)); d.dataset.j = String(j); frag.appendChild(d); }
  box.replaceChildren(frag);
}
$('lines').addEventListener('mouseover', (e) => {
  const d = e.target.closest('div[data-j]'), item = d && S.stream[Number(d.dataset.j)];
  if (!item) return;
  const out = decode(item.light, PRIMED);
  const be = S.log.events[item.ke.bi] || {};
  $('lineread').textContent = out.ok ? K.say(JSON.parse(td.decode(out.bytes))) + ' · from ' + (be.src || '?') : 'refused: ' + out.why;
});
$('lines').addEventListener('mouseleave', () => { $('lineread').textContent = ''; });

// ── the player ─────────────────────────────────────────────────────────────────────────────────────────────────────
function reset() {
  S.state = K.emptyState(); S.k = 0; S.t = 0; S.beat = -1; S.stream = [];
  const fin = K.replay(S.script.kernel);
  S.engine.reset(fin.nodes.size + 8, fin.edges.size + 8);
  S.dirty = true; caption(); renderStrip();
}
/** applyTo(t, stream) → every kernel event of the script up to time t into the state; streamed ones also light up. */
function applyTo(t, stream) {
  const now = performance.now(), ks = S.script.kernel;
  while (S.k < ks.length && ks[S.k].time <= t) {
    const ke = ks[S.k];
    K.apply(S.state, ke);
    if ((ke.t === 'born' || ke.t === 'germinate') && ke.to && S.state.nodes.has(ke.id)) S.state.nodes.get(ke.id).parent = ke.to;
    if (stream) { S.engine.pulse(ke, now, S.k); pushStream(ke, S.k); }
    S.k++; S.dirty = true;
  }
}
function seek(t) {
  const to = Math.max(0, Math.min(t, S.script.duration));
  if (to < S.t) reset();
  applyTo(to - 1.5, false); applyTo(to, true);
  S.t = to; caption();
}
function beatAt(t) { const b = S.script.beats; let lo = -1; for (let i = 0; i < b.length; i++) { if (b[i].t <= t) lo = i; else break; } return lo; }
function caption() {
  const i = beatAt(S.t);
  $('pos').textContent = fmt(S.t) + ' / ' + fmt(S.script ? S.script.duration : 0);
  $('scrub').value = String(Math.round(S.t * 10));
  if (i === S.beat) return;
  S.beat = i;
  const b = i >= 0 ? S.script.beats[i] : null;
  $('cap').textContent = b ? b.line : '';
  $('cap').classList.toggle('fail', !!(b && b.fail));
  const src = b && b.events.length ? (S.log.events[b.events[0]] || {}).src : '';
  $('capsub').textContent = b && (b.sub || src) ? 'the real record: ' + [b.sub, src].filter(Boolean).join(' · ') : '';
  if (b && S.voiceOn && S.voice && S.playing) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(b.line); u.voice = S.voice; u.rate = 0.95; speechSynthesis.speak(u); }
}
function setLabel() {
  const live = S.mode === 'live';
  $('label').textContent = B.labelFor(S.mode, S.log);
  $('label').classList.toggle('live', live);
}
async function openEpisode(ep) {
  S.playing = false; $('play').textContent = '▶ Play'; speechSynthesis.cancel();
  S.ep = ep; S.mode = ep.live ? 'live' : 'recorded';
  for (const b of document.querySelectorAll('#eps button')) b.setAttribute('aria-pressed', String(b.dataset.id === ep.id));
  S.log = ep.live ? await liveLog(0) : await (await fetch('./episodes/' + ep.id + '.log.json', { cache: 'no-store' })).json();
  S.script = B.scriptOf(S.log);
  $('scrub').max = String(Math.round(S.script.duration * 10));
  $('title').textContent = S.log.title || ep.title;
  $('meta').textContent = S.log.events.length.toLocaleString('en-GB') + ' real build events · ' + S.script.beats.length + ' beats · ' + fmt(S.script.duration) + ' · script ' + S.script.hash
    + (S.script.beats.some((b) => b.fail) ? ' · ' + S.script.beats.filter((b) => b.fail).length + ' failure' + (S.script.beats.filter((b) => b.fail).length === 1 ? '' : 's') + ', said plainly' : '');
  setLabel(); reset(); renderShorts();
  if (ep.live) { seek(S.script.duration); S.playing = true; }
  history.replaceState(null, '', '?ep=' + encodeURIComponent(ep.id));
}
function renderShorts() {
  const box = $('shorts'); box.replaceChildren();
  if (S.mode === 'live') { box.append(el('li', 'muted', 'Shorts are cut from a recorded episode.')); return; }
  B.shortsOf(S.script).forEach((c, n) => {
    const li = el('li'), lines = S.script.beats.slice(c.from, c.to + 1);
    li.append(el('b', '', 'Short ' + (n + 1) + ' · ' + fmt(c.t) + '–' + fmt(c.t + c.dur) + ' (' + c.dur + ' s) '), el('span', 'muted', lines.length + ' beats' + (lines.some((x) => x.fail) ? ', with a failure' : '') + ': “' + lines[0].line.slice(0, 70) + '…”'));
    const play = el('button', '', '▶ watch'); play.onclick = () => { seek(c.t); S.stopAt = c.t + c.dur; S.playing = true; $('play').textContent = '❚❚ Pause'; };
    const rec = el('button', '', '● record this Short'); rec.onclick = () => record({ from: c.t, to: c.t + c.dur, name: S.ep.id + '-short' + (n + 1) });
    li.append(' ', play, ' ', rec); box.appendChild(li);
  });
}

// ── live: the local tap (127.0.0.1 only), labelled LIVE, never a replay dressed as live ─────────────────────────────
async function liveLog(since) {
  const r = await fetch('./api/live?since=' + since, { cache: 'no-store' });
  return r.ok ? r.json() : { events: [] };
}
async function pollLive() {
  if (!S.ep || !S.ep.live) return;
  const r = await liveLog(S.log.events.length);
  if (!Array.isArray(r.events) || !r.events.length) return;
  S.log = { ...S.log, ...r.meta, events: [...S.log.events, ...r.events] };
  const at = S.script.duration;
  S.script = B.scriptOf(S.log);
  $('scrub').max = String(Math.round(S.script.duration * 10));
  seek(Math.min(at, S.script.duration)); S.playing = true;   // the new beats play now, as they arrive
}

// ── the recorder: the episode drawn on a fixed clock, 30 frames a second, encoded, laid into WebM (B4) ───────────────
async function record(range = {}) {
  if (S.recording) return;
  if (typeof VideoEncoder === 'undefined') { $('recnote').textContent = 'This browser has no WebCodecs video encoder, so it cannot record. Play the episode instead.'; return; }
  const FPS = 30, Wd = 1280, Ht = 720, from = range.from || 0, to = range.to || S.script.duration, name = range.name || S.ep.id;
  const stage = $('stage'), oldStyle = stage.getAttribute('style') || '';
  stage.style.width = Wd + 'px'; stage.style.height = Ht + 'px'; stage.style.maxWidth = 'none';
  const comp = new OffscreenCanvas(Wd, Ht), g = comp.getContext('2d'), small = new OffscreenCanvas(160, 90), gs = small.getContext('2d', { willReadFrequently: true });
  const chunks = [], hashes = [];
  const enc = new VideoEncoder({ output: (c) => { const d = new Uint8Array(c.byteLength); c.copyTo(d); chunks.push({ data: d, ts: c.timestamp, key: c.type === 'key' }); }, error: (e) => { S.recording.error = String(e); } });
  enc.configure({ codec: 'vp8', width: Wd, height: Ht, bitrate: 3000000, framerate: FPS, hardwareAcceleration: 'prefer-software', latencyMode: 'quality' });
  const realNow = performance.now.bind(performance);
  let virtual = 10000;
  S.recording = { name, frame: 0, frames: Math.ceil((to - from) * FPS), error: null };
  const wasPlaying = S.playing; S.playing = false; speechSynthesis.cancel();
  performance.now = () => virtual;   // every clock inside the renderer reads the fixed clock while recording
  try {
    // the renderer takes the recording's size before anything is placed (new cells start round the canvas's centre)
    if (S.engine.R) S.engine.R.resize();
    reset(); S.engine.cam.manual = false;
    applyTo(from - 1.5, false);
    for (let f = 0; f < S.recording.frames; f++) {
      virtual = 10000 + (f * 1000) / FPS;
      const t = from + f / FPS;
      applyTo(t, true); S.t = t; caption();
      if (S.dirty) { S.engine.sync(S.state); S.dirty = false; }
      S.engine.frame(S.state, virtual, 1 / FPS);
      // copy the frame in the same task it was drawn (after an await the browser may already have presented it), then wait
      g.drawImage($('gl'), 0, 0, Wd, Ht); g.drawImage($('overlay'), 0, 0, Wd, Ht);
      drawCaption(g, Wd, Ht);
      await S.engine.idle();
      gs.drawImage(comp, 0, 0, 160, 90); hashes.push(W.frameHash(gs.getImageData(0, 0, 160, 90).data));
      const vf = new VideoFrame(comp, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: f % 60 === 0 }); vf.close();
      if (enc.encodeQueueSize > 12) await enc.flush();
      S.recording.frame = f + 1;
      if (f % 15 === 0) $('recnote').textContent = 'recording ' + name + ': frame ' + (f + 1) + ' of ' + S.recording.frames + ' (drawn on a fixed clock, so it takes as long as it takes)';
    }
    await enc.flush(); enc.close();
  } finally {
    performance.now = realNow;
    stage.setAttribute('style', oldStyle);
  }
  const bytes = W.webm({ width: Wd, height: Ht, codec: 'V_VP8', chunks, frameUs: Math.round(1e6 / FPS) });
  const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((x) => x.toString(16).padStart(2, '0')).join('');
  const vtt = B.vttOf({ beats: S.script.beats.filter((b) => b.t >= from - 0.01 && b.t < to).map((b) => ({ ...b, t: b.t - from })) });
  const framesHash = W.frameHash(te.encode(hashes.join('')));
  const result = { name, frames: hashes.length, bytes: bytes.length, sha256: sha, framesHash, script: S.script.hash, vtt: W.frameHash(te.encode(vtt)), error: S.recording.error };
  S.recording = null; S.lastRecording = { ...result, hashes };
  if (S.server) {
    for (const [file, body] of [[name + '.webm', bytes], [name + '.vtt', te.encode(vtt)], [name + '.frames.json', te.encode(JSON.stringify({ ...result, hashes }))]]) {
      await fetch('./api/save?name=' + encodeURIComponent(file), { method: 'POST', body });
    }
    $('recnote').textContent = 'saved recordings/' + name + '.webm (' + (bytes.length / 1048576).toFixed(1) + ' MB, ' + hashes.length + ' frames), its captions and its frame hashes';
  } else {
    const a = el('a', '', 'save ' + name + '.webm (' + (bytes.length / 1048576).toFixed(1) + ' MB)'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' })); a.download = name + '.webm';
    const v = el('a', '', 'its captions (.vtt)'); v.href = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })); v.download = name + '.vtt';
    $('recnote').replaceChildren('recorded on a fixed clock: ', a, ' · ', v);
  }
  if (wasPlaying) S.playing = true;
  return result;
}
function drawCaption(g, w, h) {
  const b = S.beat >= 0 ? S.script.beats[S.beat] : null;
  g.save();
  g.fillStyle = 'rgba(5,7,14,0.72)'; g.fillRect(0, h - 96, w, 96);
  g.font = '600 26px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = b && b.fail ? '#ff6a5c' : '#f2f4fa';
  const words = (b ? b.line : '').split(' '), rows = [''];
  for (const wd of words) { const tryRow = (rows[rows.length - 1] + ' ' + wd).trim(); if (g.measureText(tryRow).width > w - 80 && rows[rows.length - 1]) rows.push(wd); else rows[rows.length - 1] = tryRow; }
  rows.slice(0, 2).forEach((r, i) => g.fillText(r, w / 2, h - 66 + i * 32));
  g.font = '600 14px Inter, system-ui, sans-serif'; g.textAlign = 'left'; g.fillStyle = S.mode === 'live' ? '#ff5f57' : '#9fb4d9';
  g.fillText(B.labelFor(S.mode, S.log), 16, 22);
  g.restore();
}

// ── the loop and the controls ──────────────────────────────────────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  if (!S.recording && S.script) {
    if (S.playing) {
      S.t += dt * S.speed;
      if (S.stopAt !== null && S.t >= S.stopAt) { S.playing = false; S.stopAt = null; $('play').textContent = '▶ Play'; }
      if (S.t >= S.script.duration) { S.t = S.script.duration; if (S.mode !== 'live') { S.playing = false; $('play').textContent = '▶ Play'; } }
      applyTo(S.t, true); caption();
    }
    if (S.dirty) { S.engine.sync(S.state); S.dirty = false; renderStrip(); }
    S.engine.frame(S.state, now, dt);
  }
  requestAnimationFrame(frame);
}
function voices() {
  // local voices only: a voice that speaks through the network would send the narration off this device
  const v = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices().filter((x) => x.localService && /^en/i.test(x.lang)) : [];
  S.voice = v.find((x) => /GB/i.test(x.lang)) || v[0] || null;
  $('voice').disabled = !S.voice;
  $('voice').title = S.voice ? 'Speak each line with ' + S.voice.name + ' (a voice on this device; nothing leaves it)' : 'No voice on this device works offline, so the narration is captions only';
}
function wire() {
  $('play').onclick = () => { if (S.t >= S.script.duration && S.mode !== 'live') seek(0); S.playing = !S.playing; S.stopAt = null; $('play').textContent = S.playing ? '❚❚ Pause' : '▶ Play'; if (!S.playing) speechSynthesis.cancel(); };
  $('restart').onclick = () => { seek(0); S.playing = true; $('play').textContent = '❚❚ Pause'; };
  $('scrub').oninput = () => { S.playing = false; $('play').textContent = '▶ Play'; seek(Number($('scrub').value) / 10); };
  $('speed').onchange = () => { S.speed = Number($('speed').value) || 1; };
  $('voice').onclick = () => { S.voiceOn = !S.voiceOn; $('voice').setAttribute('aria-pressed', String(S.voiceOn)); if (!S.voiceOn) speechSynthesis.cancel(); };
  $('record').onclick = () => record();
  $('fit').onclick = () => { S.engine.cam.manual = false; };
  const stage = $('stage');
  stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); if (S.engine.pointer) S.engine.pointer(e.clientX - r.left, e.clientY - r.top); });
  stage.addEventListener('wheel', (e) => { e.preventDefault(); S.engine.cam.manual = true; S.engine.cam.zoom = Math.max(0.05, Math.min(8, S.engine.cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1))); }, { passive: false });
  if (typeof speechSynthesis !== 'undefined') { voices(); speechSynthesis.onvoiceschanged = voices; } else $('voice').disabled = true;
}
async function main() {
  S.engine = await createEngine($('gl'), $('overlay'), { gpu: qs.get('gpu') === '0' ? false : undefined });
  $('engine').textContent = S.engine.kind === 'webgpu' ? 'WebGPU · the Living Visual: every cell, link and light is a real build event' : 'No WebGPU here: the same real build on a plainer 2D canvas (no video, no stand-in)';
  const idx = await (await fetch('./episodes/index.json', { cache: 'no-store' })).json();
  try {
    const R = await (await fetch('./receipts.json', { cache: 'no-store' })).json();
    const g = (x, name) => (x ? name + ': ' + x.killed + ' of ' + x.total + ' broken copies caught, ' + x.ignored + ' set aside' : '');
    $('receipts').textContent = 'Checked on GitHub\'s own computer on every change: ' + [g(R.law, 'the law'), g(R.recorder, 'the recorder')].filter(Boolean).join('; ')
      + (R.law || R.recorder ? '. ' : '') + Object.entries(R.episodes).map(([id, e]) => id + ': ' + e.events + ' real events, ' + e.beats + ' lines, ' + e.failures + ' failure' + (e.failures === 1 ? '' : 's') + ' said plainly, fingerprint ' + e.hash).join(' · ') + '.';
  } catch { $('receipts').textContent = ''; }
  S.episodes = idx.episodes;
  if (LOCAL) { try { const h = await (await fetch('./api/hello', { cache: 'no-store' })).json(); S.server = h.ok === true; if (h.live) S.episodes = [...S.episodes, { id: 'live', title: h.live, live: true }]; } catch { S.server = false; } }
  const box = $('eps');
  for (const ep of S.episodes) { const b = el('button', ep.live ? 'live' : '', (ep.live ? '● LIVE · ' : '') + ep.title); b.dataset.id = ep.id; b.onclick = () => openEpisode(ep); box.appendChild(b); }
  window.__bb = { S, K, B, W, record, seek, applyTo };
  wire();
  const want = S.episodes.find((e) => e.id === qs.get('ep')) || S.episodes[0];
  await openEpisode(want);
  if (S.server) setInterval(() => { pollLive().catch(() => {}); }, 5000);
  requestAnimationFrame(frame);
}
main().catch((e) => { $('engine').textContent = 'the page failed to start: ' + String((e && e.message) || e); console.error(e); });
