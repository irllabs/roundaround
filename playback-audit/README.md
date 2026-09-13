# Playback audit, master edc5bf6, 2026-09-13

Probes (run from ~/.local/share/roundaround-qa, `QA_PORT=<port> python3 <probe>.py <base-url> <out-dir>`):

- `timing_probe.py`: every scheduled sample start against the 16-step grid, and the scheduling lead. Result: 198 starts over 8 bars, 0.000 ms off the grid, lead 47 to 100 ms (`timing-report.json`).
- `choke_probe.py`: how long a hit sounds with every step on. Result: the gain of every hit is ramped down at the next on step (one step, 125 ms at 120 bpm, plus a 100 ms fade), on a 612 ms sample (`choke-report.json`). Toggling a step ten times during playback produced no double or dropped hits in this run; the hazard is the 100 ms look-ahead window on every rebuild, see the report.
- `sync_probe.py`: two browsers on one round, A presses play. Result: B never starts (its button stays Play); isPlaying is not shared (`sync-report.json`).
- `peak_probe.py`: master-bus peaks, from the #316 work.

Sample library (public/samples, 128 wav, 16-bit 44.1 kHz stereo): kicks and snares start within 3 ms, hi-hats up to 21 ms late, perc up to 40 ms late (Perc_Shake-12a/b); no file exceeds 0.99 peak.
