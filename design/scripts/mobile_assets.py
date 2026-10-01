import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from paper import sheet, nz
from gen import stroke, save_mask, preview, norm01, smoothstep

S = 2
# Mobile page: top-bound notebook, binding on top
pg = sheet(370 * S, 1440 * S, 15, (236, 230, 216), inner='top')
pg.save('page-mobile.webp', 'WEBP', quality=82, method=6)
# Bottom divider strip (tab bar), torn top edge
tb = sheet(406 * S, 96 * S, 31, (226, 219, 203), inner='bottom', rough=2.2, nicks=4, stains=2)
tb.save('tabbar.webp', 'WEBP', quality=82, method=6)

# Short brush for an active tab (compact aspect)
tab = stroke(420, 300, seed=13, thick=0.36, start=(0.05, 0.05), end=(0.74, 0.96),
             start_jit=0.05, end_jit=0.1, wash=0.18, splat=4, tone=0.2)
save_mask(tab, 'brush-tab.png'); preview(tab, (33, 29, 25), (226, 219, 203)).save('prev-tab.png')

# Ink blot for the main action button
rng = np.random.default_rng(7)
N = 320
Y, X = np.mgrid[0:N, 0:N].astype(np.float32)
cx = cy = N / 2
th = np.arctan2(Y - cy, X - cx); rho = np.hypot(X - cx, Y - cy) / N
ang = np.linspace(-np.pi, np.pi, 720)
jit = gaussian_filter(rng.standard_normal(720), 12, mode='wrap'); jit /= np.abs(jit).max()
jit2 = gaussian_filter(rng.standard_normal(720), 2, mode='wrap'); jit2 /= np.abs(jit2).max()
R = 0.40 + 0.018 * np.interp(th, ang, jit) + 0.008 * np.interp(th, ang, jit2)
D = 1 - smoothstep(R - 0.05, R + 0.03, rho)
Nn = norm01(0.6 * nz(rng, N, N, 1.2) + 0.4 * nz(rng, N, N, 3))
a = np.clip((Nn - 1.15 * (1 - D) + 0.15) * 7, 0, 1)
a *= (0.84 + 0.16 * norm01(nz(rng, N, N, 6)))
wash = gaussian_filter((rho < R + 0.05).astype(np.float32), 6) * 0.18
a = 1 - (1 - a) * (1 - wash)
save_mask(np.clip(a, 0, 1), 'ink-blot.png'); preview(a, (33, 29, 25), (226, 219, 203)).save('prev-blot.png')
