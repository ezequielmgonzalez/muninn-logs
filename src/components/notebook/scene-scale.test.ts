import { afterEach, describe, expect, it } from "vitest";

import { sceneScaleScript } from "./scene-scale";

function runAt(width: number, height: number) {
  Object.assign(window, { innerWidth: width, innerHeight: height });
  new Function(sceneScaleScript)();
  return Number(document.documentElement.style.getPropertyValue("--scene-scale"));
}

describe("sceneScaleScript", () => {
  afterEach(() => document.documentElement.style.removeProperty("--scene-scale"));

  it("fits the 1280×1000 scene in a smaller window, by its tighter side", () => {
    expect(runAt(1324, 871)).toBeCloseTo(0.871);
    expect(runAt(1200, 1000)).toBeCloseTo(0.9375);
  });

  it("grows the scene on a big screen, up to 2×", () => {
    expect(runAt(2560, 1300)).toBeCloseTo(1.3);
    expect(runAt(5000, 3000)).toBe(2);
  });

  it("follows the window when it's resized", () => {
    runAt(1324, 871);
    Object.assign(window, { innerWidth: 2560, innerHeight: 1300 });
    window.dispatchEvent(new Event("resize"));
    expect(Number(document.documentElement.style.getPropertyValue("--scene-scale"))).toBeCloseTo(1.3);
  });
});
