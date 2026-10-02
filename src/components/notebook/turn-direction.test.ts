import { describe, expect, it } from "vitest";

import { sectionTurn } from "./turn-direction";

describe("sectionTurn", () => {
  it("turns forward to a later section and backward to an earlier one", () => {
    expect(sectionTurn("home", "stats")).toBe("forward");
    expect(sectionTurn("friends", "matches")).toBe("backward");
  });

  it("doesn't turn to the section you're on", () => {
    expect(sectionTurn("stats", "stats")).toBeUndefined();
  });

  it("turns forward from a screen outside the sections", () => {
    expect(sectionTurn(undefined, "home")).toBe("forward");
  });
});
