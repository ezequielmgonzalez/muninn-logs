import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw
from paper import nz

S = 2
W, H = 1280 * S, 1000 * S
rng = np.random.default_rng(42)
Y, X = np.mgrid[0:H, 0:W].astype(np.float32)

# warm parchment, a few steps darker than the page paper so the notebook stands out
cx, cy = 0.58 * W, 0.46 * H
r = np.sqrt(((X - cx) / (0.62 * W)) ** 2 + ((Y - cy) / (0.62 * H)) ** 2)
c0 = np.array([206, 188, 148], np.float32)   # centre
c1 = np.array([176, 152, 108], np.float32)   # mid
c2 = np.array([104, 82, 54], np.float32)     # edges
t1 = np.clip(r / 0.75, 0, 1)[..., None]
t2 = np.clip((r - 0.75) / 0.6, 0, 1)[..., None] ** 1.3
col = (c0 * (1 - t1) + c1 * t1) * (1 - t2) + c2 * t2

# mottling + stains
col *= (1 + 0.05 * nz(rng, H, W, 260) + 0.035 * nz(rng, H, W, 70) + 0.02 * nz(rng, H, W, 16))[..., None]
for _ in range(9):
    sx, sy = rng.uniform(0, W), rng.uniform(0, H); rr = rng.uniform(120, 420)
    blob = np.exp(-(((X - sx) ** 2 + (Y - sy) ** 2) / (rr * rr)) ** 1.4) * np.clip(0.6 + 0.8 * nz(rng, H, W, 30), 0, 1.3)
    col *= (1 - rng.uniform(0.05, 0.11) * blob)[..., None]

# faint topographic contour lines — an expedition map under the notebook
h = 0.6 * nz(rng, H, W, 260) + 0.3 * nz(rng, H, W, 120) + 0.1 * nz(rng, H, W, 50)
gy, gx = np.gradient(h)
g = np.sqrt(gx * gx + gy * gy) + 1e-6
step = 0.045
f = h / step
dist = np.abs(f - np.round(f)) * step / g          # px distance to nearest level
idx = np.round(f).astype(int)
major = (idx % 5 == 0)
width = np.where(major, 1.5 * S, 0.8 * S)
line = np.exp(-(dist / width) ** 2)
strength = np.where(major, 0.2, 0.11) * np.clip(0.55 + 0.6 * nz(rng, H, W, 40), 0, 1)  # lines fade in and out like old ink
a = (line * strength)[..., None]
col = col * (1 - a) + np.array([92, 60, 34], np.float32) * (a * 0.55) + col * (a * 0.45) * 0.0

# fibres + fine grain
fl = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(fl)
for _ in range(int(W * H / 3000)):
    x0, y0 = rng.uniform(0, W), rng.uniform(0, H); ang = rng.uniform(0, np.pi); L = rng.uniform(8, 30)
    pts = [(x0, y0)]
    for i in range(4):
        ang += rng.normal(0, 0.35); x0 += np.cos(ang) * L / 4; y0 += np.sin(ang) * L / 4; pts.append((x0, y0))
    dr.line(pts, fill=int(rng.uniform(25, 60)), width=1)
col *= (1 - 0.16 * gaussian_filter(np.asarray(fl, np.float32) / 255, 0.5))[..., None]
col *= (1 + 0.03 * nz(rng, H, W, 0.7))[..., None]

# deep vignette, like the earlier design but stronger
v = np.clip((r - 0.55) / 0.8, 0, 1) ** 1.6
col *= (1 - 0.45 * v)[..., None]

img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB')
img.save('backdrop.webp', 'WEBP', quality=80, method=6)

# preview with the notebook roughly placed
p = img.resize((1280, 1000)).convert('RGBA')
from PIL import ImageFilter
cover = Image.new('RGBA', (1280, 1000), (0, 0, 0, 0)); d = ImageDraw.Draw(cover)
d.rounded_rectangle((270, 28, 1262, 972), 12, fill=(42, 35, 30, 255))
sh = Image.new('RGBA', (1280, 1000), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((270, 50, 1262, 994), 12, fill=(40, 24, 10, 140))
p.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28))); p.alpha_composite(cover)
for name, x, y in (('page-left', 290, 46), ('page-right', 776, 46)):
    im = Image.open(f'{name}.webp').convert('RGBA').resize((462, 908)); p.alpha_composite(im, (x, y))
ins = Image.open('page-insert.webp').convert('RGBA').resize((300, 790)).rotate(1.2, expand=True, resample=Image.BICUBIC)
p2 = Image.new('RGBA', p.size, (0, 0, 0, 0)); p2.alpha_composite(ins, (24, 100))
base = p.copy(); base.alpha_composite(p2)
# re-draw pages on top of the insert
for name, x, y in (('page-left', 290, 46),):
    im = Image.open(f'{name}.webp').convert('RGBA').resize((462, 908)); base.alpha_composite(im, (x, y))
base.convert('RGB').save('prev-backdrop.png')
