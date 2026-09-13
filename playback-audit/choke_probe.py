"""
Choke and rebuild probe for roundaround.

    QA_PORT=<chrome port> python3 choke_probe.py <base-url> <out-dir>

Part 1, the choke: round 1 gets every step on, rounds 2 and 3 stay silent; plays
two bars and pairs every AudioBufferSourceNode.start(when) with its stop(when):
how long each hit is allowed to sound.
Part 2, rebuilds while playing: one step of round 2 is toggled on/off/on... ten
times during playback; counts double starts (same buffer, same scheduled time)
and whether round 1 kept its 16 hits a bar.
"""
import json
import os
import sys
import collections

sys.path.insert(0, os.path.dirname(__file__))
from cdp import Chrome
from play_toggle import TOGGLE, own_steps

LOG = r"""
(() => {
  window.__qaEv = [];
  let seq = 0;
  const origStart = AudioBufferSourceNode.prototype.start;
  const origStop = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (when) {
    if (when !== undefined && this.buffer && this.buffer.length > 1000) { this.__qaId = ++seq; window.__qaEv.push({ id: this.__qaId, ev: 'start', when, now: this.context.currentTime, len: this.buffer.length }); }
    return origStart.apply(this, arguments);
  };
  AudioBufferSourceNode.prototype.stop = function (when) {
    if (this.__qaId) window.__qaEv.push({ id: this.__qaId, ev: 'stop', when: when === undefined ? this.context.currentTime : when, now: this.context.currentTime });
    return origStop.apply(this, arguments);
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
        c.type('#guest-name', 'choke probe')
        c.click('[data-test=button-name]')
        c.wait_for('location.pathname.startsWith("/play/") && ' + TOGGLE, timeout=40)
        c.pump(1.5)
        # group steps by layer, in draw order
        steps = []
        seen = set()
        for s in own_steps(c):
            if s['id'] in seen: continue
            seen.add(s['id']); steps.append(s)
        layers = c.eval('''(() => { const m = {}; for (const el of document.querySelectorAll("svg circle")) { const i = el.instance; if (i && i.id && i.layerId && i.isAllowedInteraction) m[i.id] = i.layerId; } return m })()''')
        by_layer = collections.defaultdict(list)
        for s in steps: by_layer[layers[s['id']]].append(s)
        layer_ids = list(by_layer)
        for s in by_layer[layer_ids[0]]:
            c.click_at(s['x'], s['y']); c.pump(0.08)
        c.pump(1.5)
        c.eval('window.__qaEv = []')
        c.click(TOGGLE)
        c.pump(4.3)  # two bars
        part1 = c.eval('window.__qaEv')
        # part 2: toggle one step of round 2 on/off ten times while playing
        c.eval('window.__qaEv = []')
        t = by_layer[layer_ids[1]][4]
        for i in range(10):
            c.click_at(t['x'], t['y']); c.pump(0.37)
        c.pump(2.5)
        part2 = c.eval('window.__qaEv')
        c.click(TOGGLE); c.pump(0.5)
    r1 = analyse_choke(part1); r2 = analyse_rebuild(part2)
    with open(os.path.join(out, 'report.json'), 'w') as f:
        json.dump({'choke': r1, 'rebuild': r2, 'events1': part1, 'events2': part2}, f, indent=2)
    print(json.dumps({'choke': r1, 'rebuild': r2}, indent=2))


def analyse_choke(ev):
    starts = {e['id']: e for e in ev if e['ev'] == 'start'}
    stops = {e['id']: e for e in ev if e['ev'] == 'stop'}
    lens = []
    for i, s in starts.items():
        if i in stops:
            lens.append((stops[i]['when'] - s['when']) * 1000)
    lens.sort()
    buf = collections.Counter(s['len'] for s in starts.values())
    return {'hits': len(starts), 'hits with a stop scheduled': len(lens), 'sample length ms': {str(k): round(k / 48, 0) for k in buf},
            'sounding time ms: min': round(lens[0], 1) if lens else None, 'median': round(lens[len(lens) // 2], 1) if lens else None, 'max': round(lens[-1], 1) if lens else None}


def analyse_rebuild(ev):
    starts = [e for e in ev if e['ev'] == 'start']
    by = collections.Counter((round(e['when'], 4), e['len']) for e in starts)
    doubles = [(k, v) for k, v in by.items() if v > 1]
    stops_immediate = [e for e in ev if e['ev'] == 'stop' and abs(e['when'] - e['now']) < 0.002]
    per_buf = collections.Counter(e['len'] for e in starts)
    return {'starts': len(starts), 'per buffer': {str(k): v for k, v in per_buf.items()}, 'double starts (same buffer, same time)': len(doubles), 'examples': doubles[:5],
            'stops scheduled for right now (a hit cut on rebuild)': len(stops_immediate)}


if __name__ == '__main__':
    main()
