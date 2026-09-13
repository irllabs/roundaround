# Master bus peaks, one round, every step on

Three rounds (hi-hat, perc, perc), all 48 steps on, ten seconds of playback at 120 bpm, measured with `peak_probe.py` on the summed signal at the audio destination before the device clamps it. A creates the round; B and C join the same round as a second guest, so the material is identical. The `.mp4`s are the recorded output for listening.

| build | peak (x full scale) | samples at or over 1 | clipped runs | recording |
|---|---|---|---|---|
| A master f390f08 | 2.555 | 0.2349% | 6468 | `a-master-every-step-on.mp4` |
| B #316 compressor only | 1.218 | 0.0045% | 79 | `b-compressor-only.mp4` |
| C #316 compressor + soft ceiling | 0.995 | 0.0000% | 0 | `c-compressor-and-ceiling.mp4` |

B’s residue is single-sample overshoots from the compressor’s 1 ms attack; in the encoded recordings A has 161 flat-topped runs and B none, so B already sounds clean at this level, but the device would still clamp those spikes. C holds everything under full scale.
