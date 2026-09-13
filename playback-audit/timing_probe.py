"""
Step timing probe for roundaround.

    QA_PORT=<chrome port> python3 timing_probe.py <base-url> <out-dir>

Signs in as guest, turns on every other step of the three rounds (24 steps), plays
for ~8 bars and records every AudioBufferSourceNode.start(): the scheduled time,
the context time when it was scheduled (the lead), the buffer it plays and its
start offset. Reports how far the scheduled times sit from the ideal 16-step grid,
whether any start was scheduled late (in the past), how many buffers were started
per bar, and the sample rate / lookahead / latency of the context.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cdp import Chrome
from play_toggle import TOGGLE, own_steps

LOG = r"""
(() => {
  window.__qaStarts = [];
  const origStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when, offset, duration) {
    const ctx = this.context;
    window.__qaStarts.push({ when: when === undefined ? null : when, now: ctx.currentTime, offset: offset === undefined ? null : offset,
      len: this.buffer ? this.buffer.length : null, rate: this.buffer ? this.buffer.sampleRate : null, playback: this.playbackRate.value });
    return origStart.apply(this, arguments);
  };
})();
"""


def main():
    base, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    with Chrome(port=int(os.environ.get('QA_PORT', '9333')), width=1600, height=1200) as c:
        c.send('Page.addScriptToEvaluateOnNewDocument', source=LOG)
        c.goto(base)
        c.wait_for('document.querySelector("[data-test=button-get-started]")')
        c.click('[data-test=button-get-started]')
        c.wait_for('document.querySelector("[data-test=button-guest]")', timeout=20)
        c.click('[data-test=button-guest]')
        c.wait_for('document.querySelector("#guest-name")')
        c.type('#guest-name', 'timing probe')
        c.click('[data-test=button-name]')
        c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=40)
        c.pump(1.5)
        seen = set(); n = 0
        for s in own_steps(c):
            if s['id'] in seen: continue
            seen.add(s['id'])
            if n % 2 == 0:
                c.click_at(s['x'], s['y']); c.pump(0.1)
            n += 1
        c.pump(1.0)
        c.click(TOGGLE)
        c.pump(16.5)  # ~8 bars at 120 bpm
        starts = c.eval('window.__qaStarts')
        ctx = c.eval('(() => { const ctx = window.__qaCtx; return ctx ? { sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency, outputLatency: ctx.outputLatency, state: ctx.state } : null })()')
        c.click(TOGGLE); c.pump(0.5)
        tone = c.eval('(() => { try { const t = window.Tone; return t ? { lookAhead: t.getContext().lookAhead, latencyHint: t.getContext().latencyHint, bpm: t.getTransport().bpm.value, ppq: t.getTransport().PPQ } : "no window.Tone" } catch (e) { return String(e) } })()')
    report = analyse(starts, ctx, tone)
    with open(os.path.join(out, 'report.json'), 'w') as f:
        json.dump({'starts': starts, 'ctx': ctx, 'tone': tone, 'analysis': report}, f, indent=2)
    print(json.dumps({'ctx': ctx, 'tone': tone, 'analysis': report}, indent=2))


def analyse(starts, ctx, tone, bpm=120, steps=16):
    step = 60 / bpm * 4 / steps
    whens = [s['when'] for s in starts if s['when'] is not None]
    if not whens:
        return {'error': 'no scheduled starts'}
    t0 = min(whens)
    # deviation from the nearest grid point, relative to the first start
    devs = []
    for w in whens:
        k = round((w - t0) / step)
        devs.append((w - t0 - k * step) * 1000)
    late = [s for s in starts if s['when'] is not None and s['when'] < s['now']]
    leads = [(s['when'] - s['now']) * 1000 for s in starts if s['when'] is not None]
    immediate = [s for s in starts if s['when'] is None]
    bars = (max(whens) - t0) / (step * steps)
    offsets = sorted(set(round(s['offset'] or 0, 4) for s in starts))
    rates = sorted(set(s['rate'] for s in starts if s['rate']))
    return {
        'starts': len(starts), 'immediate (no time given)': len(immediate), 'scheduled in the past': len(late),
        'bars covered': round(bars, 2), 'starts per bar': round(len(whens) / max(bars, 1e-9), 2),
        'grid deviation ms: max abs': round(max(abs(d) for d in devs), 3), 'mean abs': round(sum(abs(d) for d in devs) / len(devs), 3),
        'lead ms: min': round(min(leads), 1), 'median': round(sorted(leads)[len(leads) // 2], 1), 'max': round(max(leads), 1),
        'start offsets used': offsets[:5], 'buffer sample rates': rates,
    }


if __name__ == '__main__':
    main()
