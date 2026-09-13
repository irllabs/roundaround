# Source of truth: the round rendered from the original sample files, and the app against it

Round e7835033 (perc stick3, kick burn, kick sub, hi-hat dash; 120 bpm), rendered by `sot_compare.py` straight from `public/samples` on the ideal grid at unity gain, ringing out, no limiter, hits up to the app's stop press then a 30 ms fade (`reference-*.wav`). Each build's recording of the same round (see `../outro/`) is aligned to it by envelope correlation and compared hit by hit.

| build | hits ref / rec | missing | timing mean / spread / max (ms) | tail vs ref at +200 / +400 ms | level vs ref | after the press: audible until | hits after the press |
|---|---|---|---|---|---|---|---|
| A master engine | 23 / 25 | 0 | -0.1 / 0.5 / 1.4 | 1.1 / 1.1 dB | -1.5 dB | 406 ms | [0.05] |
| B PR321 | 23 / 24 | 0 | -2.4 / 5.6 / 14.6 | -1.6 / -1.9 dB | -3.2 dB | 0 ms | [] |
| C PR322 | 24 / 25 | 0 | 0.1 / 0.3 / 0.8 | 1.1 / 1.0 dB | -1.8 dB | 54 ms | [] |

Reading it: the old engine plays the composition on the grid and rings the tails like the reference, then plays the next downbeat 50 ms after the stop press (the echo). PR #321 lands 2 ms early on average with up to 15 ms per layer: its samples are trimmed, and the perc stick carried 15.6 ms of silence in the original file, so against the untrimmed reference the trim shows as "early"; its level is 3 dB down by the normalisation. PR #322 sits on the grid within 0.3 ms and stops within 54 ms. The 1 to 2 dB below the reference on every build is the master compressor on stacked downbeats.
