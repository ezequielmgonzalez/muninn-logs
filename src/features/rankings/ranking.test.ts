import { describe, expect, it } from "vitest";

import { rankRows, type RankingRow } from "./ranking";

const row = (name: string, games: number, wins: number, avg_points = 50, avg_place = 2, max_total = 60, min_total = 40): RankingRow => ({
  player_id: name,
  kind: "friend",
  name,
  owner_name: null,
  games,
  wins,
  avg_points,
  avg_place,
  max_total,
  min_total,
});

describe("rankRows", () => {
  const rows = [row("Manuela", 4, 1, 60, 2.25), row("Jessi", 3, 2, 55, 1.5), row("Iñaki", 2, 1, 70, 1.5), row("Roberto", 1, 0, 40, 3)];

  it("sorts by win rate, highest first, with more games breaking ties", () => {
    // Jessi 67 %, Iñaki 50 %, Manuela 25 %, Roberto 0 %.
    expect(rankRows(rows, "winRate", "es").map((r) => [r.position, r.row.name])).toEqual([
      [1, "Jessi"],
      [2, "Iñaki"],
      [3, "Manuela"],
      [4, "Roberto"],
    ]);
    const tied = [row("Beto", 2, 1), row("Ana", 4, 2), row("Carla", 2, 1)];
    expect(rankRows(tied, "winRate", "es").map((r) => r.row.name)).toEqual(["Ana", "Beto", "Carla"]);
  });

  it("puts the lowest average place first, its bar full and the others shorter", () => {
    const ranked = rankRows(rows, "avgPlace", "es");
    expect(ranked.map((r) => r.row.name)).toEqual(["Jessi", "Iñaki", "Manuela", "Roberto"]);
    expect(ranked[0].bar).toBe(1);
    expect(ranked[3].bar).toBeCloseTo(0.5);
  });

  it("sizes bars against the best value, zero getting none (a hairline)", () => {
    const ranked = rankRows(rows, "winRate", "es");
    expect(ranked[0].bar).toBe(1);
    expect(ranked[1].bar).toBeCloseTo(0.5 / (2 / 3));
    expect(ranked[3].bar).toBe(0);
  });

  it("sorts by highest and lowest points, highest first (the best worst game for the lowest)", () => {
    const totals = [row("Ana", 2, 1, 50, 2, 80, 20), row("Beto", 2, 1, 50, 2, 70, 45)];
    expect(rankRows(totals, "maxPoints", "es").map((r) => [r.row.name, r.value])).toEqual([["Ana", 80], ["Beto", 70]]);
    expect(rankRows(totals, "minPoints", "es").map((r) => [r.row.name, r.value])).toEqual([["Beto", 45], ["Ana", 20]]);
  });

  it("sorts by points and by games, highest first", () => {
    expect(rankRows(rows, "avgPoints", "es")[0].row.name).toBe("Iñaki");
    expect(rankRows(rows, "games", "es").map((r) => r.row.name)).toEqual(["Manuela", "Jessi", "Iñaki", "Roberto"]);
  });
});
