// build-broadcast · test/broadcast.test.mjs — the law against claims B1-B5 (CLAIMS.md, sealed 7081f1a), with made-up logs
// and with the committed real ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import B, { secretsIn, redact, REDACTED, PRIVATE, roleOf, nameOf, ROLES, syllables, grade, MAX_GRADE, jargonIn, plain, GLOSS, say, narrate, failed,
  beatsOf, kernelOf, PACE, durationOf, scriptOf, vttOf, shortsOf, labelFor, sameEvent, auditLog } from '../broadcast.mjs';
import K from '../kernel.mjs';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, a + ' vs ' + b);

test('B5: secrets are found and redacted; private names go, as whole words, any case', () => {
  const tok = 'ghp_' + 'a'.repeat(30), pat = 'github_pat_' + 'B'.repeat(25), aws = 'AKIA' + 'ABCDEFGHIJKLMNOP', sk = 'sk-' + 'x'.repeat(24), slack = 'xoxb-' + '1234567890ab';
  const jwt = 'eyJ' + 'a'.repeat(12) + '.' + 'b'.repeat(12) + '.' + 'c'.repeat(12), mail = 'simon@example.co.uk', key = '-----BEGIN RSA PRIVATE KEY-----';
  for (const s of [tok, pat, aws, sk, slack, jwt, mail, key, 'gho_' + 'z'.repeat(20)]) { assert.deepEqual(secretsIn('x ' + s + ' y'), [s], s); assert.equal(redact('x ' + s + ' y', []), 'x ' + REDACTED + ' y'); }
  assert.deepEqual(secretsIn('ghp_short sk-short AKIA123 plain words'), []);
  assert.deepEqual(secretsIn(7), []);
  assert.equal(redact('Companion SDK for secret-thing and SECRET-THING.', ['secret-thing']), 'Companion SDK for ' + PRIVATE + ' and ' + PRIVATE + '.');
  assert.equal(redact('secret-thingy and my-secret-thing stay', ['secret-thing']), 'secretsecret'.slice(0, 0) + 'secret-thingy and my-secret-thing stay', 'only the whole name');
  assert.equal(redact('ab and abc', ['ab', 'abc']), 'ab and ' + PRIVATE, 'names under 3 letters are never matched');
  assert.equal(redact('kar-hub and kar-hub-pro', ['kar-hub', 'kar-hub-pro']), PRIVATE + ' and ' + PRIVATE, 'the longer name first');
  assert.equal(redact('see a.b here, and axb', ['a.b']), 'see ' + PRIVATE + ' here, and axb', 'a dot in a name is a dot, not any character');
  assert.equal(redact('x(y)z here', ['x(y)z']), PRIVATE + ' here', 'a name is matched as written, never as a pattern');
  assert.equal(redact(null, ['x']), ''); assert.equal(redact('ok', 'not a list'), 'ok');
  assert.equal(REDACTED, '‹redacted›'); assert.equal(PRIVATE, '‹private›');
});

test('a file\'s part, in plain words, and its short name', () => {
  const cases = [['live/CLAIMS-living.md', 'promises'], ['CLAIMS.md', 'promises'], ['RESULTS.md', 'scorecard'], ['live/RESULTS-living.md', 'scorecard'], ['live/kernel.test.mjs', 'check'], ['a.test.js', 'check'],
    ['.github/workflows/gate.yml', 'robot'], ['live/index.html', 'page'], ['x.htm', 'page'], ['live/vendor/patlib.mjs', 'borrowed'], ['live/tools/hashes.mjs', 'helper'], ['tools/x.json', 'helper'],
    ['live/data/estate.json', 'data'], ['live/receipts.json', 'data'], ['README.md', 'notes'], ['live/app.mjs', 'part'], ['a.js', 'part'], ['LICENSE', 'file'], ['', 'file'], [null, 'file']];
  for (const [p, r] of cases) assert.equal(roleOf(p), r, String(p));
  assert.equal(roleOf('vendor/x.test.mjs'), 'check', 'a test first'); assert.equal(roleOf('docs/CLAIMS.html'), 'page', 'a claims file is markdown');
  assert.equal(Object.keys(ROLES).length, 11); assert.equal(ROLES.borrowed, 'a part borrowed from another project');
  assert.equal(nameOf('live/organism.mjs'), 'organism'); assert.equal(nameOf('live/kernel.test.mjs'), 'kernel'); assert.equal(nameOf('a/b/index.html'), 'index');
  assert.equal(nameOf('README.md'), 'README'); assert.equal(nameOf('.gitignore'), '.gitignore'); assert.equal(nameOf('LICENSE'), 'LICENSE'); assert.equal(nameOf('x.yml'), 'x');
  assert.equal(nameOf('d/e.json'), 'e'); assert.equal(nameOf('s.css'), 's'); assert.equal(nameOf(5), '');
});

test('B2: plain words — syllables, the Flesch-Kincaid grade, and jargon only with a gloss', () => {
  assert.equal(syllables('cat'), 1); assert.equal(syllables('table'), 2); assert.equal(syllables('make'), 1); assert.equal(syllables('organism'), 3, 'a heuristic: vowel groups (it undercounts -ism)'); assert.equal(syllables('everywhere'), 4);
  assert.equal(syllables('the'), 1); assert.equal(syllables('queue'), 1); assert.equal(syllables('104'), 1); assert.equal(syllables('—'), 0); assert.equal(syllables(''), 0);
  assert.equal(syllables('rhythm'), 1, 'y is a vowel here'); assert.equal(syllables('Kar'), 1);
  close(grade('The cat sat on the mat.'), 0.39 * 6 + 11.8 * 1 - 15.59);
  close(grade('The cat sat. The dog ran!'), 0.39 * 3 + 11.8 * 1 - 15.59);
  close(grade('Organisms everywhere.'), 0.39 * 2 + 11.8 * (3 + 4) / 2 - 15.59);
  assert.equal(grade(''), 0); assert.equal(grade('   '), 0); close(grade('no stop'), 0.39 * 2 + 11.8 - 15.59);
  assert.equal(MAX_GRADE, 7);
  assert.deepEqual(jargonIn('We save a commit to the repo.'), ['commit', 'repo']);
  assert.deepEqual(jargonIn('A commit, which means a saved step.'), []);
  assert.deepEqual(jargonIn('The CI ran; the API answered with JSON.'), ['api', 'json', 'ci']);
  assert.deepEqual(jargonIn('cinema and repository and apiary'), ['repository'], 'whole words only');
  assert.deepEqual(jargonIn('Node.js runs it'), ['node.js']); assert.deepEqual(jargonIn('nodexjs'), []);
  assert.equal(plain('The cat sat on the mat.'), true); assert.equal(plain('We deploy it.'), false);
  const at7 = 'cat '.repeat(15) + 'happy '.repeat(4) + 'happy.', over7 = 'cat '.repeat(14) + 'happy '.repeat(5) + 'happy.';
  close(grade(at7), 0.39 * 20 + 11.8 * 25 / 20 - 15.59); assert.equal(plain(at7), true, 'grade 6.96 shows as 7.0: plain'); assert.equal(plain(over7), false, 'grade 7.55: not plain');
  assert.equal(plain('Notwithstanding considerable organisational complexity, institutional infrastructure modernisation accelerates.'), false);
  assert.equal(say('kernel'), 'kernel (which means the core rules)'); assert.equal(say('Kernel'), 'Kernel (which means the core rules)'); assert.equal(say('app'), 'app'); assert.equal(say(3), '');
  assert.ok(Object.isFrozen(GLOSS) && GLOSS.witness === 'the checker that breaks things');
});

test('B2 + B3: the narrator says each kind of event in plain words, with its own specifics; failures plainly', () => {
  const lines = [
    [{ kind: 'start', title: 'FallGarden Live' }, 'This is the story of FallGarden Live. Watch it grow, one real step at a time.'],
    [{ kind: 'start' }, 'This is the story of a real build. Watch it grow, one real step at a time.'],
    [{ kind: 'commit', added: [], changed: 2 }, 'Kar saves a step of work. It changes 2 files.'],
    [{ kind: 'commit', added: [], changed: 1 }, 'Kar saves a step of work. It changes 1 file.'],
    [{ kind: 'commit', added: [], changed: 3, fix: true }, 'Kar fixes something that was broken, and saves the fix.'],
    [{ kind: 'commit', added: ['live/app.mjs'], changed: 1 }, 'Kar adds 1 new part. It is called app.'],
    [{ kind: 'commit', added: ['a/x.mjs', 'b/kernel.mjs'], changed: 2 }, 'Kar adds 2 new parts. They include x and kernel (which means the core rules).'],
    [{ kind: 'commit', added: ['a.mjs', 'b.mjs', 'c.mjs', 'd.mjs', 'e.mjs'], changed: 5 }, 'Kar adds 5 new parts. They include a, b and c, and 2 more.'],
    [{ kind: 'seal' }, 'First, the promises are written down. They say what it must do, and how we will check it. No building yet.'],
    [{ kind: 'wire', count: 1, a: 'app', b: 'kernel' }, 'app now talks to kernel (which means the core rules). They pass work to each other, with no boss in the middle.'],
    [{ kind: 'wire', count: 3, a: 'app', b: 'dict' }, '3 links join the parts up, like app to dict. They pass work along, with no boss in the middle.'],
    [{ kind: 'checks', total: 6, failed: 0 }, 'The checking robot ran 6 checks on its own computer, and all 6 passed. We check it works before we keep it.'],
    [{ kind: 'checks', total: 1, failed: 0 }, 'The checking robot ran 1 check on its own computer, and all 1 passed. We check it works before we keep it.'],
    [{ kind: 'checks', total: 6, failed: 2 }, 'Oops. The checking robot ran 6 checks, and 2 broke. Good thing we checked. We fix it and try again.'],
    [{ kind: 'gate', name: 'living', total: 144, survived: 0 }, 'Now the gate tests the tests. It broke living on purpose, 144 ways, and the checks caught every one.'],
    [{ kind: 'gate', name: 'living', total: 145, survived: 3 }, 'The gate broke living on purpose, 145 ways. 3 got past the checks. That is a gap, so we fix the checks.'],
    [{ kind: 'claim', id: 'U2', verdict: 'held' }, 'Promise U2 is checked, and it held.'],
    [{ kind: 'claim', id: 'U1', verdict: 'failed' }, 'Promise U1 did not hold. We say so out loud and keep the result, so nobody is fooled.'],
    [{ kind: 'claim', id: 'U1', verdict: 'part' }, 'Promise U1 only partly held. We write down the part that failed, and we keep it.'],
    [{ kind: 'claim', id: 'G6', verdict: 'unmeasured' }, 'Promise G6 could not be checked yet, and we say so instead of guessing.'],
    [{ kind: 'receipt' }, 'A receipt is saved. It is a record anyone can check again later, and get the same answer.'],
    [{ kind: 'deploy', state: 'ok' }, 'The new version goes live on the web page, for anyone to open.'],
    [{ kind: 'deploy', state: 'cancelled' }, 'That update was stopped early. A newer one took its place.'],
    [{ kind: 'deploy', state: 'failed' }, 'That update did not reach the web page. Something went wrong, so we try again.'],
  ];
  for (const [b, line] of lines) { assert.equal(narrate(b), line, JSON.stringify(b)); assert.ok(plain(line), line + ' (grade ' + grade(line).toFixed(1) + ')'); }
  for (const b of [{ kind: 'claim', id: 'X', verdict: 'odd' }, { kind: 'deploy', state: 'odd' }, { kind: 'nope' }, {}, null, 'commit', []]) assert.equal(narrate(b), '', JSON.stringify(b));
  assert.equal(narrate({ kind: 'commit', added: ['a.mjs'], changed: 1, fix: 'yes' }), 'Kar adds 1 new part. It is called a.', 'only a real true is a fix');
  const yes = [{ kind: 'checks', failed: 1 }, { kind: 'gate', survived: 2 }, { kind: 'claim', verdict: 'failed' }, { kind: 'claim', verdict: 'part' }, { kind: 'deploy', state: 'failed' }, { kind: 'deploy', state: 'cancelled' }];
  const no = [{ kind: 'checks', failed: 0 }, { kind: 'gate', survived: 0 }, { kind: 'claim', verdict: 'held' }, { kind: 'claim', verdict: 'unmeasured' }, { kind: 'deploy', state: 'ok' }, { kind: 'commit', fix: true }, null, { kind: 'checks', failed: '2' }];
  for (const b of yes) assert.equal(failed(b), true, JSON.stringify(b));
  for (const b of no) assert.equal(failed(b), false, JSON.stringify(b));
});

// a made-up build log: every kind of event, in order
const LOG = { title: 'Tiny', repo: 'me/tiny', from: 'aaaaaaa', to: 'ccccccc', events: [
  { k: 'commit', sha: 'aaaaaaa', at: '2026-01-01T00:00:00Z', msg: 'seal the claims', files: [{ path: 'CLAIMS.md', s: 'A' }], src: 'git:aaaaaaa' },
  { k: 'node', sha: 'aaaaaaa', at: '2026-01-01T00:00:00Z', path: 'CLAIMS.md', src: 'git:aaaaaaa:CLAIMS.md' },
  { k: 'seal', sha: 'aaaaaaa', at: '2026-01-01T00:00:00Z', path: 'CLAIMS.md', src: 'git:aaaaaaa:CLAIMS.md' },
  { k: 'checks', sha: 'aaaaaaa', at: '2026-01-01T00:01:00Z', workflow: 'gate', total: 3, failedSteps: [], src: 'gh:run/1/job/1' },
  { k: 'commit', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', msg: 'the build', files: [{ path: 'src/app.mjs', s: 'A' }, { path: 'src/kernel.mjs', s: 'A' }, { path: 'RESULTS.md', s: 'A' }, { path: 'receipts.json', s: 'A' }], src: 'git:bbbbbbb' },
  { k: 'node', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', path: 'src/app.mjs', src: 'git:bbbbbbb:src/app.mjs' },
  { k: 'node', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', path: 'src/kernel.mjs', src: 'git:bbbbbbb:src/kernel.mjs' },
  { k: 'node', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', path: 'RESULTS.md', src: 'git:bbbbbbb:RESULTS.md' },
  { k: 'node', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', path: 'receipts.json', src: 'git:bbbbbbb:receipts.json' },
  { k: 'wire', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', from: 'src/app.mjs', to: 'src/kernel.mjs', src: 'git:bbbbbbb:src/app.mjs' },
  { k: 'claim', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', path: 'RESULTS.md', id: 'T1', verdict: 'held', text: 'HELD', src: 'git:bbbbbbb:RESULTS.md' },
  { k: 'claim', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', path: 'RESULTS.md', id: 'T2', verdict: 'failed', text: 'FAILED', src: 'git:bbbbbbb:RESULTS.md' },
  { k: 'receipt', sha: 'bbbbbbb', at: '2026-01-01T01:00:00Z', path: 'receipts.json', src: 'git:bbbbbbb:receipts.json' },
  { k: 'checks', sha: 'bbbbbbb', at: '2026-01-01T01:02:00Z', workflow: 'gate', total: 4, failedSteps: ['the tests'], src: 'gh:run/2/job/2' },
  { k: 'gate', sha: 'bbbbbbb', at: '2026-01-01T01:02:00Z', file: 'src/kernel.mjs', total: 50, killed: 48, survived: 2, src: 'gh:run/2/job/2' },
  { k: 'deploy', sha: 'bbbbbbb', at: '2026-01-01T01:03:00Z', state: 'ok', workflow: 'publish', src: 'gh:run/3' },
  { k: 'deploy', sha: 'bbbbbbb', at: '2026-01-01T01:03:30Z', state: 'ok', workflow: 'pages', src: 'gh:run/4' },
  { k: 'commit', sha: 'ccccccc', at: '2026-01-01T02:00:00Z', msg: 'fix: the checks were wrong', files: [{ path: 'src/kernel.mjs', s: 'M' }], src: 'git:ccccccc' },
  { k: 'deploy', sha: 'ccccccc', at: '2026-01-01T02:01:00Z', state: 'cancelled', workflow: 'pages', src: 'gh:run/5' },
  { k: 'deploy', sha: 'ccccccc', at: '2026-01-01T02:02:00Z', state: 'ok', workflow: 'pages', src: 'gh:run/6' },
  { k: 'mystery', at: '2026-01-01T03:00:00Z' }, null,
] };

test('beats: one per real moment, each naming the build events it shows', () => {
  const b = beatsOf(LOG);
  assert.deepEqual(b.map((x) => [x.kind, x.events]), [['start', []], ['commit', [0, 1]], ['seal', [2]], ['checks', [3]], ['commit', [4, 5, 6, 7, 8]], ['wire', [9]],
    ['claim', [10]], ['claim', [11]], ['receipt', [12]], ['checks', [13]], ['gate', [14]], ['deploy', [15, 16]], ['commit', [17]], ['deploy', [18]], ['deploy', [19]]]);
  assert.deepEqual(b[4].added, ['src/app.mjs', 'src/kernel.mjs', 'RESULTS.md', 'receipts.json']); assert.equal(b[4].changed, 4); assert.equal(b[4].fix, false); assert.equal(b[4].sub, 'the build');
  assert.equal(b[12].fix, true, 'a fix, from its own message'); assert.equal(b[5].a, 'app'); assert.equal(b[5].b, 'kernel'); assert.equal(b[5].count, 1);
  assert.equal(b[9].failed, 1); assert.equal(b[9].total, 4); assert.equal(b[9].sub, 'the tests'); assert.equal(b[3].sub, 'gate');
  assert.equal(b[10].name, 'kernel'); assert.equal(b[10].survived, 2); assert.equal(b[10].sub, 'src/kernel.mjs');
  assert.equal(b[11].sub, 'publish · pages', 'deploys of one commit that ended alike are one beat'); assert.equal(b[13].state, 'cancelled'); assert.equal(b[14].state, 'ok', 'a cancelled deploy is never folded into a success');
  assert.equal(b[6].id, 'T1'); assert.equal(b[7].verdict, 'failed'); assert.equal(b[0].title, 'Tiny'); assert.equal(b[0].at, '2026-01-01T00:00:00Z');
  assert.deepEqual(beatsOf(null), []); assert.deepEqual(beatsOf({ events: 'x' }), []);
  const two = beatsOf({ events: [{ k: 'deploy', sha: 'a', state: 'ok', workflow: 'x' }, { k: 'deploy', sha: 'b', state: 'ok', workflow: 'y' }] });
  assert.deepEqual(two.map((x) => [x.kind, x.events]), [['start', []], ['deploy', [0]], ['deploy', [1]]], 'deploys of different commits are different beats');
  const strays = beatsOf({ events: [{ k: 'commit', sha: 'a', files: [] }, { k: 'node', sha: 'b', path: 'q' }, { k: 'wire', sha: 'a', from: 'q', to: 'r' }] });
  assert.deepEqual(strays.map((x) => [x.kind, x.events]), [['start', []], ['commit', [0]]], 'only its own new files and wires belong to a commit');
  assert.deepEqual(beatsOf({ events: [{ k: 'node', path: 'a' }] }).map((x) => x.kind), ['start'], 'a lone event no beat can say stays silent');
});

test('B1: the picture\'s events, each from one build event: the repo germinates, Kar grows, files are born where they live', () => {
  const k = kernelOf(LOG);
  const want = [
    [0, 'germinate', 'repo'], [0, 'born', 'kar'], [1, 'born', 'f:CLAIMS.md'], [2, 'receipt', 'f:CLAIMS.md'], [3, 'born', 'auditor'], [3, 'flow', 'kar>auditor'], [3, 'run', 'auditor:ok'],
    [5, 'born', 'dir:src'], [5, 'born', 'f:src/app.mjs'], [6, 'born', 'f:src/kernel.mjs'], [7, 'born', 'f:RESULTS.md'], [8, 'born', 'f:receipts.json'],
    [9, 'link', 'f:src/app.mjs|f:src/kernel.mjs'], [10, 'born', 'claim:T1@RESULTS.md'], [10, 'run', 'claim:T1@RESULTS.md:ok'], [11, 'born', 'claim:T2@RESULTS.md'], [11, 'run', 'claim:T2@RESULTS.md:failed'],
    [12, 'receipt', 'f:receipts.json'], [13, 'flow', 'kar>auditor'], [13, 'run', 'auditor:failed'], [14, 'born', 'gate'], [14, 'flow', 'gate>f:src/kernel.mjs'], [14, 'run', 'gate:failed'],
    [15, 'born', 'pages'], [15, 'flow', 'kar>pages'], [15, 'run', 'pages:ok'], [16, 'flow', 'kar>pages'], [16, 'run', 'pages:ok'], [17, 'flow', 'kar>f:src/kernel.mjs'],
    [18, 'flow', 'kar>pages'], [18, 'run', 'pages:failed'], [19, 'flow', 'kar>pages'], [19, 'run', 'pages:ok'],
  ];
  const got = k.map((e) => [e.bi, e.t, e.t === 'flow' ? e.a + '>' + e.b : e.t === 'link' ? e.a + '|' + e.b : e.t === 'run' ? e.id + ':' + e.state : e.id]);
  assert.deepEqual(got, want);
  assert.equal(k[0].label, 'Tiny'); assert.equal(k[1].to, 'repo'); assert.equal(k[1].kind, 'organ'); assert.equal(k[1].label, 'Kar, the builder');
  assert.equal(k[2].fam, 'promises'); assert.equal(k[2].kind, 'repo'); assert.equal(k[2].to, 'repo'); assert.equal(k[2].label, 'CLAIMS');
  assert.equal(k[7].to, 'repo'); assert.equal(k[7].kind, 'layer'); assert.equal(k[7].label, 'src/'); assert.equal(k[8].to, 'dir:src');
  assert.equal(k[4].to, 'kar'); assert.equal(k[4].label, 'the checking robot'); assert.equal(k[20].to, 'auditor'); assert.equal(k[20].label, 'the gate'); assert.equal(k[23].label, 'the live page');
  assert.equal(k[13].to, 'f:RESULTS.md'); assert.equal(k[13].label, 'promise T1');
  // every kernel event applies to the real kernel; nothing is ignored
  const s = K.replay(k);
  assert.equal(s.ignored, 0); assert.equal(s.applied, k.length);
  assert.equal(s.nodes.get('claim:T2@RESULTS.md').run, 'failed', 'B3: the failed promise is a failed (red) cell');
  assert.equal(s.nodes.get('gate').run, 'failed'); assert.equal(s.nodes.get('pages').run, 'ok');
  // no node for a file it never saw: a wire or a gate on an unknown file draws no edge
  const odd = kernelOf({ events: [{ k: 'wire', from: 'a', to: 'b' }, { k: 'gate', file: 'z', total: 1, survived: 0 }, { k: 'seal', path: 'q' }, { k: 'receipt', path: 'q' }, { k: 'claim', id: 'X', path: 'nope', verdict: 'held' }, { k: 'claim', id: 'Y', path: 'nope', verdict: 'unmeasured' }, { k: 'commit', files: [{ path: 'q' }] }] });
  assert.deepEqual(odd.map((e) => e.t + ':' + (e.id || e.a)), ['germinate:repo', 'born:kar', 'born:gate', 'run:gate', 'born:claim:X@nope', 'run:claim:X@nope', 'born:claim:Y@nope']);
  assert.equal(odd[3].state, 'ok', 'no survivors: the gate is ok');
  const half = kernelOf({ events: [{ k: 'node', path: 'a' }, { k: 'wire', from: 'a', to: 'b' }, { k: 'wire', from: 'b', to: 'a' }] });
  assert.equal(half.filter((e) => e.t === 'link').length, 0, 'a wire with one end not drawn draws nothing');
  assert.equal(odd[2].to, 'kar', 'the gate hangs from Kar until the robot exists'); assert.equal(odd[4].to, 'repo');
  const deep = kernelOf({ events: [{ k: 'node', path: 'a/b/c.mjs' }, { k: 'node', path: 'a/d.mjs' }] });
  assert.deepEqual(deep.filter((e) => e.t === 'born').map((e) => e.id + '<' + e.to), ['kar<repo', 'dir:a<repo', 'dir:a/b<dir:a', 'f:a/b/c.mjs<dir:a/b', 'f:a/d.mjs<dir:a']);
  const many = kernelOf({ events: [...Array(10)].map((_, i) => ({ k: 'node', path: 'f' + i })).concat([{ k: 'commit', files: [...Array(10)].map((_, i) => ({ path: 'f' + i })) }]) });
  assert.equal(many.filter((e) => e.t === 'flow').length, 8, 'at most 8 lights per saved step');
  assert.deepEqual(kernelOf(null), []); assert.equal(kernelOf({ title: 'T', events: [{ k: 'x' }] })[0].label, 'T');
  assert.equal(kernelOf({ events: [{ k: 'x' }] })[0].label, 'the build');
});

test('B2 + B4: the script: every beat a plain line with its events, times in order, the same log the same hash', () => {
  const sc = scriptOf(LOG);
  assert.equal(sc.beats[0].t, 0); assert.equal(sc.beats[0].dur, PACE.intro);
  for (let i = 1; i < sc.beats.length; i++) { const p = sc.beats[i - 1]; close(sc.beats[i].t, Math.round((p.t + p.dur) * 10) / 10, 0.11); }
  for (const b of sc.beats) { assert.equal(b.line, narrate(beatsOf(LOG)[sc.beats.indexOf(b)])); assert.ok(plain(b.line), b.line); }
  assert.ok(sc.beats.slice(1).every((b) => b.events.length > 0), 'B2: no line without a real event');
  assert.deepEqual(sc.beats.filter((b) => b.fail).map((b) => b.kind), ['claim', 'checks', 'gate', 'deploy'], 'B3: every failure is a failure beat');
  const k = kernelOf(LOG);
  assert.equal(sc.kernel.length, k.length, 'every kernel event is in the script');
  for (const ke of sc.kernel) { const beat = sc.beats.find((b) => b.events.includes(ke.bi)); assert.ok(beat, 'kernel event ' + ke.bi); assert.equal(ke.time, beat.t); }
  assert.equal(sc.kernel.find((e) => e.t === 'germinate').time, sc.beats[1].t, 'the repo germinates with the first step');
  assert.equal(sc.duration, Math.round(sc.beats.reduce((s, b) => s + b.dur, 0) * 10) / 10);
  assert.equal(scriptOf(LOG).hash, sc.hash, 'same log, same script');
  assert.equal(scriptOf(JSON.parse(JSON.stringify(LOG))).hash, sc.hash);
  const other = JSON.parse(JSON.stringify(LOG)); other.events[13].failedSteps = [];
  assert.notEqual(scriptOf(other).hash, sc.hash, 'a changed record, a changed script');
  assert.match(sc.hash, /^[0-9a-f]{16}$/);
  assert.equal(scriptOf(null).beats.length, 0); assert.equal(scriptOf(null).duration, 0);
  assert.deepEqual({ ...PACE }, { wordsPerSecond: 2.6, pause: 1.4, min: 3, max: 9, intro: 4 });
  assert.equal(durationOf('one two'), 3); assert.equal(durationOf('a b c d e f g h i j k l m'), 6.4); assert.equal(durationOf('w '.repeat(40)), 9); assert.equal(durationOf(''), 3); assert.equal(durationOf(5), 3);
});

test('the caption track: one cue per beat, its line, at its time', () => {
  const v = vttOf({ beats: [{ t: 0, dur: 4, line: 'Hello.' }, { t: 4, dur: 3.5, line: 'Next.' }, { t: 3725.25, dur: 1, line: 'Late.' }, { t: 9, dur: 1, line: '' }, null] });
  assert.equal(v, 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.000\nHello.\n\n2\n00:00:04.000 --> 00:00:07.500\nNext.\n\n3\n01:02:05.250 --> 01:02:06.250\nLate.\n');
  assert.equal(vttOf(null), 'WEBVTT\n\n'); assert.equal(vttOf({ beats: [{ t: -5, dur: NaN, line: 'x' }] }), 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:00.000\nx\n');
});

test('Shorts: the 20-40 s windows with the most happening, failures first, never overlapping', () => {
  const beats = [{ t: 0, dur: 10, kind: 'commit' }, { t: 10, dur: 10, kind: 'gate' }, { t: 20, dur: 10, kind: 'claim', fail: true }, { t: 30, dur: 10, kind: 'commit' },
    { t: 40, dur: 10, kind: 'commit' }, { t: 50, dur: 10, kind: 'commit' }, { t: 60, dur: 10, kind: 'deploy' }, { t: 70, dur: 50, kind: 'commit' }];
  const s = shortsOf({ beats });
  assert.deepEqual(s.map((x) => [x.from, x.to, x.t, x.dur, x.score]), [[0, 3, 0, 40, 7], [4, 6, 40, 30, 3]]);
  assert.deepEqual(shortsOf({ beats }, 20, 40, 1).map((x) => x.from), [0]);
  assert.deepEqual(shortsOf({ beats }, 10, 10, 2).map((x) => [x.from, x.score]), [[1, 2], [2, 3]], 'exactly 10 s windows: the failure, then the gate');
  assert.deepEqual(shortsOf({ beats: [{ t: 0, dur: 5, kind: 'commit' }] }), [], 'nothing long enough');
  assert.deepEqual(shortsOf(null), []);
  assert.deepEqual(shortsOf({ beats: [{ t: 0, dur: 20, kind: 'x' }, { t: 20, dur: 20, kind: 'x' }] }, 20, 40, 3).map((x) => [x.from, x.to]), [[0, 1]], 'a tie: the earliest, then nothing that overlaps');
});

test('B4: the label: LIVE only for the live tap, RECORDED for everything else, with what it covers', () => {
  const L = { repo: 'me/tiny', from: 'aaaaaaa1', to: 'ccccccc9' };
  assert.equal(labelFor('recorded', L), 'RECORDED · a replay of me/tiny aaaaaaa…ccccccc, from its build log');
  assert.equal(labelFor('live', L), 'LIVE · me/tiny · each event as it happens');
  for (const m of [undefined, 'LIVE', 'Live', 'replay', '', null, 1]) { assert.ok(labelFor(m, L).startsWith('RECORDED'), String(m)); assert.ok(!labelFor(m, L).includes('LIVE'), String(m)); }
  assert.equal(labelFor('live', null), 'LIVE · this build · each event as it happens');
  assert.equal(labelFor('recorded', {}), 'RECORDED · a replay of a build, from its build log');
  assert.equal(labelFor('recorded', { repo: 'x', from: 'a' }), 'RECORDED · a replay of x, from its build log');
});

test('B1: the audit: a logged event against one derived again; a redaction mark stands for what the raw text held', () => {
  const a = { k: 'commit', sha: 'abc', msg: 'Companion for ' + PRIVATE + ' done', files: [1] };
  assert.equal(sameEvent(a, { ...a, msg: 'Companion for secret-thing done' }), true);
  assert.equal(sameEvent(a, { ...a, msg: 'Companion for  done' }), false, 'a mark stands for at least one character');
  assert.equal(sameEvent(a, { ...a, msg: 'Other for x done' }), false);
  assert.equal(sameEvent({ k: 'x', m: 'key ' + REDACTED }, { k: 'x', m: 'key ghp_abc' }), true);
  assert.equal(sameEvent(a, { ...a, files: [2] }), false); assert.equal(sameEvent(a, { ...a, extra: 1 }), false); assert.equal(sameEvent({ k: 1 }, { k: 1 }), true);
  assert.equal(sameEvent({ m: 'a.b' }, { m: 'a.b' }), true); assert.equal(sameEvent({ m: 'a(b' + PRIVATE }, { m: 'a(bX' }), true, 'the rest is literal');
  assert.equal(sameEvent(null, {}), false); assert.equal(sameEvent({}, 'x'), false);
  assert.equal(sameEvent({ m: PRIVATE }, { m: 5 }), false, 'a mark matches text, never a number'); assert.equal(sameEvent({ m: 5 }, { m: 'x' + PRIVATE }), false);
  assert.deepEqual(auditLog([{ k: 1 }, { k: 2 }], [{ k: 1 }, { k: 2 }]), { ok: true, checked: 2, missing: 0, extra: 0, differ: [] });
  assert.deepEqual(auditLog([{ k: 1 }], [{ k: 1 }, { k: 2 }]), { ok: false, checked: 1, missing: 1, extra: 0, differ: [] });
  assert.deepEqual(auditLog([{ k: 1 }, { k: 3 }, { k: 4 }], [{ k: 1 }, { k: 2 }]), { ok: false, checked: 2, missing: 0, extra: 1, differ: [1] });
  assert.equal(auditLog(null, null).ok, true);
  assert.deepEqual(auditLog([...Array(12)].map((_, i) => ({ k: i })), [...Array(12)].map(() => ({ k: -1 }))).differ, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'at most 10 listed');
});

test('the committed real episodes: every line plain, every failure a failure line, every event sourced, nothing secret (B1, B2, B3, B5)', () => {
  for (const id of ['fallgarden-live', 'fallaccount-trades']) {
    const text = readFileSync(new URL('../episodes/' + id + '.log.json', import.meta.url), 'utf8'), log = JSON.parse(text);
    assert.deepEqual(secretsIn(text), [], id + ': nothing secret-shaped');
    assert.ok(log.events.every((e) => typeof e.src === 'string' && /^(git|gh):/.test(e.src)), id + ': every event names its source');
    const sc = scriptOf(log);
    for (const b of sc.beats) assert.ok(plain(b.line), id + ': ' + b.line);
    assert.ok(sc.beats.slice(1).every((b) => b.events.length), id + ': no line without an event');
    const st = K.replay(sc.kernel);
    assert.equal(st.ignored, 0, id + ': every picture event applies');
    for (const b of sc.beats.filter((x) => x.fail)) assert.ok(/did not|broke|got past|partly|stopped|went wrong/.test(b.line), id + ': ' + b.line);
    assert.deepEqual(secretsIn(vttOf(sc)), []);
  }
});

test('the default export carries every part, and garbage never throws', () => {
  assert.deepEqual(Object.keys(B), ['SECRETS', 'REDACTED', 'PRIVATE', 'secretsIn', 'redact', 'ROLES', 'roleOf', 'nameOf', 'syllables', 'grade', 'MAX_GRADE', 'JARGON', 'jargonIn', 'plain',
    'GLOSS', 'say', 'narrate', 'failed', 'beatsOf', 'kernelOf', 'PACE', 'durationOf', 'scriptOf', 'vttOf', 'shortsOf', 'labelFor', 'sameEvent', 'auditLog']);
  const junk = [undefined, null, 0, NaN, '', 'x', [], {}, [1], { events: [null, 1, 'x', { k: 'commit' }] }, { beats: [null] }];
  for (const a of junk) for (const b of junk) { secretsIn(a); redact(a, b); roleOf(a); nameOf(a); syllables(a); grade(a); jargonIn(a); plain(a); say(a); narrate(a); failed(a); beatsOf(a); kernelOf(a); durationOf(a); scriptOf(a); vttOf(a); shortsOf(a, b, b, b); labelFor(a, b); sameEvent(a, b); auditLog(a, b); }
});
