"""
Warm-up, play, stop, long outro: one recording per build of the SAME round.

    QA_PORT=<port> python3 outro_probe.py <round url> <out-dir> <label>

Joins the round as a second guest (its layers play, this guest adds none), lets everything
settle, records the app's audio output, plays for eight seconds, presses stop (the wall time
of the press is written to the report), and keeps recording for four seconds. The report gives
the press offset inside the recording so recordings can be lined up at the press.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from cdp import Chrome
from play_toggle import TOGGLE
from sync_probe import guest


def main():
    url, out, label = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    with Chrome(port=int(os.environ.get('QA_PORT', '9333')), width=1400, height=1000) as c:
        guest(c, url, 'outro ' + label)
        c.pump(6.0)  # warm up: samples decoded, the other player's layers in
        layers = c.eval('[...document.querySelectorAll("svg textPath")].map(t => t.textContent)')
        c.start_recording()
        c.pump(1.5)
        t_play = time.time()
        c.click(TOGGLE)
        c.pump(8.0)
        c.click(TOGGLE)
        t_press = time.time()
        c.pump(4.0)
        info = c.stop_recording(os.path.join(out, 'session.mp4'), caption=label)
        report = {'label': label, 'url': url, 'layers': layers, 'play_wall': t_play, 'press_wall': t_press, 'recording': info}
        if isinstance(info, dict) and 'audio_start' in info:
            report['play_offset_s'] = t_play - info['audio_start']
            report['press_offset_s'] = t_press - info['audio_start']
    json.dump(report, open(os.path.join(out, 'report.json'), 'w'), indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != 'recording'}, indent=1))


if __name__ == '__main__':
    main()
