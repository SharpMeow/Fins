"""Cut a painted object out of the background it was painted on.

Shared by tools/key-fish-atlas.py (the nine-fish atlas) and tools/key-sprite.py (one object per
file). key_cell() takes an RGB float array whose edges are background and returns the object's
colours, its alpha and the background colour:
  1. Background colour: the median of a 10 px band along the edges.
  2. Distance of every pixel from it, weighting brightness and chroma.
  3. Seeds are pixels far from the background; the object is everything connected to a seed that is
     still clearly off the background (hysteresis), closed over small gaps, with enclosed holes
     filled so dark markings inside stay, keeping the largest piece.
  4. On the outer 4 px, opacity follows the distance from the background, so no rim of background
     is left; edge colours are un-mixed from the background.
"""
import numpy as np
from scipy import ndimage as ndi


def key_cell(rgb):
    band = np.concatenate([rgb[:10].reshape(-1, 3), rgb[-10:].reshape(-1, 3), rgb[:, :10].reshape(-1, 3), rgb[:, -10:].reshape(-1, 3)])
    bg = np.median(band, axis=0)
    diff = rgb - bg
    lum = diff @ np.array([0.299, 0.587, 0.114])
    chroma = np.linalg.norm(diff - lum[..., None], axis=-1)
    d = np.sqrt((lum * 1.4) ** 2 + chroma ** 2)
    band_d = np.concatenate([d[:10].ravel(), d[-10:].ravel(), d[:, :10].ravel(), d[:, -10:].ravel()])
    # The 90th percentile, not the maximum: a neighbouring fish that reaches into the band must not
    # raise the bar for this one.
    noise = np.percentile(band_d, 90)
    seeds = d > max(0.22, noise * 3.5)
    lo = max(0.075, noise * 1.5)
    grow = d > lo
    lab, n = ndi.label(grow)
    keep = np.zeros(n + 1, bool)
    keep[np.unique(lab[seeds])] = True
    keep[0] = False
    mask = keep[lab]
    mask = ndi.binary_closing(mask, structure=np.ones((5, 5)), iterations=1)
    mask = ndi.binary_fill_holes(mask)
    lab, n = ndi.label(mask)
    if n > 1:
        sizes = ndi.sum(mask, lab, range(1, n + 1))
        mask = lab == (1 + int(np.argmax(sizes)))
    mask = ndi.binary_opening(mask, structure=np.ones((3, 3)))
    # The painting's edges are ragged dark strokes that sit inside the mask at full strength and
    # read as a navy outline on a light tank. On the outer 4 px only, opacity follows how far each
    # pixel is from the background colour; inside that rim (dark stripes, eyes) the fish is solid.
    rim = mask & ~ndi.binary_erosion(mask, iterations=4)
    soft = np.clip((d - lo) / (lo * 2.5), 0, 1)
    alpha = np.where(rim, soft, mask.astype(float))
    alpha = ndi.gaussian_filter(alpha, 0.6)
    alpha = np.where(mask | (alpha > 0.5), alpha, 0)
    a = alpha[..., None]
    fg = np.where(a > 0.02, (rgb - (1 - a) * bg) / np.maximum(a, 0.02), rgb)
    return np.clip(fg, 0, 1), alpha, bg


