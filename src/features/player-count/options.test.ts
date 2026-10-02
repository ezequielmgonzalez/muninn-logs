import { describe, expect, it } from "vitest";

import { parsePlayerCount } from "./options";

describe("parsePlayerCount", () => {
  it("reads 2, 3 or 4 players", () => {
    expect(parsePlayerCount("2")).toBe(2);
    expect(parsePlayerCount("4")).toBe(4);
  });

  it("means every game for anything else", () => {
    for (const value of [undefined, null, "", "all", "1", "5", "3.5", "x"]) expect(parsePlayerCount(value)).toBeNull();
  });
});
