import numpy as np
from scipy.ndimage import gaussian_filter, gaussian_filter1d
from PIL import Image, ImageDraw

def n1(rng, n, sigma):
    a = gaussian_filter1d(rng.standard_normal(n), sigma, mode='reflect')
    return a / (np.abs(a).max() + 1e-6)

def nz(rng, H, W, s):
    a = gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), s)
    a -= a.mean(); a /= (np.abs(a).max() + 1e-6)
    return a

def edge_noise(rng, n, rough, nicks):
    e = rough * (2.2 * n1(rng, n, 70) + 1.2 * n1(rng, n, 10) + 0.7 * n1(rng, n, 2))
    xs = np.arange(n)
    for _ in range(nicks):
        c = rng.uniform(0.05, 0.95) * n; w = rng.uniform(6, 26); d = rng.uniform(5, 16)
        e = e + d * np.exp(-((xs - c) / w) ** 2) * (1 + 0.4 * n1(rng, n, 2))
    return e

def sheet(W, H, seed, base, inner=None, m=18, rough=2.0, nicks=5, stains=5, tint=(118, 104, 88)):
    rng = np.random.default_rng(seed)
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
    def side(name, n):
        if name == inner:
            return 0.6 * n1(rng, n, 40) + 0.4 * n1(rng, n, 3)
        return edge_noise(rng, n, rough, nicks)
    nL = side('left', H)[:, None]; nR = side('right', H)[:, None]
    nT = side('top', W)[None, :]; nB = side('bottom', W)[None, :]
    dL = X - (m + nL); dR = (W - 1 - m - nR) - X
    dT = Y - (m + nT); dB = (H - 1 - m - nB) - Y
    d = np.minimum(np.minimum(dL, dR), np.minimum(dT, dB))
    # outer (non-binding) distance for aging
    outer = [v for k, v in (('left', dL), ('right', dR), ('top', dT), ('bottom', dB)) if k != inner]
    do = outer[0]
    for v in outer[1:]: do = np.minimum(do, v)
    fib = np.clip(nz(rng, H, W, 0.8) * 0.5 + 0.5, 0, 1)
    alpha = np.clip(d + 0.5, 0, 1)
    fringe = np.clip((d + 3.5) / 3.5, 0, 1) * (fib > 0.55) * 0.55
    alpha = np.maximum(alpha, fringe)

    base = np.array(base, np.float32)
    col = np.ones((H, W, 3), np.float32) * base
    # broad tone variation + mottling
    tone = 1 + 0.04 * nz(rng, H, W, 220) + 0.035 * nz(rng, H, W, 60) + 0.018 * nz(rng, H, W, 14)
    col *= tone[..., None]
    # stains
    for _ in range(stains):
        cx, cy = rng.uniform(0, W), rng.uniform(0, H); r = rng.uniform(60, 260)
        blob = np.exp(-(((X - cx) ** 2 + (Y - cy) ** 2) / (r * r)) ** 1.5)
        blob *= np.clip(0.6 + 0.8 * nz(rng, H, W, 18), 0, 1.2)
        k = rng.uniform(0.06, 0.12)
        col = col * (1 - k * blob[..., None]) + np.array(tint, np.float32) * (k * 0.5 * blob[..., None])
    # fine grain
    col *= (1 + 0.022 * nz(rng, H, W, 0.7))[..., None]
    # fibres
    fl = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(fl)
    for _ in range(int(W * H / 2600)):
        x0, y0 = rng.uniform(0, W), rng.uniform(0, H); ang = rng.uniform(0, np.pi); L = rng.uniform(6, 26)
        pts = [(x0, y0)]
        for i in range(4):
            ang += rng.normal(0, 0.35); x0 += np.cos(ang) * L / 4; y0 += np.sin(ang) * L / 4; pts.append((x0, y0))
        dr.line(pts, fill=int(rng.uniform(25, 60)), width=1)
    fl = gaussian_filter(np.asarray(fl, np.float32) / 255, 0.5)
    col *= (1 - 0.18 * fl)[..., None]
    # aged / smudged edges (outer sides)
    smudge = np.clip(0.55 + 0.6 * nz(rng, H, W, 22) + 0.3 * nz(rng, H, W, 5), 0, 1.4)
    dd = np.maximum(do, 0)
    age = (0.30 * np.exp(-dd / 30) + 0.12 * np.exp(-dd / 140)) * smudge + 0.35 * np.exp(-dd / 3.5)
    col = col * (1 - age[..., None]) + np.array(tint, np.float32) * (age[..., None] * 0.45)
    # charcoal smudges / worn spots scattered over the sheet
    for _ in range(int(W * H / 160000)):
        cx, cy = rng.uniform(0, W), rng.uniform(0, H); rx, ry = rng.uniform(20, 90), rng.uniform(8, 40)
        blob = np.exp(-(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2))
        blob *= np.clip(0.5 + 0.9 * nz(rng, H, W, 6), 0, 1.3)
        col *= (1 - rng.uniform(0.04, 0.09) * blob)[..., None]
    # gutter shading on the binding side
    if inner:
        di = {'left': dL, 'right': dR, 'top': dT, 'bottom': dB}[inner]
        g = 0.20 * np.exp(-np.maximum(di, 0) / 22) + 0.07 * np.exp(-np.maximum(di, 0) / 120)
        col *= (1 - g)[..., None]
    rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

if __name__ == '__main__':
    S = 2
    pw, ph = 462 * S, 908 * S
    left = sheet(pw, ph, 3, (236, 230, 216), inner='right')
    right = sheet(pw, ph, 9, (236, 230, 216), inner='left')
    insert = sheet(300 * S, 790 * S, 21, (226, 219, 203), inner=None, rough=2.4, nicks=7, stains=4)
    for name, im in (('page-left', left), ('page-right', right), ('page-insert', insert)):
        im.save(f'{name}.webp', 'WEBP', quality=82, method=6)
    # preview composite on backdrop
    bg = Image.new('RGBA', (1280 * S // 2, 1000 * S // 2), (24, 30, 39, 255))
    def put(im, x, y):
        im2 = im.resize((im.width // 2, im.height // 2))
        bg.alpha_composite(im2, (x, y))
    put(insert.rotate(1.2, expand=True, resample=Image.BICUBIC), 28, 112)
    put(left, 290, 46); put(right, 776, 46)
    bg.convert('RGB').save('prev-book.png')
