"""
Master-bus peak probe for roundaround.

    QA_PORT=<chrome port> python3 peak_probe.py <base-url> <out-dir> [--caption=<title>] [--round=<play url>]

Signs in as guest (a fresh round with three rounds), turns EVERY step on so all
three instruments hit every step time (the worst-case stacking), plays for ten
seconds. With --round it joins that round instead (as a second guest) and plays
what is already there, so two builds can be measured on the same material and reports what reached the audio destination: the largest sample, and
how much of the signal sat at or above full scale, measured on the summed signal
before the device clamps it. Also records <out-dir>/peak.mp4 with the app's audio
so the result can be listened to, and writes <out-dir>/report.json.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cdp import Chrome
from play_toggle import TOGGLE, own_steps

# A meter on everything that connects to the destination: a ScriptProcessor sees the same summed
# signal the device gets, before it is clamped to [-1, 1].
METER = r"""
(() => {
  const meters = new WeakMap();
  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const out = origConnect.call(this, dest, ...rest);
    try {
      if (dest instanceof AudioDestinationNode && !this.__qaInternal) {
        const ctx = dest.context;
        let m = meters.get(ctx);
        if (!m) {
          const sp = ctx.createScriptProcessor(4096, 2, 2);
          const sink = ctx.createGain(); sink.gain.value = 0; sink.__qaInternal = true; sp.__qaInternal = true;
          const stats = { samples: 0, maxAbs: 0, over1: 0, over099: 0, sumSq: 0, blocks: 0, runs: 0, longestRun: 0 };
          const inRun = [false, false]; const runLen = [0, 0];
          sp.onaudioprocess = (e) => {
            const n = e.inputBuffer.numberOfChannels;
            for (let ch = 0; ch < n; ch++) {
              const d = e.inputBuffer.getChannelData(ch);
              for (let i = 0; i < d.length; i++) {
                const a = Math.abs(d[i]);
                if (a > stats.maxAbs) stats.maxAbs = a;
                if (a >= 1) { stats.over1++; runLen[ch]++; if (runLen[ch] > stats.longestRun) stats.longestRun = runLen[ch]; if (!inRun[ch]) { stats.runs++; inRun[ch] = true; } } else { inRun[ch] = false; runLen[ch] = 0; }
                if (a >= 0.99) stats.over099++;
                stats.sumSq += a * a;
              }
              stats.samples += d.length;
            }
            stats.blocks++;
          };
          origConnect.call(sp, sink); origConnect.call(sink, dest);
          m = { sp, stats }; meters.set(ctx, m); window.__qaMeter = stats;
        }
        origConnect.call(this, m.sp);
      }
    } catch (e) { console.warn('qa meter failed', e); }
    return out;
  };
})();
"""


def main():
    base, out = sys.argv[1], sys.argv[2]
    caption = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--caption=')), None)
    round_url = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--round=')), None)
    os.makedirs(out, exist_ok=True)
    report = {'url': base}
    with Chrome(port=int(os.environ.get('QA_PORT', '9333')), width=1600, height=1200) as c:
        c.send('Page.addScriptToEvaluateOnNewDocument', source=METER)
        if round_url:
            # join an existing round as a fresh guest: the sign-in dialog comes up on the deep link
            c.goto(round_url)
            c.wait_for('document.querySelector("[data-test=button-guest]") || document.querySelector("[data-test=button-get-started]")', timeout=30)
            if c.eval('!!document.querySelector("[data-test=button-get-started]") && !document.querySelector("[data-test=button-guest]")'):
                c.click('[data-test=button-get-started]')
                c.wait_for('document.querySelector("[data-test=button-guest]")', timeout=20)
            c.click('[data-test=button-guest]')
            c.wait_for('document.querySelector("#guest-name")')
            c.type('#guest-name', 'peak probe B')
            c.click('[data-test=button-name]')
            c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=60)
            c.pump(4.0)  # the other player's rounds arrive from Firestore
            report['stepsOn'] = None
        else:
            c.goto(base)
            c.wait_for('document.querySelector("[data-test=button-get-started]")')
            c.click('[data-test=button-get-started]')
            c.wait_for('document.querySelector("[data-test=button-guest]")', timeout=20)
            c.click('[data-test=button-guest]')
            c.wait_for('document.querySelector("#guest-name")')
            c.type('#guest-name', 'peak probe')
            c.click('[data-test=button-name]')
            c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=40)
            c.pump(1.5)
            seen = set()
            for s in own_steps(c):
                if s['id'] in seen:
                    continue
                seen.add(s['id'])
                c.click_at(s['x'], s['y'])
                c.pump(0.12)
            report['stepsOn'] = len(seen)
            c.pump(2.0)  # let the last toggles reach Firestore
        report['roundUrl'] = c.eval('location.href')
        report['layers'] = c.eval('[...document.querySelectorAll("svg textPath")].map(t => t.textContent)')
        c.start_recording()
        c.pump(0.8)
        c.mark('Every step on, all three rounds: play for ten seconds')
        c.click(TOGGLE)
        c.pump(10.0)
        report['meter'] = c.eval('window.__qaMeter ? Object.assign({}, window.__qaMeter) : null')
        report['bufferStarts'] = c.eval('window.__qaBufferStarts')
        c.click(TOGGLE)
        c.pump(1.0)
        c.stop_recording(os.path.join(out, 'peak.mp4'), caption=caption)
        report['console'] = [e for e in c.console if e[0] == 'exception' or e[1] in ('error', 'warning')][:10]
    m = report['meter']
    if m and m['samples']:
        m['over1Share'] = m['over1'] / m['samples']
        m['over099Share'] = m['over099'] / m['samples']
        m['rms'] = (m['sumSq'] / m['samples']) ** 0.5
    with open(os.path.join(out, 'report.json'), 'w') as f:
        json.dump(report, f, indent=2)
    print(json.dumps({k: v for k, v in report.items() if k != 'console'}, indent=2))


if __name__ == '__main__':
    main()
