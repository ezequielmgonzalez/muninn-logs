import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaintedBand, BrushBar } from "./painted-band";

function stroke(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-paint-layer="stroke"]');
}

describe("PaintedBand", () => {
  it("renders its title as the requested element", () => {
    render(<PaintedBand as="h1">Por categoría</PaintedBand>);
    expect(screen.getByRole("heading", { level: 1, name: "Por categoría" })).toBeInTheDocument();
  });

  it("paints one decorative ink stroke, shaped only by its mask", () => {
    const { container } = render(<PaintedBand>Win Rate</PaintedBand>);
    const layer = stroke(container)!;
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveClass("ink", "ink--band1", "bg-ink");
    // Never border-radius, box-shadow or filter on the ink layer.
    expect(layer.className).not.toMatch(/rounded|shadow|filter|blur/);
  });

  it("paints its stroke in when the screen appears", () => {
    const { container } = render(<PaintedBand>Win Rate</PaintedBand>);
    expect(stroke(container)).toHaveClass("paint-in");
  });

  it("uses the second stroke, mirrored, when asked", () => {
    const { container } = render(
      <PaintedBand variant={2} flip>
        Líderes
      </PaintedBand>,
    );
    expect(stroke(container)).toHaveClass("ink--band2", "-scale-x-100");
    // The text itself is never mirrored.
    expect(screen.getByRole("heading").className).not.toMatch(/scale/);
  });

});

describe("BrushBar", () => {
  function barWidth(container: HTMLElement) {
    return container.querySelector<HTMLElement>("[data-brush-bar] > div")!.style.width;
  }

  it("is as wide as its value, in the given categorical color", () => {
    const { container } = render(<BrushBar value={0.68} tone="chart-6" />);
    expect(barWidth(container)).toBe("68%");
    expect(stroke(container)!.style.background).toBe("var(--chart-6)");
  });

  it("cuts its stroke to its width instead of squeezing it (a short bar keeps its brush ends)", () => {
    const { container } = render(<BrushBar value={0.02} tone="chart-1" />);
    // The stroke's two copies are sized against the bar (globals.css): the bar is a container, never under a dab's width.
    expect(stroke(container)).toHaveAttribute("data-bar-stroke");
    expect(container.querySelector("[data-brush-bar] > div")).toHaveClass("@container/bar", "min-w-1.5");
  });

  it("alternates the four bar strokes by its position", () => {
    const masks = [0, 1, 2, 3, 4].map((index) => {
      const { container } = render(<BrushBar value={0.5} tone="chart-1" index={index} />);
      return [...stroke(container)!.classList].find((c) => c.startsWith("ink--"));
    });
    expect(masks).toEqual(["ink--bar1", "ink--bar2", "ink--bar3", "ink--bar4", "ink--bar1"]);
  });

  it("paints bars in one after another, top to bottom", () => {
    const delays = [0, 1, 2].map((index) => {
      const { container } = render(<BrushBar value={0.5} tone="chart-1" index={index} />);
      expect(stroke(container)).toHaveClass("paint-in");
      return stroke(container)!.style.getPropertyValue("--paint-delay");
    });
    expect(delays).toEqual(["100ms", "160ms", "220ms"]);
    // `order` overrides the position when the mask index means something else.
    const { container } = render(<BrushBar value={0.5} tone="chart-1" index={3} order={1.5} />);
    expect(stroke(container)!.style.getPropertyValue("--paint-delay")).toBe("190ms");
  });

  it("comes thin, in a player's color, for grouped bars", () => {
    const { container } = render(<BrushBar value={0.5} tone="player-2" size="thin" />);
    expect(container.querySelector("[data-brush-bar]")).toHaveClass("h-[9px]");
    expect(stroke(container)!.style.background).toBe("var(--player-2)");
    expect(stroke(container)).toHaveClass("-inset-y-[3px]");
  });

  it("clamps values above 1", () => {
    const { container } = render(<BrushBar value={1.5} tone="chart-1" />);
    expect(barWidth(container)).toBe("100%");
  });

  it.each([0, -0.2])("draws a hairline instead of a stroke for %d", (value) => {
    const { container } = render(<BrushBar value={value} tone="chart-1" />);
    expect(stroke(container)).toBeNull();
    expect(container.querySelector('[data-paint-layer="hairline"]')).not.toBeNull();
  });

  it("is hidden from assistive tech (its value is shown as text next to it)", () => {
    const { container } = render(<BrushBar value={0.5} tone="chart-2" />);
    expect(container.querySelector("[data-brush-bar]")).toHaveAttribute("aria-hidden", "true");
  });
});
