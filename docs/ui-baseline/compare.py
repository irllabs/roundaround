#!/usr/bin/env python3
"""Compare a candidate capture against docs/ui-baseline. Usage: compare.py CANDIDATE_DIR [--threshold 0.5]"""
import argparse, os, sys
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('candidate'); ap.add_argument('--threshold', type=float, default=0.5); ap.add_argument('--tolerance', type=int, default=24)
a = ap.parse_args()
names = sorted(n for n in os.listdir(HERE) if n.endswith('.png') and not n.startswith('diff-'))
worst = 0.0
for n in names:
    cand = os.path.join(a.candidate, n)
    if not os.path.exists(cand):
        print(f'{n} MISSING'); worst = 100; continue
    base = Image.open(os.path.join(HERE, n)).convert('RGB'); img = Image.open(cand).convert('RGB')
    if base.size != img.size:
        print(f'{n} SIZE {base.size} vs {img.size}'); worst = 100; continue
    diff = ImageChops.difference(base, img).convert('L').point(lambda v: 255 if v > a.tolerance else 0)
    changed = sum(1 for v in diff.getdata() if v) / (diff.width * diff.height) * 100
    worst = max(worst, changed)
    diff.save(os.path.join(a.candidate, f'diff-{n}'))
    print(f'{n} changed={changed:.2f}%')
sys.exit(1 if worst > a.threshold else 0)
