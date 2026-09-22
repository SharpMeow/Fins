"""Cut the nine fish in fish-atlas.png out of their painted navy background.

Usage: python3 tools/key-fish-atlas.py <opaque atlas in> <atlas with alpha out> [preview.png]
Needs Pillow, NumPy and SciPy (pip install pillow numpy scipy).

The atlas was painted on an opaque navy background, so the sprite trim in world.js found nothing
and every fish was drawn as a dark square. The opaque original is in git history
(git show e7cf2ac:game/art/fish-atlas.png > fish-atlas-opaque.png) and this script regenerates
game/art/fish-atlas.png from it.

Each 256 px cell is keyed on its own by key_cell() in tools/spritekey.py.
"""
import os
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spritekey import key_cell  # noqa: E402

CELL, CELLS = 256, 3


def main():
    src, dst = sys.argv[1], sys.argv[2]
    im = np.asarray(Image.open(src).convert("RGB")).astype(float) / 255
    out = np.zeros((im.shape[0], im.shape[1], 4))
    report = []
    for idx in range(CELLS * CELLS):
        r, c = divmod(idx, CELLS)
        sl = (slice(r * CELL, (r + 1) * CELL), slice(c * CELL, (c + 1) * CELL))
        fg, alpha, bg = key_cell(im[sl])
        out[sl][..., :3] = fg
        out[sl][..., 3] = alpha
        ys, xs = np.nonzero(alpha > 0.07)
        report.append((idx, round(float(alpha.mean()), 3), int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())))
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(dst, optimize=True)
    for row in report:
        print("cell %d coverage %.3f bbox x %d-%d y %d-%d" % (row[0], row[1], row[2], row[4], row[3], row[5]))
    if len(sys.argv) > 3:
        rgba = Image.open(dst)
        w, h = rgba.size
        sheet = Image.new("RGB", (w * 2, h), (236, 240, 244))
        sheet.paste(rgba, (0, 0), rgba)
        checker = Image.new("RGB", (w, h))
        cp = checker.load()
        for y in range(h):
            for x in range(w):
                cp[x, y] = (230, 60, 170) if ((x // 16 + y // 16) % 2) else (40, 200, 120)
        checker.paste(rgba, (0, 0), rgba)
        sheet.paste(checker, (w, 0))
        sheet.save(sys.argv[3])


if __name__ == "__main__":
    main()
