import numpy as np
from scipy.ndimage import gaussian_filter, gaussian_filter1d
from PIL import Image

def norm01(a):
    # rank-normalize to uniform [0,1]
    flat = a.ravel()
    r = flat.argsort().argsort().astype(np.float32) / (flat.size - 1)
    return r.reshape(a.shape)

def streak(rng, H, W, sy, sx):
    n = rng.standard_normal((H, W)).astype(np.float32)
    return norm01(gaussian_filter(n, (sy, sx), mode='wrap'))

def noise1d(rng, n, sigma):
    a = gaussian_filter1d(rng.standard_normal(n), sigma, mode='wrap')
    return a / (np.abs(a).max() + 1e-6)

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def stroke(W, H, seed, thick=0.34, start=(0.03, 0.035), end=(0.82, 0.97),
           start_jit=0.012, end_jit=0.05, wash=0.2, splat=40, tone=0.2):
    """start=(x where ink begins, ramp length); end=(x dry-brush begins, x where ink is gone)"""
    rng = np.random.default_rng(seed)
    X = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    Yp = np.arange(H, dtype=np.float32)[:, None]

    # wobbling centre line and thickness along the stroke
    cy = H / 2 + noise1d(rng, W, W * 0.12)[None, :] * H * 0.035
    ht = H * thick * (1 + 0.06 * noise1d(rng, W, W * 0.05)[None, :] + 0.035 * noise1d(rng, W, W * 0.012)[None, :])
    # stroke thins a little where the brush runs dry
    ht = ht * (1 - 0.18 * smoothstep(end[0], end[1], X))
    v = (Yp - cy) / ht  # -1..1 inside

    # per-bristle (per-row) properties
    load = norm01(gaussian_filter1d(rng.standard_normal(H), 1.2))[:, None]          # ink load per bristle
    js = (noise1d(rng, H, 2.5) * 0.7 + noise1d(rng, H, 0.6) * 0.3)[:, None]          # start jitter
    je = (noise1d(rng, H, 3.0) * 0.6 + noise1d(rng, H, 0.7) * 0.4)[:, None]          # end jitter

    s0 = start[0] + js * start_jit
    along_start = smoothstep(s0, s0 + start[1], X)
    e0 = end[0] + je * end_jit * 0.5
    e1 = end[1] + je * end_jit + (load - 0.5) * (end[1] - end[0]) * 0.5
    along_end = 1 - smoothstep(e0, e1, X) ** 0.8
    along = along_start * along_end

    across = 1 - smoothstep(0.72, 1.12, np.abs(v) + (load - 0.5) * 0.12)

    D = np.clip(along * across, 0, 1)

    # bristle streak noise: long in x, thin in y, two scales
    N = 0.6 * streak(rng, H, W, 0.7, W * 0.025) + 0.4 * streak(rng, H, W, 0.6, W * 0.006)
    N = norm01(N)
    main = np.clip((N - 1.15 * (1 - D) + 0.15) * 7, 0, 1)

    # tonal variation inside the body: lighter streaks where the pigment is thinner
    T = 0.5 * streak(rng, H, W, 1.2, W * 0.04) + 0.5 * streak(rng, H, W, 6, W * 0.08)
    main = main * (1 - tone + tone * T ** 0.6)

    # soft wash / bleed of pigment around the stroke
    vw = (Yp - cy) / (ht * 1.3)
    across_w = 1 - smoothstep(0.55, 1.05, np.abs(vw))
    along_w = smoothstep(start[0] - 0.02, start[0] + 0.02, X) * (1 - smoothstep(end[0], min(end[1] + 0.03, 1.0), X))
    Wn = streak(rng, H, W, 3, W * 0.03)
    washa = gaussian_filter(across_w * along_w * (0.55 + 0.45 * Wn), 4) * wash

    a = 1 - (1 - main) * (1 - washa)

    # splatter around the dry end and the start
    yy, xx = np.mgrid[0:H, 0:W]
    for _ in range(splat):
        if rng.random() < 0.7 or start[0] < 0:
            px = rng.uniform(end[0], min(end[1] + 0.02, 0.995)) * W
        else:
            px = rng.uniform(max(start[0] - 0.015, 0.003), start[0] + 0.03) * W
        py = cy[0, int(min(px, W - 1))] + rng.normal(0, H * thick * 0.9)
        r = rng.uniform(0.5, 1.6) * H / 120
        if r < 0.5: r = 0.6
        d = np.hypot((xx - px), (yy - py))
        dot = np.clip((r - d) / 0.8 + 0.5, 0, 1) * rng.uniform(0.5, 0.95)
        a = np.maximum(a, dot)

    # guarantee no hard edge at the image border
    ey = smoothstep(0, 6, np.minimum(Yp, H - 1 - Yp))
    xp = np.arange(W, dtype=np.float32)[None, :]
    ex = smoothstep(0, 6, np.minimum(xp, W - 1 - xp)) if start[0] >= 0 else smoothstep(0, 6, W - 1 - xp)
    return np.clip(a * ey * ex, 0, 1)

def save_mask(a, path):
    H, W = a.shape
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(path, optimize=True)

def preview(a, ink, paper=(234, 224, 200)):
    H, W = a.shape
    bg = np.ones((H, W, 3), np.float32) * np.array(paper, np.float32)
    col = np.array(ink, np.float32)
    out = bg * (1 - a[..., None]) + col * a[..., None]
    return Image.fromarray(out.astype(np.uint8))

if __name__ == '__main__':
    out = []
    ink = (33, 29, 25)
    # Masthead: very wide, both ends ragged
    m = stroke(2600, 160, seed=11, thick=0.32, start=(0.015, 0.02), end=(0.9, 0.99),
               start_jit=0.012, end_jit=0.035, wash=0.22, splat=8, tone=0.24)
    save_mask(m, 'brush-band-wide.png'); preview(m, ink).save('prev-band-wide.png')
    # Section title: column-width band
    for i, sd in enumerate([41, 77]):
        t = stroke(1300, 200, seed=sd, thick=0.32, start=(0.025, 0.03), end=(0.84, 0.985),
                   start_jit=0.025, end_jit=0.06, wash=0.22, splat=6, tone=0.24)
        save_mask(t, f'brush-band-{i+1}.png'); preview(t, ink).save(f'prev-band-{i+1}.png')
    # Sweep: solid start, long dry-brush tail (active item)
    sw = stroke(1600, 180, seed=5, thick=0.34, start=(-0.03, 0.01), end=(0.52, 0.97),
                start_jit=0.0, end_jit=0.09, wash=0.18, splat=10, tone=0.2)
    save_mask(sw, 'brush-sweep.png'); preview(sw, ink).save('prev-sweep.png')
    # Value bars: short honest tail
    cols = [(184,134,47),(62,94,140),(110,122,62),(62,122,114)]
    for i, sd in enumerate([23, 29, 31, 37]):
        b = stroke(1400, 70, seed=sd, thick=0.36, start=(0.004, 0.012), end=(0.92, 0.995),
                   start_jit=0.008, end_jit=0.02, wash=0.14, splat=0, tone=0.16)
        save_mask(b, f'brush-bar-{i+1}.png'); preview(b, cols[i]).save(f'prev-bar-{i+1}.png')
