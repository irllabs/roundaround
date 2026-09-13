# Playback, size one: evidence (branch claude/playback-fix)

Measured in headless Chrome on the branch build (port 3110) against master edc5bf6 (port 3100), guest sessions, 120 bpm, three rounds. Probes: `play_toggle.py`, `nav_tour.py`, `timing_probe.py`, `choke_probe.py`, `peak_probe.py` from ~/.local/share/roundaround-qa, plus `ring_probe.py` here (pairs every hit with its fade-out and meters the signal before and after the master limiter).

## Hits ring out

Every step of the three rounds on. On master each hit's fade-out ends 225 ms after it starts (one 125 ms step plus the sampler's 100 ms fade), whatever the sample. On the branch it ends at the sample's own length plus the 100 ms fade.

| build | samples in the round | fade-out ends after the hit |
|---|---|---|
| master edc5bf6 | 64, 153, 503 ms | 225 ms for all three |
| claude/playback-fix | 64, 104, 684 ms | 165, 205, 785 ms |

Reports: `ring-master/report.json`, `ring/report.json`.

## Samples aligned and levelled (scripts/prepare-samples.mjs --check, before and after)

| instrument | leading silence before, min / median / max | after | peak before | peak after |
|---|---|---|---|---|
| HiHats | 0.1 / 0.9 / 21.1 ms | 0.1 / 0.9 / 1.0 ms | -0.9 to -0.1 dB | -3.0 dB |
| Kicks | 0.0 / 0.2 / 2.2 ms | 0.0 / 0.2 / 1.0 ms | -5.4 to -0.1 dB | -3.0 dB |
| Perc | 0.0 / 8.5 / 39.0 ms | 0.0 / 1.0 / 1.0 ms | -12.5 to -0.1 dB | -3.0 dB |
| Snares | 0.0 / 0.3 / 2.7 ms | 0.0 / 0.3 / 1.0 ms | -1.3 to -0.1 dB | -3.0 dB |

## Gain staging, every step on

| build | peak into the master compressor | peak at the destination | samples over full scale before the limiter |
|---|---|---|---|
| master edc5bf6 (layers at 0 dB) | 1.929 | 0.989 | 19662 |
| claude/playback-fix (new layers at -6 dB) | 0.645 | 0.735 | 0 |

`peak_probe.py` on the branch: max abs 0.915 at the destination with every step on (a different random round), nothing over 1. Note: the destination reads higher than the compressor input at these levels because Chrome's DynamicsCompressorNode applies makeup gain (about +1 dB here); that is the limiter from #316, not this branch.

## Grid

`timing_probe.py` on the branch, 198 scheduled hits over 8 bars: 0.000 ms off the 16-step grid, lead 47 to 99 ms, three hits per grid time (`timing/grid-analysis.json`). The rounding change only touches counts that do not divide the bar; 16 is unchanged.

## Play, stop and the routes

`play-toggle/play-toggle.mp4` (with sound): play starts the round, stop stops it, the button follows. `nav-tour/report.json`: every route move passes.
