import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sceneScale, sceneScaleScript } from "./scene-scale";
import { SceneScale } from "./scene-scale-sync";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/" }));

const scaleVar = () => Number(document.documentElement.style.getPropertyValue("--scene-scale"));
const resizeTo = (width: number, height: number) => Object.assign(window, { innerWidth: width, innerHeight: height });

afterEach(() => document.documentElement.style.removeProperty("--scene-scale"));

describe("sceneScale", () => {
  it("fits the 1280×1000 scene in a smaller window, by its tighter side", () => {
    expect(sceneScale(1324, 871)).toBeCloseTo(0.871);
    expect(sceneScale(1200, 1000)).toBeCloseTo(0.9375);
  });

  it("grows the scene on a big screen, up to 2×", () => {
    expect(sceneScale(2560, 1300)).toBeCloseTo(1.3);
    expect(sceneScale(5000, 3000)).toBe(2);
  });
});

describe("sceneScaleScript", () => {
  it("sets the same scale before the first paint", () => {
    resizeTo(1324, 871);
    new Function(sceneScaleScript)();
    expect(scaleVar()).toBeCloseTo(sceneScale(1324, 871));
  });
});

describe("SceneScale", () => {
  const renderIt = () =>
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <SceneScale />
      </NextIntlClientProvider>,
    );

  it("puts the scale back when <html> lost it (e.g. switching language)", () => {
    resizeTo(2560, 1300);
    renderIt();
    expect(scaleVar()).toBeCloseTo(1.3);
  });

  it("follows the window when it's resized", () => {
    resizeTo(1324, 871);
    renderIt();
    resizeTo(2560, 1300);
    window.dispatchEvent(new Event("resize"));
    expect(scaleVar()).toBeCloseTo(1.3);
  });
});
