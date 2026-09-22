"""Cut painted objects out of their backgrounds for the game's sprite folders.

Usage:
  python3 tools/key-sprite.py <painted.png> <sprite.png>
  python3 tools/key-sprite.py <folder of painted PNGs> <output folder>
Needs Pillow, NumPy and SciPy (pip install pillow numpy scipy).

One object per image, painted on a plain background that does not touch the object anywhere
along the edges (see docs/art-spec.md). The keying is key_cell() in tools/spritekey.py; the
result is trimmed to the object plus 6 px and written with a transparent background.
"""
import os
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spritekey import key_cell  # noqa: E402

PAD = 6


def key_file(src, dst):
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(float) / 255
    fg, alpha, _bg = key_cell(rgb)
    ys, xs = np.nonzero(alpha > 0.03)
    if not len(xs):
        raise SystemExit("%s: found no object on the background" % src)
    x0, y0 = max(0, xs.min() - PAD), max(0, ys.min() - PAD)
    x1, y1 = min(rgb.shape[1], xs.max() + PAD + 1), min(rgb.shape[0], ys.max() + PAD + 1)
    out = np.dstack([fg, alpha])[y0:y1, x0:x1]
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(dst, optimize=True)
    print("%s -> %s  %dx%d" % (src, dst, x1 - x0, y1 - y0))


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    if os.path.isdir(src):
        os.makedirs(dst, exist_ok=True)
        for name in sorted(os.listdir(src)):
            if name.lower().endswith(".png"):
                key_file(os.path.join(src, name), os.path.join(dst, name))
    else:
        key_file(src, dst)


if __name__ == "__main__":
    main()
