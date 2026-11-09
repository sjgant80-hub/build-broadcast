# Build Broadcast: sealed claims (2026-11-09, before any code)

Simon's spec: watch the estate build something real, explained so a 12-year-old can follow. Two synced layers:

1. **The picture.** The FallGarden graph, drawn by the Living Visual (FallGarden Live's renderer, vendored byte for byte),
   shows the build assemble. Parts appear as they are made, links pulse as they connect, the checks open their eye, the
   gate judges, and a failure turns red.
2. **The narrator.** It turns each real build event into one or two plain sentences.

**The one rule:** real build events only. The narration says what really happened. Nothing is scripted to look live,
live and recorded are always labelled, and a replay is never dressed as live.

**What a build event is.** The tap (`tools/tap.mjs`) reads only real records:
- git history: each commit, each file it adds or changes, each local import a file gains, each sealed claims file, each
  receipt changed
- the claims each results file marks held or failed
- GitHub's own record of every CI run on those commits: each step's result, and the mutation gate's verdict read from the
  run's own log

Each event carries its source: the commit and path, or the run, job and step. Nothing private is broadcast. Public repos
only on the public page, and a redaction pass at the tap.

**Episodes from real builds:**
- **1.** FallGarden Live and the Living Visual, built today (`fallgarden`, `live/`).
- **2.** FallAccount Trades, an accounts app for builders and plumbers, from its real history.
- **3.** This build, tapped **live** as it is made.

A client's private cut, made with their consent, is supported locally and never published.

## Claims (each checked as stated; any that fail are kept as failed)

- **B1 · Everything shown is a real build event.** Every node, edge, packet, ring and mote on screen is caused by a
  kernel event. Every kernel event comes from one build event of the log, and every build event names its source.

  The checks:
  - `tools/audit.mjs` re-derives every event of a committed log from the repo's git history and GitHub's run records.
    It runs on GitHub's runner, against a fresh clone. Every event must match, and none may be missing.
  - In a real browser, every entry of the renderer's effect log maps back through its kernel event to a build event of
    the log.
- **B2 · Every narration line describes the real event it is paired with.** No line is spoken without a real event.
  Each line is a template filled with that event's own specifics: its file, its counts, its step's name.

  The lines are plain:
  - At most grade 7 on the Flesch-Kincaid scale (a 12-year-old).
  - No jargon unless glossed in the same line ("which means …").

  The checks: the narrator's tests, every beat of every committed episode script, and the caption track, all checked
  line by line.
- **B3 · A failure is shown and said honestly.** Every failure in the log is drawn red and narrated with a failure line
  that says what broke and what happens next. A failure is any of:
  - a CI step that failed
  - a mutation gate with survivors
  - a claim marked failed
  - a deploy that did not finish

  The checks:
  - The narrator's tests.
  - Every failure event of the committed episodes: its beat is a failure line, and its node is drawn red. The red is
    read from the renderer's own colour buffer in a real browser.
- **B4 · The recording reproduces from the build log, and live is labelled live.** The same log gives the same episode
  script: every beat, its time, its line and its events. GitHub's runner recomputes the script hash and compares it with
  the committed receipt.

  The episode file is rendered from that script on a fixed clock (30 frames a second, nothing timed by the wall). Two
  renders from the same log give the same caption track and the same sequence of frames, compared frame by frame by
  pixel hash. The video file's bytes are compared too, and the result is reported either way.

  A replay is labelled RECORDED with its repo and commit range. The live tap is labelled LIVE, and a test shows the two
  labels can never swap.
- **B5 · No secrets on screen.** The tap redacts before anything is written:
  - tokens, keys, private keys and email addresses
  - any private repo name

  The checks:
  - GitHub's runner scans every committed log, script and caption file for secret patterns and finds none.
  - Locally, the tap's output is checked against the estate's own list of private repos, and none appears.

## Kept to Simon

Nothing is streamed or posted outward without Simon: not the live stream, a Short, or a client cut. The tap, the
binding, the narrator, the recorder, the Shorts cutter and the live mode are built and proven locally. The page is
public on GitHub Pages and plays the recorded episodes.
