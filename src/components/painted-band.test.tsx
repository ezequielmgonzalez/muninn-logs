import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaintedBand, PaintedBar } from "./painted-band";

function paintLayers(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-paint-layer]"));
}

describe("PaintedBand", () => {
  it("renders its title as the requested element", () => {
    render(<PaintedBand as="h1">Por categoría</PaintedBand>);
    expect(screen.getByRole("heading", { level: 1, name: "Por categoría" })).toBeInTheDocument();
  });

  it("paints two decorative layers of the same ink, with no rounded corners", () => {
    const { container } = render(<PaintedBand>Win Rate</PaintedBand>);
    const layers = paintLayers(container);

    expect(layers.map((l) => l.dataset.paintLayer)).toEqual(["bleed", "stroke"]);
    for (const layer of layers) {
      expect(layer).toHaveAttribute("aria-hidden", "true");
      expect(layer.style.background).toBe("var(--ink)");
      // The band's shape comes from the SVG filter, never from border-radius.
      expect(layer.className).not.toMatch(/rounded/);
    }
  });

  it("shows trailing text at the end of the band", () => {
    render(
      <PaintedBand size="page" trailing="28 expediciones registradas">
        Diario de Ezequiel
      </PaintedBand>,
    );
    expect(screen.getByText("28 expediciones registradas")).toBeInTheDocument();
  });
});

describe("PaintedBar", () => {
  function barWidth(container: HTMLElement) {
    return container.querySelector<HTMLElement>("[data-painted-bar] > div")!.style.width;
  }

  it("is as wide as its value, in the given categorical color", () => {
    const { container } = render(<PaintedBar value={0.68} tone="chart-6" />);
    expect(barWidth(container)).toBe("68%");
    for (const layer of paintLayers(container)) {
      expect(layer.style.background).toBe("var(--chart-6)");
    }
  });

  it.each([
    [1.5, "100%"],
    [-0.2, "0%"],
  ])("clamps %d to %s", (value, width) => {
    const { container } = render(<PaintedBar value={value} tone="chart-1" />);
    expect(barWidth(container)).toBe(width);
  });

  it("is hidden from assistive tech (its value is shown as text next to it)", () => {
    const { container } = render(<PaintedBar value={0.5} tone="chart-2" />);
    expect(container.querySelector("[data-painted-bar]")).toHaveAttribute("aria-hidden", "true");
  });
});
