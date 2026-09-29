import { describe, expect, it } from "vitest";

import { tiedForFirst, total } from "./scoring";

describe("total", () => {
  it("adds every category and subtracts fear cards", () => {
    expect(total({ research: 10, temple: 6, idols: 9, guardians: 5, cards: 14, fear: 2 })).toBe(42);
  });
});

describe("tiedForFirst", () => {
  it("is empty when one player leads", () => {
    expect(tiedForFirst([42, 30, 41])).toEqual([]);
  });

  it("lists everyone tied for first", () => {
    expect(tiedForFirst([42, 30, 42, 42])).toEqual([0, 2, 3]);
  });

  it("ignores ties below first place", () => {
    expect(tiedForFirst([50, 30, 30])).toEqual([]);
  });

  it("is empty with fewer than two players", () => {
    expect(tiedForFirst([10])).toEqual([]);
  });
});
