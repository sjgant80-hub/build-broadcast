# Build Broadcast

Live: **https://sjgant80-hub.github.io/build-broadcast/**

Watch the estate build something real, explained so a 12-year-old can follow. There are two synced layers:

1. **The picture.** FallGarden Live's Living Visual (vendored byte for byte) draws the build growing as an organism. Parts
   appear as they are made, links light up as they start working together, the checking robot opens its eye, the gate
   tries to break things on purpose, and a failure turns red.
2. **The narrator.** It turns each real build event into one or two plain sentences, at a grade-7 reading level or below,
   with no unglossed jargon.

**Real build events only.** The tap (`tools/tap.mjs`) reads a build's git history and GitHub's own record of its checks
(read only). It redacts anything secret or private, and writes a build log in which every event names its source.
`tools/tap.mjs --audit` re-derives every event and compares them. On GitHub's runner it re-checks every event except the
gate results, whose run logs that runner may not read, and it says how many it skipped. A replay is always labelled
RECORDED; LIVE appears only for the local tap watching a build right now.

**For a buyer**, the page carries the brochure: what it gives each role, a cost case worked out by the law from your own
numbers and the sourced UK median wage, security and data protection, the risks answered straight, support (AI Native
Solutions, terms agreed per deployment) and the roll-out.

- **Episodes:** FallGarden Live and the Living Visual (`fallgarden` `live/`), and FallAccount Trades, an accounts app for
  builders and plumbers. Both are public builds with their real failures.
- **The recorder** draws an episode into a WebM file on a fixed clock (30 frames a second, nothing timed by the wall),
  with a caption file. Two recordings from the same log are compared frame by frame.
- **Shorts:** the 20-40 seconds of an episode with the most happening, failures first.
- **Live:** `node server.mjs --live-repo <path> --live-gh owner/name` plays a build as it happens, on this machine only.
  Streaming it, posting a Short, or making a client cut is Simon's call.

Claims were sealed before code in `CLAIMS.md` (B1-B5). Results are in `RESULTS.md`. CI runs:
- every test
- witness v0.6 on the law and the recorder (CLEAN, nothing baselined)
- the receipts check (every episode's script fingerprint)
- the audit

Built on FallGarden Live. LIGHT is Thomas Frumkin's; the codec comes from konomi-tongue, used with permission. MIT.
