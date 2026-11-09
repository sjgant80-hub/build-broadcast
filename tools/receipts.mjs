// build-broadcast · tools/receipts.mjs — each committed episode's script fingerprint (B4) and what it holds, written to
// receipts.json; with --check it recomputes them and fails on any difference (GitHub's runner does this on every push).
import { readFileSync, writeFileSync } from 'node:fs';
import B from '../broadcast.mjs';
import K from '../kernel.mjs';

const here = (p) => new URL('../' + p, import.meta.url);
const idx = JSON.parse(readFileSync(here('episodes/index.json'), 'utf8'));
const out = { v: 1, episodes: {} };
for (const ep of idx.episodes) {
  const log = JSON.parse(readFileSync(here('episodes/' + ep.id + '.log.json'), 'utf8'));
  const sc = B.scriptOf(log), st = K.replay(sc.kernel);
  out.episodes[ep.id] = { repo: log.repo, from: log.from, to: log.to, events: log.events.length, beats: sc.beats.length, seconds: sc.duration, kernel: sc.kernel.length,
    ignored: st.ignored, failures: sc.beats.filter((b) => b.fail).length, plain: sc.beats.every((b) => B.plain(b.line)), maxGrade: Math.round(Math.max(...sc.beats.map((b) => B.grade(b.line))) * 10) / 10,
    vtt: B.vttOf(sc).length, hash: sc.hash };
}
const gate = (flagName, key) => { const i = process.argv.indexOf('--' + flagName); if (i < 0) return; const s = readFileSync(process.argv[i + 1], 'utf8'), j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); out[key] = { total: j.total, killed: j.killed, survived: j.survived.length, ignored: j.ignored.length, clean: j.clean }; };
gate('law-log', 'law'); gate('recorder-log', 'recorder');
const strip = (r) => JSON.stringify({ ...r, law: undefined, recorder: undefined });
if (process.argv.includes('--check')) {
  const want = JSON.parse(readFileSync(here('receipts.json'), 'utf8'));
  const problems = [];
  if (strip(want) !== strip(out)) problems.push('the receipts differ from what this run computed');
  for (const [id, e] of Object.entries(out.episodes)) { if (!e.plain) problems.push(id + ': a line is not plain'); if (e.ignored) problems.push(id + ': ' + e.ignored + ' picture events did not apply'); }
  if (problems.length) { console.error('RECEIPTS FAIL\n' + problems.join('\n') + '\nwant ' + strip(want) + '\ngot  ' + strip(out)); process.exit(1); }
  console.log('receipts hold: ' + Object.entries(out.episodes).map(([id, e]) => id + ' ' + e.hash + ' (' + e.beats + ' beats, ' + e.failures + ' failures)').join(' · '));
} else {
  try { const old = JSON.parse(readFileSync(here('receipts.json'), 'utf8')); if (!out.law && old.law) out.law = old.law; if (!out.recorder && old.recorder) out.recorder = old.recorder; } catch { /* first write */ }
  writeFileSync(here('receipts.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
}
