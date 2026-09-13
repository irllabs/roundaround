# Playback engine v2, QA on the branch build

Branch `claude/playback-engine`, measured on a local build made with `VITE_PLAYBACK_ENGINE=v2`
(served on 3121; the default build of the same branch on 3120), headless Chrome 153, guest
sessions on the dev Firestore, 120 bpm, three rounds. Probes from `~/.local/share/roundaround-qa`
except `sync_probe_v2.py`, which is here.

| check | v2 result | file |
|---|---|---|
| play/stop with sound | button follows the store, audio starts on click 1 and stops on click 2, no console errors | `play-toggle/play-toggle.mp4`, `play-toggle/report.json` |
| default engine on the same build | unchanged, plays and stops, no console errors | `default-engine/report.json` |
| route tour | landing, guest sign-in, play, back, new round, wordmark, browser back, deep link: all ok | `nav/report.json` |
| grid accuracy, 24 steps on, 8 bars | 201 hits, 0.000 ms off the grid, exactly 3 per grid time, look-ahead 95 to 137 ms | `timing/summary.json`, `timing/report.json` |
| hit length, every step on | no stop scheduled for any hit: samples ring to their end (542 ms sample, was cut at 125 ms + fade) | `choke/report.json` |
| toggling a step ten times while playing | 67 starts, no double start, no hit cut | `choke/report.json` |
| master bus, every step on, three rounds | peak 0.962 x full scale, no sample at or over 1 (the #316 chain is untouched) | `peak/report.json`, `peak/peak.mp4` |
| two browsers, one round, A presses play | B starts on its own 247 ms after A's click; bar 0 differs by 7 ms on the wall clock; B's grid within 7 ms of A's; B stops when A stops; both clients' clock offsets within 7 ms of each other (275 and 283 ms, 3 samples each) | `sync/report.json`, `sync_probe_v2.py` |

Notes:

- The two-browser numbers are on one machine, so the two clock-offset estimates share a wall
  clock; across machines the alignment error is the difference of the two estimates, which the
  samples put at a few tens of milliseconds.
- `smoke/` and `timing2/` are earlier runs on the same code with `?engine=v2` on the URL; the
  URL switch does not survive the in-app navigation a second guest makes when joining, which is
  why the first two-browser run had the second browser on the old engine.
