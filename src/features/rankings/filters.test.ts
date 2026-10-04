import { describe, expect, it } from "vitest";

import { DEFAULT_FILTERS, isDefaultFilters, parseRankingFilters, rankingSearchParams } from "./filters";

describe("the Consulta in the URL", () => {
  it("reads the leader, temple and who's in, in Spanish", () => {
    expect(parseRankingFilters({ lider: "profesor", templo: "serpiente", turno: "1", quienes: "amigos,otros" })).toEqual({
      leader: "professor",
      temple: "snake",
      seat: 1,
      groups: ["friends", "otherGuests"],
    });
  });

  it("means the defaults when they're missing or unknown: every leader, either side, everyone", () => {
    expect(parseRankingFilters({})).toEqual(DEFAULT_FILTERS);
    expect(parseRankingFilters({ lider: "halconero", templo: "cascada", turno: "5" })).toEqual(DEFAULT_FILTERS);
  });

  it("reads games with no leader or no temple recorded", () => {
    expect(parseRankingFilters({ lider: "sin-especificar", templo: "sin-especificar" })).toMatchObject({ leader: "none", temple: "none" });
    expect(rankingSearchParams({ ...DEFAULT_FILTERS, leader: "none", temple: "none", seat: 3 })).toEqual({
      lider: "sin-especificar",
      templo: "sin-especificar",
      turno: "3",
    });
  });

  it("can leave everyone else out, but never you", () => {
    expect(parseRankingFilters({ quienes: "" }).groups).toEqual([]);
  });

  it("writes only what isn't a default, in a stable order", () => {
    expect(rankingSearchParams(DEFAULT_FILTERS)).toEqual({});
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
    expect(rankingSearchParams({ leader: "falconer", temple: "bird", seat: null, groups: ["otherGuests", "friends"] })).toEqual({
      lider: "cetrera",
      templo: "pajaro",
      quienes: "amigos,otros",
    });
    expect(rankingSearchParams({ ...DEFAULT_FILTERS, groups: [] })).toEqual({ quienes: "" });
  });

  it("reads back what it writes", () => {
    const filters = { leader: "journalist", temple: "snake", seat: 4, groups: ["ownGuests"] } as const;
    expect(parseRankingFilters(rankingSearchParams(filters))).toEqual(filters);
  });
});
