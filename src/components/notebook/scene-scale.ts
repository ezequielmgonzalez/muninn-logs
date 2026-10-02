// The desktop notebook is a 1280×1000 scene, scaled to fill the window: down
// on small screens, up to 2× on big ones (the paper textures are drawn at 2×).
//
// The scale is a ratio of lengths, which CSS can only get through
// tan(atan2(100vw, 1280px)), and Safari 26 gets that wrong (it mixes up
// degrees and radians: a 1324×871 window came out at −2.27, so the notebook
// was tiny, huge or flipped). So --scene-scale is set on <html> from script:
// once in <head>, before the first paint (sceneScaleScript), then by
// SceneScale (scene-scale-sync.tsx) on resize and whenever the root layout
// renders <html> again, e.g. switching language, which drops the style.
// Without JS the scene stays at 1:1.

export const SCENE = { width: 1280, height: 1000, maxScale: 2 } as const;

/** The scene's scale in a window of this size: the tighter side, up to 2×. */
export function sceneScale(width: number, height: number) {
  return Math.min(SCENE.maxScale, width / SCENE.width, height / SCENE.height);
}

export const sceneScaleScript = `document.documentElement.style.setProperty("--scene-scale", String(Math.min(${SCENE.maxScale}, innerWidth / ${SCENE.width}, innerHeight / ${SCENE.height})));`;
