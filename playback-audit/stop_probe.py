"""
Stop-latency probe for roundaround.

    QA_PORT=<port> python3 stop_probe.py <base-url> <out-dir>

Dense pattern (every other step of every round), then six stop presses at
different phases of the bar. For each press: how many hits were already handed
to Web Audio for a time AFTER the press (they still sound after the button), how
late the last of them lands, and how long the output stays above -40 dBFS.
"""
import json
import os
import sys
import math

sys.path.insert(0, os.path.dirname(__file__))
from cdp import Chrome
from play_toggle import TOGGLE, own_steps
from tail_probe import SOURCES, SLICES


def main():
    base, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    trials = []
    with Chrome(port=int(os.environ.get('QA_PORT', '9333')), width=1600, height=1200) as c:
        c.send('Page.addScriptToEvaluateOnNewDocument', source=SOURCES)
        c.goto(base)
        c.wait_for('document.querySelector("[data-test=button-get-started]")')
        c.click('[data-test=button-get-started]')
        c.wait_for('document.querySelector("[data-test=button-guest]")', timeout=20)
        c.click('[data-test=button-guest]')
        c.wait_for('document.querySelector("#guest-name")')
        c.type('#guest-name', 'stop probe')
        c.click('[data-test=button-name]')
        c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=60)
        c.pump(1.5)
        seen = set(); n = 0
        for s in own_steps(c):
            if s['id'] in seen: continue
            seen.add(s['id'])
            if n % 2 == 0:
                c.click_at(s['x'], s['y']); c.pump(0.08)
            n += 1
        c.pump(1.0)
        c.eval(SLICES)
        for k in range(6):
            c.eval('window.__qaLive = []; window.__qaSlices = []')
            c.click(TOGGLE)
            c.pump(2.0 + k * 0.137)  # a different phase each time
            c.click(TOGGLE)
            t_click = c.eval('window.__qaCtx.currentTime')  # right after the mouse went up: the press
            c.pump(1.6)
            live = c.eval('window.__qaLive'); slices = c.eval('window.__qaSlices')
            after = [s for s in live if s['when'] > t_click]
            loud = [s['t'] - t_click for s in slices if s['t'] > t_click and s['rms'] > 0.01]
            trials.append({'phase in bar ms': round(((t_click) % 2.0) * 1000), 'hits landing after the press': len(after),
                           'last of them ms after the press': round(max((s['when'] - t_click) * 1000 for s in after), 1) if after else 0,
                           'output above -40 dBFS until ms': round(max(loud) * 1000) if loud else 0})
            c.pump(0.6)
    summary = {'trials': trials, 'presses with a hit still to come': sum(1 for t in trials if t['hits landing after the press']),
               'max lateness ms': max(t['last of them ms after the press'] for t in trials), 'max audible ms': max(t['output above -40 dBFS until ms'] for t in trials)}
    json.dump(summary, open(os.path.join(out, 'report.json'), 'w'), indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
