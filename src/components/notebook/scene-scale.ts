// The desktop notebook is a 1280×1000 scene, scaled to fill the window: down
// on small screens, up to 2× on big ones (the paper textures are drawn at 2×).
//
// The scale is a ratio of lengths, which CSS can only get through
// tan(atan2(100vw, 1280px)), and Safari 26 gets that wrong (it mixes up
// degrees and radians: a 1324×871 window came out at −2.27, so the notebook
// was tiny, huge or flipped). So a script in <head> sets --scene-scale on
// <html> before the first paint, and again on every resize. Without it the
// scene stays at 1:1.

export const SCENE = { width: 1280, height: 1000, maxScale: 2 } as const;

export const sceneScaleScript = `(() => {
  const root = document.documentElement;
  const fit = () => root.style.setProperty("--scene-scale", String(Math.min(${SCENE.maxScale}, innerWidth / ${SCENE.width}, innerHeight / ${SCENE.height})));
  fit();
  addEventListener("resize", fit);
})();`;
