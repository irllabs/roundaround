"""
Source of truth: the round rendered straight from the sample files on the ideal grid, and the
app's recordings compared against it.

    python3 sot_compare.py <round.json> <manifest dir> <samples dir> <out dir> <label>=<recording dir>[,<log with the recorder line>] ...

The reference places each layer's full-velocity sample at bar*barSeconds + step*stepSeconds, at
unity gain, ringing out, no limiter; hits keep coming until the app's stop press, then a 30 ms
fade. Each recording (the app's audio output) is aligned to the reference by envelope
correlation around the play press, then compared hit by hit: onset timing, missing and extra
hits, how much of every hit's tail is there 200 and 400 ms later (the choke), level, and what
comes after the stop press.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np

SR = 48000
BPM = 120
STEP = 60 / BPM * 4 / 16
BAR = STEP * 16


def decode(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def envelope(x, win_s=0.005):
    win = max(1, int(win_s * SR))
    return np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode='same') + 1e-12)


def db(v):
    return 20 * np.log10(np.maximum(v, 1e-6))


def build_reference(round_data, manifests, samples_dir, seconds_of_hits, stop_at):
    layers = []
    total = int((stop_at + 3.0) * SR)
    ref = np.zeros(total)
    hits = []
    for layer in round_data['layers']:
        inst = layer['instrument']
        art = manifests[inst['sampler']][inst['sample']]
        file = [s for s in art['samples'] if int(s['hivel']) >= 127][0]['sample']
        wav = decode(os.path.join(samples_dir, inst['sampler'], file))
        on = [i for i, st in enumerate(layer['steps']) if st.get('isOn')]
        gain = 10 ** ((layer.get('gain') or 0) / 20)
        lead = int(np.argmax(np.abs(wav) > 0.05 * np.abs(wav).max())) / SR
        layers.append({'sampler': inst['sampler'], 'sample': inst['sample'], 'file': file, 'steps': on, 'length_s': len(wav) / SR, 'leading_silence_ms': round(lead * 1000, 1)})
        bar = 0
        while True:
            placed = False
            for i in on:
                t = bar * BAR + i * STEP
                if t >= stop_at:
                    continue
                placed = True
                s = int(t * SR)
                seg = wav[: max(0, min(len(wav), total - s))] * gain
                ref[s:s + len(seg)] += seg
                hits.append({'t': t, 'layer': inst['sample']})
            bar += 1
            if not placed or bar * BAR >= stop_at:
                break
    # the ideal stop: a 30 ms fade at the press, then nothing
    s = int(stop_at * SR); f = int(0.03 * SR)
    ref[s:s + f] *= np.linspace(1, 0, f)
    ref[s + f:] = 0
    return ref, hits, layers


def onsets(env, thr_db=-30, min_gap=0.04):
    # a hit begins where the 5 ms envelope jumps by 12 dB within 10 ms and passes the threshold
    e = db(env)
    jump = e[int(0.01 * SR):] - e[:-int(0.01 * SR)]
    idx = np.where((jump > 12) & (e[int(0.01 * SR):] > thr_db))[0]
    out = []
    last = -1
    for i in idx:
        t = i / SR
        if t - last > min_gap:
            out.append(t); last = t
    return out


def align(ref_env, rec_env, guess, window=0.6):
    # best shift (recording time = reference time + shift) near the guess, by envelope correlation over the first 4 s
    n = int(4 * SR)
    a = db(ref_env[:n]); a = a - a.mean()
    best, best_c = guess, -1e9
    for shift in np.arange(guess - window, guess + window, 0.001):
        s = int(shift * SR)
        if s < 0 or s + n > len(rec_env):
            continue
        b = db(rec_env[s:s + n]); b = b - b.mean()
        c = float(np.dot(a, b))
        if c > best_c:
            best_c, best = c, shift
    return best


def compare(ref, ref_hits, rec, shift, stop_at):
    ref_env = envelope(ref); rec_env = envelope(rec)
    ref_on = onsets(ref_env); rec_on = [t - shift for t in onsets(rec_env)]
    # per hit timing: nearest recording onset within 40 ms
    timing = []; missing = 0
    for t in ref_on:
        near = [r for r in rec_on if abs(r - t) <= 0.04]
        if near:
            timing.append((min(near, key=lambda r: abs(r - t)) - t) * 1000)
        else:
            missing += 1
    extra = [round(r, 3) for r in rec_on if not any(abs(r - t) <= 0.04 for t in ref_on)]
    # the tail: level 200 and 400 ms after each hit, recording against reference (dB), for hits with nothing else within 0.4 s
    deficits200, deficits400 = [], []
    for t in ref_on:
        if any(0 < u - t < 0.4 for u in ref_on):
            continue
        for dt, out in ((0.2, deficits200), (0.4, deficits400)):
            i = int((t + dt) * SR); j = int((t + dt + shift) * SR)
            if i < len(ref_env) and j < len(rec_env) and ref_env[i] > 1e-3:
                out.append(float(db(rec_env[j]) - db(ref_env[i])))
    # after the press
    ps = int((stop_at + shift) * SR)
    after = rec_env[ps:ps + int(3 * SR)]
    loud = np.where(after > 10 ** (-40 / 20))[0]
    after_hits = [round(r - stop_at, 3) for r in rec_on if r > stop_at + 0.005]
    n = min(len(ref), len(rec) - int(shift * SR))
    level = float(db(np.sqrt(np.mean(rec[int(shift * SR):int(shift * SR) + n] ** 2))) - db(np.sqrt(np.mean(ref[:n] ** 2))))
    return {
        'alignment shift s': round(shift, 3),
        'reference hits': len(ref_on), 'recording hits': len(rec_on), 'missing': missing, 'extra': extra[:8],
        'timing error ms: mean': round(float(np.mean(timing)), 1) if timing else None, 'abs max': round(float(np.max(np.abs(timing))), 1) if timing else None, 'spread (std)': round(float(np.std(timing)), 1) if timing else None,
        'tail vs reference dB at +200 ms': round(float(np.median(deficits200)), 1) if deficits200 else None, 'at +400 ms': round(float(np.median(deficits400)), 1) if deficits400 else None,
        'level vs reference dB': round(level, 1),
        'after the press: audible above -40 dB until ms': int(loud.max() / SR * 1000) if len(loud) else 0, 'hits after the press s': after_hits[:6],
    }


def main():
    round_path, manifest_dir, samples_dir, out_dir = sys.argv[1:5]
    os.makedirs(out_dir, exist_ok=True)
    round_data = json.load(open(round_path))
    manifests = {k: json.load(open(os.path.join(manifest_dir, f'manifest-{k}.json'))) for k in ['HiHats', 'Kicks', 'Perc', 'Snares']}
    runs = []
    for arg in sys.argv[5:]:
        label, rest = arg.split('=', 1)
        rec_dir, log = (rest.split(',') + [None])[:2]
        report = json.load(open(os.path.join(rec_dir, 'report.json')))
        a0 = None
        if log:
            m = re.search(r'recording: (\{.*\})', open(log).read())
            a0 = json.loads(m.group(1))['audio_start']
        play = report['play_wall'] - a0; press = report['press_wall'] - a0
        runs.append((label, decode(os.path.join(rec_dir, 'session.mp4')), play, press))
    # one reference per run (the press comes at a slightly different moment each time)
    results = {}
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    fig, axes = plt.subplots(len(runs), 2, figsize=(17, 3.4 * len(runs)), gridspec_kw={'width_ratios': [1.2, 1]})
    for row, (label, rec, play, press) in enumerate(runs):
        stop_at = press - play - 0.1  # the app starts ~0.1 s after the play press; refined by the alignment below
        ref, hits, layers = build_reference(round_data, manifests, samples_dir, 8.0, stop_at)
        shift = align(envelope(ref), envelope(rec), play + 0.1)
        # rebuild with the press placed exactly in reference time
        stop_at = press - shift
        ref, hits, layers = build_reference(round_data, manifests, samples_dir, 8.0, stop_at)
        results[label] = compare(ref, hits, rec, shift, stop_at)
        results[label]['layers'] = layers
        np.save(os.path.join(out_dir, f'ref-{label[0]}.npy'), ref.astype(np.float32))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', os.path.join(out_dir, f'reference-{label[0]}.wav')], input=ref.astype(np.float32).tobytes(), check=True)
        t_ref = np.arange(len(ref)) / SR
        rec_al = rec[int(shift * SR):int(shift * SR) + len(ref)]
        t_rec = np.arange(len(rec_al)) / SR
        ax = axes[row][0]
        ax.plot(t_ref, ref, lw=0.3, color='#9a9a9a', label='reference (samples on the grid)')
        ax.plot(t_rec, -np.abs(rec_al) * 0 + rec_al, lw=0.3, color='#00bcd4', alpha=0.85, label=label)
        ax.axvline(stop_at, color='red', lw=1)
        ax.set_xlim(0, stop_at + 2.5); ax.set_ylim(-1.3, 1.3); ax.set_title(f'{label}: whole session over the reference (grey); red = stop press', loc='left', fontsize=10); ax.legend(loc='upper right', fontsize=8)
        ax = axes[row][1]
        ax.plot(t_ref, db(envelope(ref)), lw=0.8, color='#9a9a9a'); ax.plot(t_rec, db(envelope(rec_al)), lw=0.8, color='#00bcd4', alpha=0.9)
        ax.set_xlim(0, 2.0); ax.set_ylim(-60, 2); ax.set_title('first bar, 5 ms envelope in dB', loc='left', fontsize=10); ax.set_xlabel('s from the first downbeat')
    plt.tight_layout(); plt.savefig(os.path.join(out_dir, 'sot-compare.png'), dpi=110)
    json.dump(results, open(os.path.join(out_dir, 'results.json'), 'w'), indent=1)
    for label, r in results.items():
        print('===', label)
        for k, v in r.items():
            if k != 'layers': print('  %s: %s' % (k, v))
    print('layers:', json.dumps(results[list(results)[0]]['layers'], indent=1))


if __name__ == '__main__':
    main()
