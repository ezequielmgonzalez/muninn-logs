import { describe, expect, it } from "vitest";

import { barLength, rankLeaders } from "./leader-metrics";
import type { LeaderStats } from "./queries";

function leader(slug: LeaderStats["slug"], stats: Partial<LeaderStats>): LeaderStats {
  return { slug, games: 4, wins: 1, avg_place: 2, avg_points: 50, avg_research: 8, ...stats };
}

describe("barLength", () => {
  it("inverts average place: 1st is a full bar, 4th a quarter", () => {
    expect(barLength(1, "avgPlace", 4)).toBe(1);
    expect(barLength(4, "avgPlace", 4)).toBe(0.25);
  });

  it("scales other metrics against the best value", () => {
    expect(barLength(30, "avgPoints", 60)).toBe(0.5);
  });

  it("is empty when nothing has a value yet", () => {
    expect(barLength(0, "avgResearch", 0)).toBe(0);
  });
});

describe("rankLeaders", () => {
  const leaders = [
    leader("captain", { wins: 1, games: 4, avg_place: 2.5, avg_points: 60 }),
    leader("mystic", { wins: 3, games: 4, avg_place: 1.5, avg_points: 50 }),
    leader("falconer", { wins: 2, games: 4, avg_place: 1.2, avg_points: 40 }),
  ];

  it("puts the highest win rate first", () => {
    expect(rankLeaders(leaders, "winRate").map((r) => r.leader.slug)).toEqual(["mystic", "falconer", "captain"]);
  });

  it("puts the lowest average place first", () => {
    expect(rankLeaders(leaders, "avgPlace").map((r) => r.leader.slug)).toEqual(["falconer", "mystic", "captain"]);
  });

  it("gives the best leader a full bar", () => {
    expect(rankLeaders(leaders, "avgPoints")[0]).toMatchObject({ value: 60, bar: 1 });
  });
});
