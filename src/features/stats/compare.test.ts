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
  it("favors the higher win rate and average points", () => {
    const rows = compareStats(stats({ wins: 3 }), stats({ wins: 1, avg_points: 60 }));
    expect(row(rows, "winRate")).toMatchObject({ mine: 0.75, theirs: 0.25, better: "mine" });
    expect(row(rows, "avgPoints").better).toBe("theirs");
  });

  it("favors the lower average place", () => {
    const rows = compareStats(stats({ avg_place: 1.5 }), stats({ avg_place: 2.5 }));
    expect(row(rows, "avgPlace").better).toBe("mine");
  });

  it("favors the less negative fear average", () => {
    const rows = compareStats(stats({}, { fear: -1 }), stats({}, { fear: -3 }));
    expect(row(rows, "fear").better).toBe("mine");
  });

  it("calls equal values a tie, and never judges games played", () => {
    const rows = compareStats(stats({ games: 10 }), stats({ games: 2 }));
    expect(row(rows, "avgPoints").better).toBe("tie");
    expect(row(rows, "games").better).toBeNull();
  });

  it("can't judge when one of them has no games", () => {
    const rows = compareStats(stats({}), stats({ games: 0, wins: 0, avg_points: null, avg_place: null }));
    expect(row(rows, "winRate")).toMatchObject({ theirs: null, better: null });
    expect(row(rows, "avgPlace").better).toBeNull();
  });
});
