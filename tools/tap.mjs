// build-broadcast · tools/tap.mjs — the event tap (§7.1). It reads a real build's records and nothing else: git history
// (each commit, the files it adds and changes, each local import a file gains, sealed claims files, results rows marked
// held or failed, receipts), and GitHub's own record of every CI run on those commits (each job's steps, the mutation
// gate's verdict from the run's own log, each deploy). Every event names its source. Every string passes the
// redaction (B5) before it is written, and the tap refuses to write if anything secret-shaped or private survives.
//   node tools/tap.mjs --repo <path> --gh <owner/name> [--path live/] --id <id> --title "<title>" [--to <sha>]
//   node tools/tap.mjs ... --audit      derive again and compare with the committed log, event by event (B1)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { posix } from 'node:path';
import B from '../broadcast.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const REPO = arg('repo'), GH = arg('gh'), PATH = arg('path', ''), ID = arg('id'), TITLE = arg('title', '');
// an audit re-derives exactly the range the committed log covers (the repo may have moved on since)
const committedTo = () => { try { return JSON.parse(readFileSync(new URL('../episodes/' + arg('id') + '.log.json', import.meta.url), 'utf8')).to || ''; } catch { return ''; } };
const TO = arg('to', flag('audit') ? committedTo() : '');
const INDEX = arg('private', 'C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory/estate-index.json');
if (!REPO || !ID) { console.error('usage: --repo <path> --id <id> [--gh owner/name] [--path dir/] [--title t] [--to sha] [--audit]'); process.exit(2); }

const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const gh = (path) => { try { return execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };
const ghJson = (path) => { const t = gh(path); try { return t ? JSON.parse(t) : null; } catch { return null; } };
// the private names (local only; never written anywhere): every private repo in the estate's own index
const PRIVATE = existsSync(INDEX) ? (JSON.parse(readFileSync(INDEX, 'utf8')).nodes || []).filter((r) => r && r.private === true).map((r) => r.name || r.id).filter(Boolean) : [];
let redactions = 0;
const red = (t) => { const r = B.redact(t, PRIVATE); if (r !== String(t || '')) redactions++; return r; };

// ── git: commits, files, imports, claims, results, receipts ─────────────────────────────────────────────────────────
const CODE = /\.(m?js|html?)$/;
const IMPORT = /(?:\bimport\s[^'"`;]*?from\s*|\bimport\s*\(\s*|\bnew URL\(\s*|\bsrc=)["'](\.{1,2}\/[^"'?#]+)["']/g;
function importsOf(sha, path, present) {
  let text = '';
  try { text = git('show', sha + ':' + path); } catch { return new Set(); }
  const out = new Set(), dir = posix.dirname(path);
  for (const m of text.matchAll(IMPORT)) { const p = posix.normalize(posix.join(dir, m[1])); if (present.has(p) && p !== path) out.add(p); }
  return out;
}
const VERDICT = (bold) => (/in part/i.test(bold) ? 'part' : /^\s*FAILED/i.test(bold) ? 'failed' : /^\s*HELD/i.test(bold) ? 'held' : /NOT MEASURED/i.test(bold) ? 'unmeasured' : '');
function claimsOf(sha, path) {
  let text = '';
  try { text = git('show', sha + ':' + path); } catch { return new Map(); }
  const out = new Map();
  for (const m of text.matchAll(/^\|\s*([A-Z]\d{1,2}[a-z]?)\s*\|\s*\*\*([^*|]+)\*\*/gm)) { const v = VERDICT(m[2]); if (v) out.set(m[1], { verdict: v, text: m[2].trim() }); }
  return out;
}
function fromGit() {
  const raw = git('log', '--reverse', '--format=%x1e%H%x1f%aI%x1f%s', '--name-status', ...(TO ? [TO] : []), '--', PATH || '.');
  const events = [], present = new Set(), imports = new Map(), claims = new Map(), shas = [];
  for (const rec of raw.split('\x1e').filter((r) => r.trim())) {
    const [head, ...lines] = rec.split('\n');
    const [sha, at, msg] = head.split('\x1f');
    const files = [];
    for (const l of lines) {
      const p = l.split('\t');
      if (p.length < 2) continue;
      const s = p[0][0], path = s === 'R' || s === 'C' ? p[2] : p[1];
      if (s === 'R') present.delete(p[1]);
      if (PATH && !path.startsWith(PATH)) continue;
      files.push({ path: red(path), s: s === 'R' || s === 'C' ? 'A' : s });
      if (s === 'D') present.delete(path); else present.add(path);
    }
    const short = sha.slice(0, 7);
    shas.push(sha);
    events.push({ k: 'commit', sha: short, at, msg: red(msg), files, src: 'git:' + short });
    for (const f of files.filter((x) => x.s === 'A')) events.push({ k: 'node', sha: short, at, path: f.path, src: 'git:' + short + ':' + f.path });
    for (const f of files.filter((x) => x.s !== 'D' && CODE.test(x.path))) {
      const now = importsOf(sha, f.path, present), was = imports.get(f.path) || new Set();
      for (const to of [...now].sort()) if (!was.has(to)) events.push({ k: 'wire', sha: short, at, from: f.path, to, src: 'git:' + short + ':' + f.path });
      imports.set(f.path, now);
    }
    for (const f of files.filter((x) => x.s === 'A' && /(^|\/)CLAIMS[^/]*\.md$/i.test(x.path))) events.push({ k: 'seal', sha: short, at, path: f.path, src: 'git:' + short + ':' + f.path });
    for (const f of files.filter((x) => x.s !== 'D' && /(^|\/)RESULTS[^/]*\.md$/i.test(x.path))) {
      const now = claimsOf(sha, f.path), was = claims.get(f.path) || new Map();
      for (const [id, c] of now) if (!was.has(id) || was.get(id).verdict !== c.verdict) events.push({ k: 'claim', sha: short, at, path: f.path, id, verdict: c.verdict, text: red(c.text), src: 'git:' + short + ':' + f.path });
      claims.set(f.path, now);
    }
    for (const f of files.filter((x) => x.s !== 'D' && /(^|\/)receipts\.json$/.test(x.path))) events.push({ k: 'receipt', sha: short, at, path: f.path, src: 'git:' + short + ':' + f.path });
  }
  return { events, shas };
}

// ── GitHub (read only): every completed run on those commits: its checks, the gate's verdicts, its deploys ───────────
const SKIP = /^(Set up job|Complete job|Post |Run actions\/|actions\/|Checkout|Setup Node)/i;
function gatesIn(log) {
  const out = [];
  if (!log) return out;
  const text = log.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/gm, '');
  // the header, then (never past the next header) its verdict's total, killed and survived
  for (const m of text.matchAll(/mutation gate: (\S+)[^\n]*\n(?:(?!mutation gate:)[\s\S])*?"total":\s*(\d+)(?:(?!mutation gate:)[\s\S])*?"killed":\s*(\d+)(?:(?!mutation gate:)[\s\S])*?"survived":\s*\[((?:(?!mutation gate:)[\s\S])*?)\]/g)) {
    out.push({ file: m[1], total: Number(m[2]), killed: Number(m[3]), survived: (m[4].match(/"line"/g) || []).length });
  }
  return out;
}
let logsUnreachable = 0;   // a token without access to a run's logs cannot read its gate verdicts
function fromGitHub(shas) {
  const events = [];
  if (!GH || flag('no-gh')) return events;
  for (const sha of shas) {
    const runs = ghJson(`repos/${GH}/actions/runs?head_sha=${sha}&per_page=30`);
    for (const run of (runs && runs.workflow_runs ? runs.workflow_runs : []).filter((r) => r.status === 'completed').sort((a, b) => a.id - b.id)) {
      const short = sha.slice(0, 7), name = red(run.name);
      if (/pages build and deployment|publish|deploy/i.test(run.name)) {
        events.push({ k: 'deploy', sha: short, at: run.updated_at, state: run.conclusion === 'success' ? 'ok' : run.conclusion === 'cancelled' ? 'cancelled' : 'failed', workflow: name, src: 'gh:run/' + run.id });
        continue;
      }
      const jobs = ghJson(`repos/${GH}/actions/runs/${run.id}/jobs?per_page=50`);
      for (const job of (jobs && jobs.jobs) || []) {
        const steps = (job.steps || []).filter((st) => !SKIP.test(st.name) && st.conclusion !== 'skipped');
        events.push({ k: 'checks', sha: short, at: job.completed_at, workflow: name, total: steps.length, failedSteps: steps.filter((st) => st.conclusion === 'failure').map((st) => red(st.name)), src: 'gh:run/' + run.id + '/job/' + job.id });
        if (steps.some((st) => /witness|mutation/i.test(st.name))) {
          const text = gh(`repos/${GH}/actions/jobs/${job.id}/logs`);
          if (text === null) logsUnreachable++;
          for (const g of gatesIn(text)) events.push({ k: 'gate', sha: short, at: job.completed_at, file: red(g.file), total: g.total, killed: g.killed, survived: g.survived, src: 'gh:run/' + run.id + '/job/' + job.id });
        }
      }
    }
  }
  return events;
}

// ── the log ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const { events: gitEvents, shas } = fromGit();
const all = [...gitEvents, ...fromGitHub(shas)].map((e, i) => ({ e, i }));
all.sort((x, y) => (x.e.at < y.e.at ? -1 : x.e.at > y.e.at ? 1 : x.i - y.i));
const events = all.map((x) => x.e);
const log = { v: 1, id: ID, title: TITLE, repo: GH || posix.basename(REPO.replace(/\\/g, '/')), path: PATH, from: shas[0] ? shas[0].slice(0, 7) : '', to: shas.length ? shas[shas.length - 1].slice(0, 7) : '', events };
const OUT = arg('out', '');   // the live tap writes to live/ (never committed) instead of episodes/
const file = OUT ? new URL('../' + OUT.replace(/^\/+/, ''), import.meta.url) : new URL('../episodes/' + ID + '.log.json', import.meta.url);

if (flag('audit')) {
  const committed = JSON.parse(readFileSync(file, 'utf8'));
  if (logsUnreachable > 0) {
    // the gate verdicts live in the run logs this token cannot read: every other event is checked, and the gap is said
    const notGate = (list) => list.filter((e) => e && e.k !== 'gate');
    const r = B.auditLog(notGate(committed.events), notGate(events));
    console.log(JSON.stringify({ id: ID, ...r, events: events.length, gatesNotRechecked: committed.events.filter((e) => e && e.k === 'gate').length, why: logsUnreachable + ' run logs could not be read with this token' }));
    process.exit(r.ok ? 0 : 1);
  }
  const r = B.auditLog(committed.events, events);
  console.log(JSON.stringify({ id: ID, ...r, events: events.length, gatesNotRechecked: 0 }));
  process.exit(r.ok ? 0 : 1);
}
const text = JSON.stringify(log, null, 1);
const leaks = B.secretsIn(text), priv = PRIVATE.filter((n) => n.length >= 3 && new RegExp('(?<![A-Za-z0-9_-])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_-])', 'i').test(text));
if (leaks.length || priv.length) { console.error('REFUSED: ' + leaks.length + ' secret-shaped pieces and ' + priv.length + ' private names survived the redaction'); process.exit(1); }
mkdirSync(new URL('./', file), { recursive: true });
writeFileSync(file, text + '\n');
const kinds = {};
for (const e of events) kinds[e.k] = (kinds[e.k] || 0) + 1;
console.log(JSON.stringify({ id: ID, events: events.length, commits: shas.length, kinds, redactions, privateChecked: PRIVATE.length }));
