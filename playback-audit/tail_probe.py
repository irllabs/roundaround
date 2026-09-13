"""
Stop-tail probe for roundaround.

    QA_PORT=<port> python3 tail_probe.py <base-url> <out-dir> [--record]

Plays a sparse pattern (the first step of each round only), stops right after a
downbeat, and measures what still comes out of the master afterwards: RMS in
50 ms slices for 3 s, any AudioBufferSource still running at the stop (and how
long it has left), any new starts after the stop, and the delay time of the
repeats if the tail is periodic.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cdp import Chrome
from play_toggle import TOGGLE, own_steps
from peak_probe import METER

SOURCES = r"""
(() => {
  window.__qaLive = [];
  const origStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when) {
    if (this.buffer && this.buffer.length > 1000) {
      const rec = { when: when === undefined ? this.context.currentTime : when, dur: this.buffer.duration, ended: null };
      this.addEventListener('ended', () => { rec.ended = this.context.currentTime; });
      window.__qaLive.push(rec);
    }
    return origStart.apply(this, arguments);
  };
})();
"""

SLICES = r"""
(() => {
  window.__qaSlices = [];
  const ctx = window.__qaCtx;
  const sp = ctx.createScriptProcessor(2048, 2, 2);
  const sink = ctx.createGain(); sink.gain.value = 0; sink.__qaInternal = true; sp.__qaInternal = true;
  let acc = 0, n = 0, sliceStart = ctx.currentTime;
  sp.onaudioprocess = (e) => {
    for (let ch = 0; ch < e.inputBuffer.numberOfChannels; ch++) { const d = e.inputBuffer.getChannelData(ch); for (let i = 0; i < d.length; i++) { acc += d[i] * d[i]; n++; } }
    const t = e.playbackTime;
    if (t - sliceStart >= 0.05) { window.__qaSlices.push({ t, rms: Math.sqrt(acc / Math.max(n, 1)) }); acc = 0; n = 0; sliceStart = t; }
  };
  // everything that feeds the destination also feeds the meter's ScriptProcessor; tap that
  window.__qaTap.stream; // ensure the tap exists
  const dest = ctx.destination;
  // connect the same sources: reuse the tap by making a MediaStreamSource from it
  const src = ctx.createMediaStreamSource(window.__qaTap.stream);
  src.connect(sp); sp.connect(sink); sink.connect(dest);
  return 'slices on';
})()
"""


def main():
    base, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    record = '--record' in sys.argv
    with Chrome(port=int(os.environ.get('QA_PORT', '9333')), width=1600, height=1200) as c:
        c.send('Page.addScriptToEvaluateOnNewDocument', source=SOURCES)
        c.goto(base)
        c.wait_for('document.querySelector("[data-test=button-get-started]")')
        c.click('[data-test=button-get-started]')
        c.wait_for('document.querySelector("[data-test=button-guest]")', timeout=20)
        c.click('[data-test=button-guest]')
        c.wait_for('document.querySelector("#guest-name")')
        c.type('#guest-name', 'tail probe')
        c.click('[data-test=button-name]')
        c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=60)
        c.pump(1.5)
        # the first step of each round only
        seen = set(); firsts = {}
        for s in own_steps(c):
            if s['id'] in seen: continue
            seen.add(s['id'])
        layers = c.eval('''(() => { const m = {}; for (const el of document.querySelectorAll("svg circle")) { const i = el.instance; if (i && i.id && i.layerId && i.isAllowedInteraction) m[i.id] = i.layerId; } return m })()''')
        for s in own_steps(c):
            lid = layers.get(s['id'])
            if lid and lid not in firsts:
                firsts[lid] = s; c.click_at(s['x'], s['y']); c.pump(0.1)
        c.pump(1.0)
        print('slices:', c.eval(SLICES))
        if record: c.start_recording()
        c.click(TOGGLE)
        c.pump(4.35)  # two bars and a bit: stop ~350 ms after the third downbeat
        t_stop = c.eval('window.__qaCtx.currentTime')
        c.click(TOGGLE)
        c.pump(3.5)
        live = c.eval('window.__qaLive'); slices = c.eval('window.__qaSlices')
        fx = c.eval('''(() => { try { const e = window.__roundaroundEngine; return e ? "engine exposed" : "no engine handle"; } catch (x) { return String(x) } })()''')
        if record:
            c.mark('Stopped: what still comes out'); c.pump(0.5)
            c.stop_recording(os.path.join(out, 'tail.mp4'), caption='stop tail')
    report = analyse(live, slices, t_stop)
    report['fx'] = fx
    json.dump({'report': report, 'live': live, 'slices': slices, 't_stop': t_stop}, open(os.path.join(out, 'report.json'), 'w'), indent=1)
    print(json.dumps(report, indent=2))


def analyse(live, slices, t_stop):
    running = [s for s in live if s['when'] <= t_stop and (s['ended'] is None or s['ended'] > t_stop)]
    after = [s for s in live if s['when'] > t_stop]
    tail = [(round(s['t'] - t_stop, 2), round(20 * __import__('math').log10(max(s['rms'], 1e-6)), 1)) for s in slices if s['t'] > t_stop]
    before = [s['rms'] for s in slices if t_stop - 0.5 < s['t'] <= t_stop]
    # find periodic bumps: local maxima in the tail more than 6 dB above their neighbours
    bumps = []
    for i in range(1, len(tail) - 1):
        if tail[i][1] > tail[i-1][1] + 3 and tail[i][1] > tail[i+1][1] + 3 and tail[i][1] > -60:
            bumps.append(tail[i])
    return {
        'sources still sounding at the stop': [{'started before stop s': round(t_stop - s['when'], 3), 'sample s': round(s['dur'], 3), 'left s': round(max(0, s['when'] + s['dur'] - t_stop), 3)} for s in running],
        'starts scheduled after the stop': len(after),
        'level before the stop dBFS (last 0.5 s)': round(20 * __import__('math').log10(max(max(before) if before else 1e-6, 1e-6)), 1),
        'tail dBFS per 0.25 s after the stop': [t for t in tail if abs((t[0] * 100) % 25) < 1][:14],
        'bumps in the tail (s after stop, dBFS)': bumps[:12],
        'time to fall under -60 dBFS s': next((t for t, db in tail if db < -60), None),
    }


if __name__ == '__main__':
    main()
