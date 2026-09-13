"""
Two-browser sync on playback engine v2: sync_probe.py's scenario, plus each client's server
clock estimate and origin, read from window.__roundaroundEngine.

    QA_PORT=<port A> QA_PORT_B=<port B> python3 sync_probe_v2.py <base-url> <out-dir>
"""
import json
import os
import sys
import time

sys.path.insert(0, '/Users/mericda/.local/share/roundaround-qa')
from cdp import Chrome
from play_toggle import TOGGLE, own_steps
from sync_probe import guest, analyse

ENGINE = '(() => { const e = window.__roundaroundEngine; if (!e || !e.isV2) return { name: e ? e.name : null }; return { name: e.name, on: e.isOn(), clock: e.clockSync(), origin: e.scheduler.origin(), now: e.currentTime(), wall: Date.now() } })()'


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
            if n % 16 == 0:  # the first step of each round only: one hit per bar, so the bar phase is unambiguous
                a.click_at(s['x'], s['y']); a.pump(0.1)
            n += 1
        a.pump(2.0)
        url = a.eval('location.href')
        guest(b, url, 'sync B')
        b.pump(4.0)
        before = {'a': a.eval(ENGINE), 'b': b.eval(ENGINE)}
        t_click = time.time() * 1000
        a.click(TOGGLE)
        a.pump(8.0); b.pump(0.1)
        sa = a.eval('window.__qaStarts'); sb = b.eval('window.__qaStarts')
        after = {'a': a.eval(ENGINE), 'b': b.eval(ENGINE)}
        playing_b = b.eval('document.querySelector("svg [role=button][aria-label]").getAttribute("aria-label")')
        a.click(TOGGLE); a.pump(1.5); b.pump(0.1)
        stopped_b = b.eval('(() => { const e = window.__roundaroundEngine; return { on: e.isOn(), label: document.querySelector("svg [role=button][aria-label]").getAttribute("aria-label") } })()')
        console_b = [e for e in b.console if e[0] == 'exception' or e[1] in ('error', 'warning')][:5]
    finally:
        a.close(); b.close()
    report = analyse(sa, sb, t_click)
    # bar 0 of each transport on the shared wall clock: the alignment error, whatever the pattern
    bar0 = {who: after[who]['wall'] - (after[who]['now'] - after[who]['origin']) * 1000 for who in ('a', 'b') if after[who].get('origin') is not None}
    report['bar 0 on the wall clock, B minus A ms'] = round(bar0['b'] - bar0['a'], 1) if len(bar0) == 2 else None
    report['B started after the click ms'] = round(bar0['b'] - t_click, 1) if 'b' in bar0 else None
    report['B button label while A played'] = playing_b
    report['B after A stopped'] = stopped_b
    report['engines before'] = before
    report['engines after'] = after
    report['B console'] = console_b
    report['round'] = url
    with open(os.path.join(out, 'report.json'), 'w') as f:
        json.dump({'a': sa, 'b': sb, 'analysis': report}, f, indent=2)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
