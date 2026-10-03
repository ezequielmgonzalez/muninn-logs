import { describe, expect, it } from "vitest";

import { DEFAULT_FILTERS, isDefaultFilters, parseRankingFilters, rankingSearchParams } from "./filters";

describe("the Consulta in the URL", () => {
  it("reads the leader, temple and who's in, in Spanish", () => {
    expect(parseRankingFilters({ lider: "profesor", templo: "serpiente", quienes: "amigos,otros" })).toEqual({
      leader: "professor",
      temple: "snake",
      groups: ["friends", "otherGuests"],
    });
  });

  it("means the defaults when they're missing or unknown: every leader, either side, everyone", () => {
    expect(parseRankingFilters({})).toEqual(DEFAULT_FILTERS);
    expect(parseRankingFilters({ lider: "halconero", templo: "cascada" })).toEqual(DEFAULT_FILTERS);
  });

  it("can leave everyone else out, but never you", () => {
    expect(parseRankingFilters({ quienes: "" }).groups).toEqual([]);
  });

  it("writes only what isn't a default, in a stable order", () => {
    expect(rankingSearchParams(DEFAULT_FILTERS)).toEqual({});
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
    expect(rankingSearchParams({ leader: "falconer", temple: "bird", groups: ["otherGuests", "friends"] })).toEqual({
      lider: "cetrera",
      templo: "pajaro",
      quienes: "amigos,otros",
    });
    expect(rankingSearchParams({ ...DEFAULT_FILTERS, groups: [] })).toEqual({ quienes: "" });
  });

  it("reads back what it writes", () => {
    const filters = { leader: "journalist", temple: "snake", groups: ["ownGuests"] } as const;
    expect(parseRankingFilters(rankingSearchParams(filters))).toEqual(filters);
  });
});
