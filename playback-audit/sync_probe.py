"""
Multiplayer sync probe for roundaround.

    QA_PORT=<port A> QA_PORT_B=<port B> python3 sync_probe.py <base-url> <out-dir>

Two browsers on one round. A creates it as a guest and turns on every fourth step
of each round; B joins it as a second guest. A presses play; B is expected to
start when the round's isPlaying reaches it. Both log every scheduled sample
start with the wall clock, so the offset between the two clients' grids can be
measured on one machine: how long B took to start, and by how much B's steps
are shifted against A's (modulo a step and modulo a bar).
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from cdp import Chrome
from play_toggle import TOGGLE, own_steps

LOG = r"""
(() => {
  window.__qaStarts = [];
  const origStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when) {
    const ctx = this.context;
    if (when !== undefined && this.buffer && this.buffer.length > 1000) {
      window.__qaStarts.push({ when, now: ctx.currentTime, wall: Date.now() + (when - ctx.currentTime) * 1000 });
    }
    return origStart.apply(this, arguments);
  };
})();
"""


def guest(c, url, name):
    c.send('Page.addScriptToEvaluateOnNewDocument', source=LOG)
    c.goto(url)
    c.wait_for('document.querySelector("[data-test=button-guest]") || document.querySelector("[data-test=button-get-started]")', timeout=30)
    if c.eval('!document.querySelector("[data-test=button-guest]")'):
        c.click('[data-test=button-get-started]')
        c.wait_for('document.querySelector("[data-test=button-guest]")', timeout=20)
    c.click('[data-test=button-guest]')
    c.wait_for('document.querySelector("#guest-name")')
    c.type('#guest-name', name)
    c.click('[data-test=button-name]')
    c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=60)
    c.pump(2.0)


def main():
    base, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    a = Chrome(port=int(os.environ.get('QA_PORT', '9333')), width=1400, height=1000)
    b = Chrome(port=int(os.environ.get('QA_PORT_B', '9334')), width=1400, height=1000)
    a.launch(); b.launch()
    try:
        guest(a, base, 'sync A')
        seen = set(); n = 0
        for s in own_steps(a):
            if s['id'] in seen: continue
            seen.add(s['id'])
            if n % 4 == 0:
                a.click_at(s['x'], s['y']); a.pump(0.1)
            n += 1
        a.pump(2.0)
        url = a.eval('location.href')
        guest(b, url, 'sync B')
        b.pump(3.0)  # A's rounds and steps arrive
        t_click = time.time() * 1000
        a.click(TOGGLE)
        a.pump(8.0); b.pump(0.1)
        sa = a.eval('window.__qaStarts'); sb = b.eval('window.__qaStarts')
        playing_b = b.eval('document.querySelector("svg [role=button][aria-label]").getAttribute("aria-label")')
        a.click(TOGGLE); a.pump(1.0)
    finally:
        a.close(); b.close()
    report = analyse(sa, sb, t_click)
    report['B button label while A played'] = playing_b
    report['round'] = url
    with open(os.path.join(out, 'report.json'), 'w') as f:
        json.dump({'a': sa, 'b': sb, 'analysis': report}, f, indent=2)
    print(json.dumps(report, indent=2))


def analyse(sa, sb, t_click, bpm=120, steps=16):
    import math
    step = 60000 / bpm * 4 / steps; bar = step * steps
    if not sa or not sb:
        return {'A starts': len(sa), 'B starts': len(sb), 'error': 'one client never started'}
    wa = sorted(s['wall'] for s in sa); wb = sorted(s['wall'] for s in sb)
    def phase(ws, period):
        ang = [w % period / period * 2 * math.pi for w in ws]
        return math.atan2(sum(map(math.sin, ang)), sum(map(math.cos, ang))) / (2 * math.pi) * period % period
    def diff(p, q, period):
        d = (q - p) % period
        return d - period if d > period / 2 else d
    return {
        'A starts': len(sa), 'B starts': len(sb),
        'A first hit after the click ms': round(wa[0] - t_click, 1), 'B first hit after the click ms': round(wb[0] - t_click, 1),
        'B behind A, first hit ms': round(wb[0] - wa[0], 1),
        'B grid shift vs A, modulo a step ms': round(diff(phase(wa, step), phase(wb, step), step), 1),
        'B grid shift vs A, modulo a bar ms': round(diff(phase(wa, bar), phase(wb, bar), bar), 1),
    }


if __name__ == '__main__':
    main()
