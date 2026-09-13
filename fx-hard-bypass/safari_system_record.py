"""
What the speakers get: the real Safari driven through play and stop on a round while the
system output (routed through a multi-output device that includes BlackHole) is recorded.

    python3 safari_system_record.py <round url> <out-dir> <label> [seconds of play=8]

Needs: Safari > Develop > Allow Remote Automation, and the default output set to a multi-output
device that includes "BlackHole 2ch" (see audioctl). Records BlackHole with ffmpeg, joins the
round as a guest in Safari, plays, presses stop (wall time logged), waits four seconds, stops
the recording. The in-page log of AudioBufferSource starts/stops is written next to the wav.
"""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from safari_stop_probe import wd, js, click, wait_for, PORT

HOOKS = r"""
window.__qa = { starts: [], stops: [], t0: Date.now() };
const os = AudioBufferSourceNode.prototype.start, ot = AudioBufferSourceNode.prototype.stop;
AudioBufferSourceNode.prototype.start = function (when) {
  if (this.buffer && this.buffer.length > 1000) { const w = when === undefined ? this.context.currentTime : when; this.__qaT = w; window.__qa.starts.push({ wall: Date.now() + (w - this.context.currentTime) * 1000 }); }
  return os.apply(this, arguments);
};
AudioBufferSourceNode.prototype.stop = function (when) {
  if (this.__qaT !== undefined) { const w = when === undefined ? this.context.currentTime : when; window.__qa.stops.push({ wall: Date.now() + (w - this.context.currentTime) * 1000 }); }
  return ot.apply(this, arguments);
};
return 'hooks on';
"""


def main():
    url, out, label = sys.argv[1], sys.argv[2], sys.argv[3]
    play_s = float(sys.argv[4]) if len(sys.argv) > 4 else 8.0
    os.makedirs(out, exist_ok=True)
    wav = os.path.join(out, 'system.wav')
    driver = subprocess.Popen(['safaridriver', '-p', str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    rec = None
    try:
        session = wd('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'safari'}}})['sessionId']
        wd('POST', '/url', {'url': url}, session)
        wait_for(session, 'document.querySelector("[data-test=button-guest]") || document.querySelector("[data-test=button-get-started]")')
        if js(session, 'return !document.querySelector("[data-test=button-guest]")'):
            click(session, '[data-test=button-get-started]')
            wait_for(session, 'document.querySelector("[data-test=button-guest]")')
        click(session, '[data-test=button-guest]')
        wait_for(session, 'document.querySelector("#guest-name")')
        el = wd('POST', '/element', {'using': 'css selector', 'value': '#guest-name'}, session)
        wd('POST', f'/element/{list(el.values())[0]}/value', {'text': 'system ' + label}, session)
        click(session, '[data-test=button-name]')
        wait_for(session, 'location.pathname.startsWith("/play/") && document.querySelector("svg [role=button][aria-label]")', 60)
        time.sleep(5)
        print(js(session, HOOKS))
        rec = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'avfoundation', '-i', ':BlackHole 2ch', '-ac', '2', '-ar', '48000', wav], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        rec_start = time.time()
        time.sleep(2.0)
        toggle = 'svg [role=button][aria-label]'
        t_play = time.time()
        click(session, toggle)
        time.sleep(play_s)
        click(session, toggle)
        t_press = time.time()
        time.sleep(4.0)
        log = js(session, 'return window.__qa')
        rec.terminate(); rec.wait(timeout=10); rec = None
        report = {'label': label, 'url': url, 'rec_start_wall': rec_start, 'play_wall': t_play, 'press_wall': t_press,
                  'play_offset_s': t_play - rec_start, 'press_offset_s': t_press - rec_start,
                  'starts_after_press_ms': sorted(round(s['wall'] - t_press * 1000) for s in log['starts'] if s['wall'] > t_press * 1000)[:8],
                  'stops_near_press_ms': sorted(round(s['wall'] - t_press * 1000) for s in log['stops'] if abs(s['wall'] - t_press * 1000) < 500)[:8]}
        json.dump(report, open(os.path.join(out, 'report.json'), 'w'), indent=1)
        print(json.dumps(report, indent=1))
        wd('DELETE', '', None, session)
    finally:
        if rec: rec.terminate()
        driver.terminate()


if __name__ == '__main__':
    main()
