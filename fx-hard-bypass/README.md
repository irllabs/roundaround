# The trailing echo: a wet mix at 0 is not silence

`safari-system-capture-three-builds.m4a`: what macOS sent to the DAC while Meriç played round e7835033 in his Safari on three builds (old engine at 52 s, PR #321 at 68 s, PR #322 at 82 s), captured through a multi-output device (Mesh Card + BlackHole, made with `audioctl.swift`) by `safari_system_record.py`'s ffmpeg line. `safari-system-capture-analysis.png`: after the last hit of each, a repeat every ~0.40 s at -55 to -70 dB, fading 3 dB per repeat.

Cause: Tone effects leak their wet path at about -56 dB with the mix at 0 (offline render, Chrome and Safari: FeedbackDelay('3t', 0.7) repeats a burst at -65/-69/-72 dB every 0.444 s). Every bus carries two delays bypassed that way.

Same round, my headless Chrome, level at the delay repeats after the last hit (0.444 s apart):

| build | +0.444 s | +0.888 s | +1.332 s | +1.776 s |
|---|---|---|---|---|
| master, bypass by wet mix (`master-your-round.mp4`) | -7.2 dB (a hit) | -61.0 | -68.7 | -73.3 |
| PR #323, gated bypass (`fix-your-round.mp4`) | -7.0 dB (a hit) | -107.7 | -120 | -120 |
