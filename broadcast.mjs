// build-broadcast · broadcast.mjs — the law (2026-11-09; claims CLAIMS.md, sealed 7081f1a). A real build's log becomes a
// broadcast: the kernel events the Living Visual draws, one plain sentence per beat for a 12-year-old, the timing, the
// caption track, the Shorts, and the RECORDED / LIVE label. Plus the redaction every string passes through (B5) and the
// audit's comparison (B1). Pure and total: garbage never throws, and the same log always gives the same broadcast (B4).

const str = (x) => (typeof x === 'string' ? x : '');
const arr = (x) => (Array.isArray(x) ? x : []);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const int = (x) => (Number.isSafeInteger(x) ? x : 0);

// ── B5: nothing secret reaches a log, a script or a caption ──────────────────────────────────────────────────────
export const SECRETS = Object.freeze([
  /gh[pousr]_[A-Za-z0-9]{20,}/g, /github_pat_[A-Za-z0-9_]{20,}/g, /AKIA[0-9A-Z]{16}/g, /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  /sk-[A-Za-z0-9_-]{20,}/g, /xox[abprs]-[A-Za-z0-9-]{10,}/g, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
]);
export const REDACTED = '‹redacted›', PRIVATE = '‹private›';
/** secretsIn(text) → every secret-shaped piece of the text (empty when it is clean). */
export function secretsIn(text) {
  const t = str(text), out = [];
  for (const re of SECRETS) for (const m of t.matchAll(re)) out.push(m[0]);
  return out;
}
/** redact(text, privateNames) → the text with every secret-shaped piece and every private repo name (as a whole word,
 *  any case) replaced, so a log written by the tap can carry none of them. */
export function redact(text, privateNames) {
  let t = str(text);
  for (const re of SECRETS) t = t.replace(re, REDACTED);
  const names = arr(privateNames).map(str).filter((n) => n.length >= 3).sort((a, b) => b.length - a.length);
  for (const n of names) {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp('(?<![A-Za-z0-9_-])' + esc + '(?![A-Za-z0-9_-])', 'gi'), PRIVATE);
  }
  return t;
}

// ── a file's part in the build, in plain words ──────────────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  promises: 'the promises', scorecard: 'the scorecard', check: 'a set of checks', robot: 'the checking robot\'s orders',
  page: 'the web page', helper: 'a helper tool', data: 'some data', borrowed: 'a part borrowed from another project',
  notes: 'some notes', part: 'a working part', file: 'a file',
});
/** roleOf(path) → what a file is for: its promises, its scorecard, its checks, a part, the page, and so on. */
export function roleOf(path) {
  const p = str(path);
  const base = p.split('/').pop();
  if (/^CLAIMS.*\.md$/i.test(base)) return 'promises';
  if (/^RESULTS.*\.md$/i.test(base)) return 'scorecard';
  if (/\.test\.m?js$/.test(base)) return 'check';
  if (/^\.github\/workflows\//.test(p)) return 'robot';
  if (/\.html?$/.test(base)) return 'page';
  if (/(^|\/)vendor\//.test(p)) return 'borrowed';
  if (/(^|\/)tools\//.test(p)) return 'helper';
  if (/(^|\/)data\//.test(p) || /\.json$/.test(base)) return 'data';
  if (/\.md$/i.test(base)) return 'notes';
  if (/\.m?js$/.test(base)) return 'part';
  return 'file';
}
/** nameOf(path) → a file's short name for speech: no folders, no extension. */
export function nameOf(path) { const b = str(path).split('/').pop(); return b.replace(/\.(test\.)?(mjs|js|json|html?|md|yml|yaml|txt|css|svg)$/i, '') || b; }
const FIX = /\b(fix|fixed|fixes|broke|broken|bug|was cut|never (wired|defined)|wasn't|missing|wrong)\b/i;

// ── plain words (B2): a 12-year-old can follow every line ──────────────────────────────────────────────────────────
/** syllables(word) → a count of the word's syllables (vowel groups, a silent final e dropped, at least one). */
export function syllables(word) {
  const w = str(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return /\d/.test(str(word)) ? 1 : 0;
  const groups = (w.match(/[aeiouy]+/g) || []).length - (/[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w) ? 1 : 0);
  return Math.max(1, groups);
}
/** grade(text) → its Flesch-Kincaid grade: 0.39 × words per sentence + 11.8 × syllables per word − 15.59. */
export function grade(text) {
  const t = str(text);
  const words = t.split(/\s+/).map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')).filter(Boolean);
  if (!words.length) return 0;
  const sentences = Math.max(1, (t.match(/[.!?]+(\s|$)/g) || []).length);
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}
export const MAX_GRADE = 7;
export const JARGON = Object.freeze(['commit', 'repository', 'repo', 'mutation', 'mutant', 'witness', 'kernel', 'shader', 'webgpu', 'api', 'json',
  'merge', 'deploy', 'pipeline', 'regex', 'async', 'module', 'runtime', 'ci', 'workflow', 'hash', 'sha', 'npm', 'node.js', 'refactor']);
/** jargonIn(line) → the jargon words in a line that has no gloss ("which means …"); empty means plain enough. */
export function jargonIn(line) {
  const t = str(line).toLowerCase();
  if (t.includes('which means')) return [];
  return JARGON.filter((j) => new RegExp('(^|[^a-z0-9.])' + j.replace('.', '\\.') + '([^a-z0-9]|$)').test(t));
}
/** plain(line) → is the line plain: at most grade 7 and no unglossed jargon? */
export function plain(line) { return Math.round(grade(line) * 10) / 10 <= MAX_GRADE && jargonIn(line).length === 0; }   // the grade to one decimal, as shown

// ── the narrator (§3): each kind of build event, a plain template filled with its own specifics ─────────────────────
const n0 = (n) => int(n).toLocaleString('en-GB');
const s = (n) => (int(n) === 1 ? '' : 's');
const list = (xs) => { const a = arr(xs).filter(Boolean); return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
/** GLOSS: a name that is itself jargon is said with what it means, in the same line. */
export const GLOSS = Object.freeze({ kernel: 'the core rules', witness: 'the checker that breaks things', api: 'the door other programs use', json: 'a data file',
  module: 'a part', commit: 'a saved step', workflow: 'the robot\'s orders', shader: 'a drawing program', webgpu: 'the graphics chip', mutation: 'a change' });
/** say(name) → a file's name as spoken: as it is, or with its meaning when the name is jargon. */
export function say(name) { const n = str(name), g = GLOSS[n.toLowerCase()]; return g ? n + ' (which means ' + g + ')' : n; }
/** narrate(beat) → the line spoken for one beat, from its kind and its real specifics. Failures say what broke and
 *  what happens next (B3). An unknown kind says nothing (no narration without a real event, B2). */
export function narrate(b) {
  if (!isObj(b)) return '';
  const k = str(b.kind);
  if (k === 'start') return 'This is the story of ' + (str(b.title) || 'a real build') + '. Watch it grow, one real step at a time.';
  if (k === 'commit') {
    const added = arr(b.added), changed = int(b.changed);
    if (b.fix === true) return 'Kar fixes something that was broken, and saves the fix.';
    if (!added.length) return 'Kar saves a step of work. It changes ' + n0(changed) + ' file' + s(changed) + '.';
    const names = added.slice(0, 3).map((a) => say(nameOf(a)));
    const more = added.length - names.length;
    return 'Kar adds ' + n0(added.length) + ' new part' + s(added.length) + '. ' + (added.length === 1 ? 'It is called ' : 'They include ') + list(names) + (more > 0 ? ', and ' + n0(more) + ' more' : '') + '.';
  }
  if (k === 'seal') return 'First, the promises are written down. They say what it must do, and how we will check it. No building yet.';
  if (k === 'wire') {
    const n = int(b.count);
    return n === 1 ? say(b.a) + ' now talks to ' + say(b.b) + '. They pass work to each other, with no boss in the middle.'
      : n0(n) + ' links join the parts up, like ' + say(b.a) + ' to ' + say(b.b) + '. They pass work along, with no boss in the middle.';
  }
  if (k === 'checks') {
    const m = int(b.total), f = int(b.failed);
    if (f > 0) return 'Oops. The checking robot ran ' + n0(m) + ' check' + s(m) + ', and ' + n0(f) + ' broke. Good thing we checked. We fix it and try again.';
    return 'The checking robot ran ' + n0(m) + ' check' + s(m) + ' on its own computer, and all ' + n0(m) + ' passed. We check it works before we keep it.';
  }
  if (k === 'gate') {
    const total = int(b.total), got = int(b.survived);
    if (got > 0) return 'The gate broke ' + say(b.name) + ' on purpose, in ' + n0(total) + ' different ways, to see if the checks notice. ' + n0(got) + ' got past them. That is a gap, so we fix the checks.';
    return 'Now the gate tests the tests. It breaks ' + say(b.name) + ' on purpose, in ' + n0(total) + ' different ways, to see if the checks notice. They caught every one.';
  }
  if (k === 'claim') {
    const id = str(b.id);
    if (b.verdict === 'held') return 'Promise ' + id + ' is checked, and it held.';
    if (b.verdict === 'failed') return 'Promise ' + id + ' did not hold. We say so out loud and keep the result, so nobody is fooled.';
    if (b.verdict === 'part') return 'Promise ' + id + ' only partly held. We write down the part that failed, and we keep it.';
    if (b.verdict === 'unmeasured') return 'Promise ' + id + ' could not be checked yet, and we say so instead of guessing.';
    return '';
  }
  if (k === 'receipt') return 'A receipt is saved. It is a record anyone can check again later, and get the same answer.';
  if (k === 'deploy') {
    if (b.state === 'ok') return 'The new version goes live on the web page, for anyone to open.';
    if (b.state === 'cancelled') return 'That update was stopped early. A newer one took its place.';
    if (b.state === 'failed') return 'That update did not reach the web page. Something went wrong, so we try again.';
    return '';
  }
  return '';
}
/** failed(beat) → is this beat a failure the viewer must see and hear (B3)? */
export function failed(b) {
  if (!isObj(b)) return false;
  return (b.kind === 'checks' && int(b.failed) > 0) || (b.kind === 'gate' && int(b.survived) > 0)
    || (b.kind === 'claim' && (b.verdict === 'failed' || b.verdict === 'part')) || (b.kind === 'deploy' && (b.state === 'failed' || b.state === 'cancelled'));
}

// ── from the build log to beats (one beat, one line) ─────────────────────────────────────────────────────────────
/** beatsOf(log) → the beats: one per real moment of the build, each naming the indices of the build events it shows.
 *  A commit's new files and changes are one beat; its new wires another; each seal, claim, CI run, gate verdict,
 *  receipt and deploy its own. */
export function beatsOf(log) {
  const L = isObj(log) ? log : {};
  const ev = arr(L.events);
  const out = [];
  // a commit's own new files and wires follow it in the log; the run of events from j that `same` accepts
  const run = (j, same) => { let k = j; while (isObj(ev[k + 1]) && same(ev[k + 1])) k++; return k; };
  const span = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, x) => a + x);
  let i = 0;
  while (i !== ev.length) {
    const e = ev[i];
    if (isObj(e)) {
      if (!out.length) out.push({ kind: 'start', title: str(L.title), events: [], at: str(e.at) });
      if (e.k === 'commit') {
        const end = run(i, (x) => x.sha === e.sha && (x.k === 'node' || x.k === 'wire'));
        const mine = span(i + 1, end), nodes = mine.filter((x) => ev[x].k === 'node'), wires = mine.filter((x) => ev[x].k === 'wire');
        out.push({ kind: 'commit', events: [i, ...nodes], added: nodes.map((x) => str(ev[x].path)), changed: arr(e.files).length, fix: FIX.test(str(e.msg)), sub: str(e.msg), at: str(e.at) });
        if (wires.length) out.push({ kind: 'wire', events: wires, count: wires.length, a: nameOf(ev[wires[0]].from), b: nameOf(ev[wires[0]].to), at: str(e.at) });
        i = end;
      } else if (e.k === 'deploy') {
        // the same commit's deploys that ended the same way are one beat; a different ending is its own (a failure is never folded into a success)
        const end = run(i, (x) => x.k === 'deploy' && x.sha === e.sha && x.state === e.state), evs = span(i, end);
        out.push({ kind: 'deploy', events: evs, state: str(e.state), sub: evs.map((x) => str(ev[x].workflow)).join(' · '), at: str(e.at) });
        i = end;
      } else if (e.k === 'checks') out.push({ kind: 'checks', events: [i], total: int(e.total), failed: arr(e.failedSteps).length, sub: arr(e.failedSteps).join(' · ') || str(e.workflow), at: str(e.at) });
      else if (e.k === 'seal') out.push({ kind: 'seal', events: [i], sub: str(e.path), at: str(e.at) });
      else if (e.k === 'claim') out.push({ kind: 'claim', events: [i], id: str(e.id), verdict: str(e.verdict), sub: str(e.text), at: str(e.at) });
      else if (e.k === 'receipt') out.push({ kind: 'receipt', events: [i], sub: str(e.path), at: str(e.at) });
      else if (e.k === 'gate') out.push({ kind: 'gate', events: [i], name: nameOf(e.file), total: int(e.total), survived: int(e.survived), sub: str(e.file), at: str(e.at) });
    }
    i++;
  }
  return out.filter((b) => narrate(b) !== '');
}

// ── the picture: each build event as kernel events the Living Visual draws (B1) ──────────────────────────────────
const dirOf = (p) => str(p).slice(0, Math.max(0, str(p).lastIndexOf('/')));
/** kernelOf(log) → the kernel events (FallGarden Live's kernel), each with bi, the index of the build event it comes
 *  from. The repo germinates; Kar the builder grows from it; each folder and file is born where it lives; a wire is a
 *  link; Kar's work on a file is a flow of light; the checking robot, the gate and the live page appear when they
 *  first act; a run is ok or failed; a promise is a cell that holds (green) or fails (red). */
export function kernelOf(log) {
  const L = isObj(log) ? log : {};
  const ev = arr(L.events), out = [], born = new Set();
  const put = (bi, e) => out.push({ ...e, bi });
  const once = (bi, id, e) => { if (born.has(id)) return; born.add(id); put(bi, { t: 'born', id, ...e }); };
  const repo = 'repo', title = str(L.title) || 'the build';
  const dir = (bi, d) => {
    if (!d) return repo;
    const id = 'dir:' + d;
    if (!born.has(id)) { const up = dir(bi, dirOf(d)); once(bi, id, { label: d.split('/').pop() + '/', kind: 'layer', to: up }); }
    return id;
  };
  ev.forEach((e, bi) => {
    if (!isObj(e)) return;
    if (!born.has(repo)) { born.add(repo); put(bi, { t: 'germinate', id: repo, label: title }); once(bi, 'kar', { label: 'Kar, the builder', kind: 'organ', to: repo }); }
    if (e.k === 'node') { const p = str(e.path); once(bi, 'f:' + p, { label: nameOf(p), kind: 'repo', fam: roleOf(p), to: dir(bi, dirOf(p)) }); }
    else if (e.k === 'wire') { if (born.has('f:' + str(e.from)) && born.has('f:' + str(e.to))) put(bi, { t: 'link', a: 'f:' + str(e.from), b: 'f:' + str(e.to) }); }
    else if (e.k === 'commit') { for (const f of arr(e.files).slice(0, 8)) if (born.has('f:' + str(f.path))) put(bi, { t: 'flow', a: 'kar', b: 'f:' + str(f.path) }); }
    else if (e.k === 'seal') { if (born.has('f:' + str(e.path))) put(bi, { t: 'receipt', id: 'f:' + str(e.path) }); }
    else if (e.k === 'receipt') { if (born.has('f:' + str(e.path))) put(bi, { t: 'receipt', id: 'f:' + str(e.path) }); }
    else if (e.k === 'claim') {
      const id = 'claim:' + str(e.id) + '@' + str(e.path);
      once(bi, id, { label: 'promise ' + str(e.id), kind: 'organ', to: born.has('f:' + str(e.path)) ? 'f:' + str(e.path) : repo });
      if (e.verdict === 'held') put(bi, { t: 'run', id, state: 'ok' });
      else if (e.verdict === 'failed' || e.verdict === 'part') put(bi, { t: 'run', id, state: 'failed' });
    } else if (e.k === 'checks') {
      once(bi, 'auditor', { label: 'the checking robot', kind: 'organ', to: 'kar' });
      put(bi, { t: 'flow', a: 'kar', b: 'auditor' });
      put(bi, { t: 'run', id: 'auditor', state: arr(e.failedSteps).length ? 'failed' : 'ok' });
    } else if (e.k === 'gate') {
      once(bi, 'gate', { label: 'the gate', kind: 'organ', to: born.has('auditor') ? 'auditor' : 'kar' });
      const f = 'f:' + str(e.file);
      if (born.has(f)) put(bi, { t: 'flow', a: 'gate', b: f });
      put(bi, { t: 'run', id: 'gate', state: int(e.survived) > 0 ? 'failed' : 'ok' });
    } else if (e.k === 'deploy') {
      once(bi, 'pages', { label: 'the live page', kind: 'organ', to: repo });
      put(bi, { t: 'flow', a: 'kar', b: 'pages' });
      put(bi, { t: 'run', id: 'pages', state: e.state === 'ok' ? 'ok' : 'failed' });
    }
  });
  return out;
}

// ── the episode script: beats in time, each line with its events, hashed (B4) ───────────────────────────────────────
export const PACE = Object.freeze({ wordsPerSecond: 2.6, pause: 1.4, min: 3, max: 9, intro: 4 });
const hash64 = (s) => {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  for (const ch of str(s)) { const c = ch.charCodeAt(0); a ^= c; a = Math.imul(a, 0x01000193) >>> 0; b ^= c; b = Math.imul(b, 0x01000193) >>> 0; b ^= b >>> 15; }
  return a.toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
};
/** durationOf(line) → how long a line is on screen: its reading time plus a pause, between min and max seconds. */
export function durationOf(line) {
  const w = str(line).split(/\s+/).filter(Boolean).length;
  return Math.round(Math.min(PACE.max, Math.max(PACE.min, w / PACE.wordsPerSecond + PACE.pause)) * 10) / 10;
}
/** scriptOf(log) → { beats: [{ t, dur, kind, line, sub, events, fail }], kernel: [{ ...kernel event, bi, time }], hash }.
 *  The kernel events of a beat fire at its start, so a part appears as its line is spoken. */
export function scriptOf(log) {
  const beats = beatsOf(log), kernel = kernelOf(log);
  const byBi = new Map();
  for (const k of kernel) { if (!byBi.has(k.bi)) byBi.set(k.bi, []); byBi.get(k.bi).push(k); }
  let t = 0;
  const out = [], kout = [];
  for (const b of beats) {
    const line = narrate(b), dur = b.kind === 'start' ? PACE.intro : durationOf(line), at = Math.round(t * 10) / 10;
    out.push({ t: at, dur, kind: b.kind, line, sub: str(b.sub), events: b.events, fail: failed(b) });
    // a beat's kernel events fire as its line begins; an event no beat shows is never drawn
    for (const bi of b.events) { for (const k of byBi.get(bi) || []) kout.push({ ...k, time: at }); byBi.delete(bi); }
    t += dur;
  }
  const canon = JSON.stringify({ beats: out.map((b) => [b.t, b.dur, b.kind, b.line, b.sub, b.events, b.fail]), kernel: kout });
  return { beats: out, kernel: kout, duration: Math.round(t * 10) / 10, hash: hash64(canon) };
}

// ── the caption track, the Shorts, the label ─────────────────────────────────────────────────────────────────────────
const clock = (sec) => {
  const ms = Math.max(0, Math.round((Number.isFinite(sec) ? sec : 0) * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + '.' + String(r).padStart(3, '0');
};
/** vttOf(script) → the caption track (WebVTT): one cue per beat, its line, at its time. */
export function vttOf(sc) {
  const beats = arr(isObj(sc) ? sc.beats : null).filter((b) => isObj(b) && str(b.line));
  return 'WEBVTT\n\n' + beats.map((b, i) => (i + 1) + '\n' + clock(b.t) + ' --> ' + clock(b.t + b.dur) + '\n' + b.line + '\n').join('\n');
}
/** shortsOf(script, min, max, count) → the best windows for a Short: runs of whole beats lasting min..max seconds, scored
 *  3 for a failure, 2 for a gate or a promise, 1 for any other beat; the top `count`, never overlapping, in time order. */
export function shortsOf(sc, min = 20, max = 40, count = 3) {
  const b = arr(isObj(sc) ? sc.beats : null).filter(isObj);
  const score = (x) => (x.fail ? 3 : x.kind === 'gate' || x.kind === 'claim' ? 2 : 1);
  const cands = [];
  b.forEach((_, i) => {
    let d = 0, sc0 = 0;
    for (let j = i; j < b.length; j++) {
      d += b[j].dur; sc0 += score(b[j]);
      if (d > max) break;
      if (d >= min) cands.push({ from: i, to: j, t: b[i].t, dur: Math.round(d * 10) / 10, score: sc0 });
    }
  });
  // the best first; the sort is stable, so a tie keeps the order the windows were made in: the earlier start, then the shorter
  cands.sort((x, y) => y.score - x.score);
  const out = [];
  for (const c of cands) {
    if (out.length >= count) break;
    if (out.some((o) => !(c.to < o.from || c.from > o.to))) continue;
    out.push(c);
  }
  return out.sort((x, y) => x.from - y.from);
}
/** labelFor(mode, log) → what the screen says it is: LIVE only for the live tap; anything else is RECORDED (B4). */
export function labelFor(mode, log) {
  const L = isObj(log) ? log : {};
  if (mode === 'live') return 'LIVE · ' + (str(L.repo) || 'this build') + ' · each event as it happens';
  const range = str(L.from) && str(L.to) ? ' ' + str(L.from).slice(0, 7) + '…' + str(L.to).slice(0, 7) : '';
  return 'RECORDED · a replay of ' + (str(L.repo) || 'a build') + range + ', from its build log';
}

// ── for a buyer: the time a broadcast gives back (sourced: vendor/basis.json, FallGarden Live's basis, byte for byte) ──
/** reviewCase(basis, { people, hours, reportHours, share, months }) → what checking a build's progress costs today, and what
 *  watching it instead gives back. Today: each of `people` spends `hours` a month in status meetings, demos and reading
 *  updates, and the builder spends `reportHours` a month writing them, for `months`; valued at the UK median hourly wage, a
 *  floor (employer on-costs left out). `share` is the part of that an episode replaces, the reader's own estimate. Beside
 *  it, what an AI assistant seat (the sourced Microsoft 365 Copilot price) costs the same people over the same months. */
export function reviewCase(basis, inputs) {
  const w = isObj(basis) && isObj(basis.wageMedianHourly) ? basis.wageMedianHourly.value : NaN;
  if (!Number.isFinite(w) || w <= 0) return { ok: false, why: 'the sourced wage is missing' };
  const I = isObj(inputs) ? inputs : {};
  const n = (k, lo, hi) => (Number.isFinite(I[k]) && I[k] >= lo && I[k] <= hi ? I[k] : NaN);
  const people = n('people', 1, 500), hours = n('hours', 0, 160), report = n('reportHours', 0, 160), share = n('share', 0, 1), months = n('months', 1, 60);
  if ([people, hours, report, share, months].some(Number.isNaN)) return { ok: false, why: 'people 1-500, hours 0-160 a month each, report hours 0-160 a month, share 0-100%, months 1-60' };
  const seat = isObj(basis['seat.copilot']) ? basis['seat.copilot'] : {};
  const per = Number.isFinite(seat.value) && seat.value > 0 ? seat.value : NaN;
  const hoursToday = (people * hours + report) * months, hoursBack = hoursToday * share;
  const r = (x) => Math.round(x * 100) / 100;
  return { ok: true, wage: w, source: str(basis.wageMedianHourly.source), hoursToday: r(hoursToday), costToday: r(hoursToday * w), hoursBack: r(hoursBack), moneyBack: r(hoursBack * w),
    seat: Number.isNaN(per) ? null : { product: str(seat.product), perMonth: per, source: str(seat.source), cost: r(people * months * per) } };
}

// ── the audit's comparison (B1) ─────────────────────────────────────────────────────────────────────────────────
/** sameEvent(logged, derived) → does a logged event match one derived again from git and GitHub? A redaction mark in the
 *  log stands for whatever the raw text held there (the runner cannot know the private names). */
export function sameEvent(a, b) {
  if (!isObj(a) || !isObj(b)) return false;
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  if (JSON.stringify(ka) !== JSON.stringify(kb)) return false;
  return ka.every((k) => {
    const x = a[k], y = b[k];
    if (typeof x === 'string' && typeof y === 'string' && (x.includes(PRIVATE) || x.includes(REDACTED))) {
      const re = new RegExp('^' + x.split(/‹private›|‹redacted›/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+?') + '$', 's');
      return re.test(y);
    }
    return JSON.stringify(x) === JSON.stringify(y);
  });
}
/** auditLog(logged, derived) → { ok, checked, missing, extra, differ }: every logged event against the derived list, in order. */
export function auditLog(logged, derived) {
  const a = arr(logged), b = arr(derived), differ = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (!sameEvent(a[i], b[i])) differ.push(i);
  const missing = Math.max(0, b.length - a.length), extra = Math.max(0, a.length - b.length);
  return { ok: differ.length === 0 && missing === 0 && extra === 0, checked: n, missing, extra, differ: differ.slice(0, 10) };
}

export default { SECRETS, REDACTED, PRIVATE, secretsIn, redact, ROLES, roleOf, nameOf, syllables, grade, MAX_GRADE, JARGON, jargonIn, plain,
  GLOSS, say, narrate, failed, beatsOf, kernelOf, PACE, durationOf, scriptOf, vttOf, shortsOf, labelFor, reviewCase, sameEvent, auditLog };
