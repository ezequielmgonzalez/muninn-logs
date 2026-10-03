import { describe, expect, it } from "vitest";

import { parsePlayerCounts, playerCountsKey, serializePlayerCounts, togglePlayerCount } from "./options";

describe("parsePlayerCounts (?jugadores= and the cookie)", () => {
  it("reads one or several table sizes, smallest first", () => {
    expect(parsePlayerCounts("3,4")).toEqual([3, 4]);
    expect(parsePlayerCounts("4,2")).toEqual([2, 4]);
    expect(parsePlayerCounts("2")).toEqual([2]);
    expect(parsePlayerCounts(" 3 , 3,4")).toEqual([3, 4]);
  });

  it("means every game when all three are picked", () => {
    expect(parsePlayerCounts("2,3,4")).toBeNull();
  });

  it("ignores what isn't a table size, and means every game when nothing is left", () => {
    expect(parsePlayerCounts("3,5,x")).toEqual([3]);
    for (const value of [undefined, null, "", "all", "1", "5", "3.5", ",,"]) expect(parsePlayerCounts(value)).toBeNull();
  });

  it("writes the same form back, or nothing when every game counts", () => {
    expect(serializePlayerCounts([3, 4])).toBe("3,4");
    expect(serializePlayerCounts(null)).toBeNull();
    expect(playerCountsKey(null)).toBe("all");
    expect(playerCountsKey([2])).toBe("2");
  });
});

describe("togglePlayerCount", () => {
  it("unticks a size from all three, and ticking it back means every game again", () => {
    expect(togglePlayerCount(null, 2)).toEqual([3, 4]);
    expect(togglePlayerCount([3, 4], 2)).toBeNull();
  });

  it("adds and removes sizes", () => {
    expect(togglePlayerCount([3], 2)).toEqual([2, 3]);
    expect(togglePlayerCount([2, 3], 3)).toEqual([2]);
  });

  it("refuses to leave none ticked", () => {
    expect(togglePlayerCount([4], 4)).toBeUndefined();
  });
});
