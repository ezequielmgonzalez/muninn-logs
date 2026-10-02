import { describe, expect, it } from "vitest";

import { ARNAK_SCORE_CATEGORIES } from "@/games/arnak";

import { barLengths, LEADER_METRICS, METRIC_GROUPS, metricValue, rankLeaders } from "./leader-metrics";
import type { LeaderStats } from "./queries";

const flat = (n: number) => ({ average: n, min: n, max: n });

function leader(slug: LeaderStats["slug"], stats: Partial<LeaderStats> = {}): LeaderStats {
  return {
    slug,
    games: 4,
    wins: 1,
    avg_place: 2,
    total: flat(50),
    categories: ARNAK_SCORE_CATEGORIES.map((c) => ({ slug: c, ...flat(c === "fear" ? -2 : 8) })),
    ...stats,
  };
}

describe("the metrics", () => {
  it("offer the general numbers, then the total's and every category's average, highest and lowest", () => {
    expect(METRIC_GROUPS.map((g) => g.group)).toEqual(["general", "total", ...ARNAK_SCORE_CATEGORIES]);
    expect(LEADER_METRICS).toHaveLength(3 + 7 * 3);
    expect(METRIC_GROUPS[1].metrics).toEqual(["total.average", "total.max", "total.min"]);
  });

  it("read a leader's points by measure and stat", () => {
    const captain = leader("captain", {
      total: { average: 40, min: 30, max: 50 },
      categories: ARNAK_SCORE_CATEGORIES.map((c) => ({ slug: c, ...(c === "research" ? { average: 8, min: 6, max: 10 } : flat(0)) })),
    });
    expect(metricValue(captain, "total.max")).toBe(50);
    expect(metricValue(captain, "total.min")).toBe(30);
    expect(metricValue(captain, "research.average")).toBe(8);
    expect(metricValue(captain, "research.max")).toBe(10);
    expect(metricValue(captain, "games")).toBe(4);
  });
});

describe("barLengths", () => {
  it("inverts average place: 1st is a full bar, 4th a quarter", () => {
    expect(barLengths([1, 4], "avgPlace")).toEqual([1, 0.25]);
  });

  it("scales points against the best value", () => {
    expect(barLengths([30, 60], "total.average")).toEqual([0.5, 1]);
  });

  it("is empty when nothing has a value yet", () => {
    expect(barLengths([0, 0], "research.max")).toEqual([0, 0]);
  });

  it("gives fear's closest to zero the full bar, and the worst still a stroke", () => {
    const [few, many] = barLengths([-1, -3], "fear.average");
    expect(few).toBe(1);
    expect(many).toBeGreaterThan(0);
    expect(many).toBeLessThan(0.5);
    // No fear at all is the best there is.
    expect(barLengths([0, 0], "fear.min")).toEqual([1, 1]);
  });
});

describe("rankLeaders", () => {
  const leaders = [
    leader("captain", { wins: 1, avg_place: 2.5, total: { average: 60, min: 40, max: 70 } }),
    leader("mystic", { wins: 3, avg_place: 1.5, total: { average: 50, min: 45, max: 55 } }),
    leader(null, { wins: 2, avg_place: 1.2, games: 6, total: { average: 40, min: 20, max: 80 } }),
  ];

  it("puts the highest win rate first, games played without a leader ranked like any other", () => {
    expect(rankLeaders(leaders, "winRate").map((r) => r.leader.slug)).toEqual(["mystic", null, "captain"]);
  });

  it("puts the lowest average place first", () => {
    expect(rankLeaders(leaders, "avgPlace").map((r) => r.leader.slug)).toEqual([null, "mystic", "captain"]);
  });

  it("ranks by highest and lowest points: the best worst game first", () => {
    expect(rankLeaders(leaders, "total.max").map((r) => r.leader.slug)).toEqual([null, "captain", "mystic"]);
    expect(rankLeaders(leaders, "total.min").map((r) => r.leader.slug)).toEqual(["mystic", "captain", null]);
  });

  it("gives the best leader a full bar", () => {
    expect(rankLeaders(leaders, "total.average")[0]).toMatchObject({ value: 60, bar: 1 });
  });

  it("breaks ties by games played", () => {
    expect(rankLeaders(leaders, "research.average").map((r) => r.leader.slug)[0]).toBeNull();
  });
});
