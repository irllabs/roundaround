"""
Ring-out and gain-staging probe (playback-fix branch evidence).

    QA_PORT=<port> python3 ring_probe.py <base-url> <out-dir>

Guest round, every step of the three rounds on, ten seconds of playback. Logs every
sample start, every gain ramp to zero (a sampler release or the end-of-buffer fade),
and meters the signal going INTO the master compressor (pre-limiter) as well as the
destination (post). Reports how long after a hit its fade starts against the sample's
length, and both peaks.
"""
import json, os, sys
sys.path.insert(0, '/Users/mericda/.local/share/roundaround-qa')
from cdp import Chrome
from play_toggle import TOGGLE, own_steps

LOG = r"""
(() => {
  window.__qaHits = []; window.__qaFades = [];
  const origStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when) {
    if (when !== undefined && this.buffer && this.buffer.length > 1000) window.__qaHits.push({ when, len: this.buffer.length, rate: this.buffer.sampleRate });
    return origStart.apply(this, arguments);
  };
  const origRamp = AudioParam.prototype.linearRampToValueAtTime;
  AudioParam.prototype.linearRampToValueAtTime = function (value, endTime) {
    if (value === 0) window.__qaFades.push({ endTime });
    return origRamp.apply(this, arguments);
  };
  const meters = {};
  const origConnect = AudioNode.prototype.connect;
  const meterFor = (ctx, key) => {
    if (meters[key]) return meters[key].sp;
    const sp = ctx.createScriptProcessor(4096, 2, 2); const sink = ctx.createGain(); sink.gain.value = 0; sink.__qaInternal = true; sp.__qaInternal = true;
    const stats = { maxAbs: 0, over1: 0, samples: 0 };
    sp.onaudioprocess = (e) => { for (let c = 0; c < e.inputBuffer.numberOfChannels; c++) { const d = e.inputBuffer.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > stats.maxAbs) stats.maxAbs = a; if (a >= 1) stats.over1++; stats.samples++; } } };
    origConnect.call(sp, sink); origConnect.call(sink, ctx.destination);
    meters[key] = { sp, stats }; window.__qaMeters = meters; return sp;
  };
  AudioNode.prototype.connect = function (dest, ...rest) {
    const out = origConnect.call(this, dest, ...rest);
    try {
      if (!this.__qaInternal) {
        if (dest instanceof AudioDestinationNode) origConnect.call(this, meterFor(dest.context, 'post'));
        if (dest instanceof DynamicsCompressorNode) origConnect.call(this, meterFor(dest.context, 'pre'));
      }
    } catch (e) {}
    return out;
  };
})();
"""

base, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
with Chrome(port=int(os.environ.get('QA_PORT', '9333')), width=1600, height=1200) as c:
    c.send('Page.addScriptToEvaluateOnNewDocument', source=LOG)
    c.goto(base)
    c.wait_for('document.querySelector("[data-test=button-get-started]")'); c.click('[data-test=button-get-started]')
    c.wait_for('document.querySelector("[data-test=button-guest]")', timeout=20); c.click('[data-test=button-guest]')
    c.wait_for('document.querySelector("#guest-name")'); c.type('#guest-name', 'ring probe'); c.click('[data-test=button-name]')
    c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=40); c.pump(1.5)
    seen = set()
    for s in own_steps(c):
        if s['id'] in seen: continue
        seen.add(s['id']); c.click_at(s['x'], s['y']); c.pump(0.1)
    c.pump(1.0)
    c.eval('window.__qaHits = []; window.__qaFades = []; for (const k in (window.__qaMeters || {})) { window.__qaMeters[k].stats.maxAbs = 0; window.__qaMeters[k].stats.over1 = 0; }')
    c.click(TOGGLE); c.pump(10.0)
    hits = c.eval('window.__qaHits'); fades = c.eval('window.__qaFades')
    meters = c.eval('(() => { const o = {}; for (const k in (window.__qaMeters || {})) o[k] = Object.assign({}, window.__qaMeters[k].stats); return o })()')
    layers = c.eval('[...document.querySelectorAll("svg textPath")].map(t => t.textContent)')
    c.click(TOGGLE); c.pump(0.5)
fade_ends = sorted(f['endTime'] for f in fades)
rows = []
for h in hits:
    nxt = next((t for t in fade_ends if t > h['when'] + 0.005), None)
    if nxt is not None:
        rows.append({'sample_ms': round(h['len'] / h['rate'] * 1000), 'fade_end_after_start_ms': round((nxt - h['when']) * 1000, 1)})
by_len = {}
for r in rows: by_len.setdefault(r['sample_ms'], []).append(r['fade_end_after_start_ms'])
summary = {'layers': layers, 'steps on': len(seen), 'hits': len(hits), 'fades to zero': len(fades),
           'fade end after start, by sample length (ms: median of hits)': {str(k): sorted(v)[len(v)//2] for k, v in sorted(by_len.items())},
           'pre-limiter max abs': meters.get('pre', {}).get('maxAbs'), 'pre-limiter samples over 1': meters.get('pre', {}).get('over1'),
           'post max abs': meters.get('post', {}).get('maxAbs'), 'post samples over 1': meters.get('post', {}).get('over1')}
json.dump({'summary': summary, 'hits': hits, 'fades': fades}, open(os.path.join(out, 'report.json'), 'w'), indent=1)
print(json.dumps(summary, indent=2))
