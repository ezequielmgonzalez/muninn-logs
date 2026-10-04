import { describe, expect, it } from "vitest";

import { DEFAULT_GAME, gameParam, hasTableSizes, parseGame } from "./options";

describe("the notebook's game", () => {
  it("reads the short names the URL and the cookie use", () => {
    expect(parseGame("lotr")).toBe("lotr-duel");
    expect(parseGame("arnak")).toBe("arnak");
    expect(gameParam("lotr-duel")).toBe("lotr");
  });

  it("means Arnak when nothing, or something unknown, is chosen", () => {
    expect(DEFAULT_GAME).toBe("arnak");
    expect(parseGame(undefined)).toBe("arnak");
    expect(parseGame("lotr-duel")).toBe("arnak");
    expect(parseGame("catan")).toBe("arnak");
  });

  it("filters by table size only where there's more than one", () => {
    expect(hasTableSizes("arnak")).toBe(true);
    expect(hasTableSizes("lotr-duel")).toBe(false);
  });
});
