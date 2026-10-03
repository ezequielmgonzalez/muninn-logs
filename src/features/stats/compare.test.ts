import { describe, expect, it } from "vitest";

import { compareStats } from "./compare";
import type { PlayerStats } from "./queries";

function stats(overrides: Partial<PlayerStats>, categories: Record<string, number | null> = {}): PlayerStats {
  const slugs = ["research", "temple", "idols", "guardians", "cards", "fear"] as const;
  return {
    games: 4,
    wins: 2,
    avg_points: 50,
    avg_place: 2,
    leaders: [],
    categories: slugs.map((slug) => ({ slug, average: slug in categories ? categories[slug] : 5 })),
    ...overrides,
  };
}

const row = (rows: ReturnType<typeof compareStats>, key: string) => rows.find((r) => r.key === key)!;

describe("compareStats", () => {
  it("marks the higher win rate and average points", () => {
    const rows = compareStats([stats({ wins: 3 }), stats({ wins: 1, avg_points: 60 })]);
    expect(row(rows, "winRate")).toMatchObject({ values: [0.75, 0.25], best: [true, false] });
    expect(row(rows, "avgPoints").best).toEqual([false, true]);
  });

  it("marks the lower average place", () => {
    const rows = compareStats([stats({ avg_place: 2.5 }), stats({ avg_place: 1.5 }), stats({ avg_place: 3 })]);
    expect(row(rows, "avgPlace").best).toEqual([false, true, false]);
  });

  it("marks the less negative fear average", () => {
    const rows = compareStats([stats({}, { fear: -1 }), stats({}, { fear: -3 })]);
    expect(row(rows, "fear").best).toEqual([true, false]);
  });

  it("marks everyone tied for the best, but nobody when all tie", () => {
    const rows = compareStats([stats({ avg_points: 60 }), stats({ avg_points: 60 }), stats({ avg_points: 40 })]);
    expect(row(rows, "avgPoints").best).toEqual([true, true, false]);
    expect(row(compareStats([stats({}), stats({}), stats({})]), "avgPoints").best).toEqual([false, false, false]);
  });

  it("never judges games played", () => {
    expect(row(compareStats([stats({ games: 10 }), stats({ games: 2 })]), "games").best).toEqual([false, false]);
  });

  it("ignores players without games, and judges nothing with fewer than two values", () => {
    const empty = stats({ games: 0, wins: 0, avg_points: null, avg_place: null });
    const rows = compareStats([stats({ avg_place: 2 }), empty, stats({ avg_place: 1 })]);
    expect(row(rows, "avgPlace").best).toEqual([false, false, true]);
    expect(row(compareStats([stats({}), empty]), "avgPlace").best).toEqual([false, false]);
  });
});
