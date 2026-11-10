# Build Broadcast: results (claims in CLAIMS.md, sealed 7081f1a), checked on 2026-11-09

Live page: https://sjgant80-hub.github.io/build-broadcast/. CI (proof-of-play) is green on GitHub's runner. It runs:
- every test (24)
- witness v0.6 on the law, `broadcast.mjs`: 140/140, CLEAN
- witness v0.6 on the recorder, `recorder.mjs`: 46/46, CLEAN
- the receipts check
- the B1 audit

Nothing is baselined.

Episodes, from real build logs:
- **FallGarden Live comes alive** (`fallgarden` `live/`, 6969582…5de92da): 130 real events, 65 lines, 8 min 14 s, 1 real failure.
- **An accounts app for plumbers** (FallAccount Trades, f08ef90…dfe9942): 42 real events, 32 lines, 2 min 53 s, 2 deploys
  that did not finish.
- **Build Broadcast, building itself:** LIVE, from the local tap.

| # | Result | Numbers |
|---|---|---|
| B1 | **HELD in part** | Locally, with access to every run log, the audit re-derives every event of both logs from git and GitHub: 130 of 130 and 42 of 42, none missing and none extra. On GitHub's runner, against fresh clones, it re-derives every event except the 21 gate verdicts: 109 of 109 and 42 of 42. The runner's token cannot download another repository's run logs, where those verdicts are printed, and the audit says so in its output. In a real browser, every one of the 247 effects drawn for episode 1 maps through its kernel event to a build event with a git or GitHub source, with 0 wrong. All 196 kernel events apply to the real kernel, and 0 are ignored. |
| B2 | **HELD** | Every line of both committed scripts is plain: the highest Flesch-Kincaid grade is 4.3 in episode 1 and 6.0 in episode 2 (the bar is 7), and no line has an unglossed jargon word (a name like "kernel" is said with "which means the core rules"). Every beat after the opening carries at least one real event. The narrator's tests give each kind of event an exact line, and no line for an unknown event. The caption track has one cue per beat. |
| B3 | **HELD** | Episode 1's one failure, promise U1 "only partly held", is a failure line and a red cell, read from the GPU's own colour buffer as (1, 0.3, 0.24) with the failure flag set. Episode 2's two cancelled deploys are failure lines ("That update was stopped early. A newer one took its place.") and red runs. The narrator's tests cover every failure kind: a check that broke, gate survivors, a failed or partly held promise, and a deploy that failed or was cancelled. |
| B4 | **FAILED in part** | The script reproduces: GitHub's runner recomputes both scripts' fingerprints and they match the receipts (1b14867c494e68c8 and a3eef97cfb32199b). The page computes the same fingerprint in a real browser. The caption track reproduces: two recordings of Short 1 (1,149 frames, 38.3 s) gave byte-identical captions. **The frames do not reproduce exactly.** Of 1,149 frames, 29 differ, by at most 1/255 in one colour channel on at most 70 pixels. The cause is the GPU itself: with identical inputs, redrawing the very same frame gives a slightly different image on this laptop's GPU (an Intel Gen12). Reading one drawn frame twice gives the same pixels, so the copy-back is not at fault. The video files' bytes differ too, as a result. The label holds: RECORDED for every replay, LIVE only for the local tap, and a test shows no other mode can show LIVE. |
| B5 | **HELD** | The tap redacts before it writes and refuses to write anything secret-shaped or private. It was checked against the estate's list of 50 private repos, and these public logs needed 0 redactions. GitHub's runner scans every committed log and caption track for tokens, keys, private keys and email addresses, and finds none. The server never serves `live/` or `.git`. |

## Found by building it, and fixed

1. **The picture drew nothing at first.** The script stamped each event's time into `t`, the field the kernel uses for the
   event's kind. It is now `time`.
2. **The narrator's first lines were too hard.** Real data reached grade 12.3, from long lists and file names like "kernel".
   The lines are now short sentences, with names listed plainly and glosses in brackets. The highest grade is now 6.0.
3. **The tap missed 20 of 21 gate verdicts.** Its pattern expected the verdict on the line straight after its header.
4. **Two recordings drew different frames from the start.** The renderer kept its camera, frame counter, warm-up and clock
   across a reset, and the recorder kept the canvas size, so new cells were placed round a different centre. This was
   fixed in FallGarden Live (775c3fa) and in the recorder. Before the fix, 1,148 of 1,149 frames differed; after it, 29
   differ, by one shade (see B4).
5. **The mutation gate found the narrator's and the recorder's untested corners:**
   - a wire with one end drawn
   - the gate's ok state
   - a deploy run across two commits
   - the 30 s cluster boundary
   - a codec other than VP8

   The equivalent mutants (redundant guards, a tie-break a stable sort already gives) were restructured away, never
   exempted.
6. **On GitHub's runner, the audit could not read other repositories' run logs.** It now checks everything else there
   and says how many gate verdicts it could not re-check.
7. **A listener's read.** A local 7B, reading as a 12-year-old, understood all seven sample lines and found the gate's line
   the hardest ("broke kernel… 104 ways"). It now says what the gate does in plain words: it breaks the part on purpose,
   in 104 different ways, to see if the checks notice.

## Kept to Simon

Nothing has been streamed or posted. The live stream, any Short posted outward, and any client cut are his call. The
page is public on GitHub Pages and plays the recorded episodes. The live mode runs on this machine only.
