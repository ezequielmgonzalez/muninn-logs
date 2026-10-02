import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PenCircle } from "./pen-circle";

describe("PenCircle", () => {
  it("is a pen loop, drawn in by its wrapper's sweep, and decoration only", () => {
    const { container } = render(<PenCircle className="-inset-x-3.5" />);
    const sweep = container.firstElementChild!;
    expect(sweep).toHaveAttribute("aria-hidden", "true");
    expect(sweep).toHaveClass("pen-draw", "absolute", "-inset-x-3.5");
    // The loop's mask and the sweep's are on different elements: one element with both shows a box in Chrome.
    expect(sweep.firstElementChild).toHaveClass("ink", "ink--pen-circle", "bg-ink");
    expect(sweep.firstElementChild).not.toHaveClass("pen-draw");
  });
});
