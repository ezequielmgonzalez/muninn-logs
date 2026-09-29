import type { LeaderStats } from "./queries";

export const LEADER_METRICS = ["winRate", "avgPlace", "avgPoints", "avgResearch"] as const;
export type LeaderMetric = (typeof LEADER_METRICS)[number];

export function metricValue(leader: LeaderStats, metric: LeaderMetric): number {
  switch (metric) {
    case "winRate":
      return leader.wins / leader.games;
    case "avgPlace":
      return leader.avg_place;
    case "avgPoints":
      return leader.avg_points;
    case "avgResearch":
      return leader.avg_research ?? 0;
  }
}

/**
 * Bar length from 0 to 1. A lower place is better, so it's inverted
 * (1st = full bar, 4th = a quarter), never drawn raw.
 */
export function barLength(value: number, metric: LeaderMetric, max: number): number {
  if (metric === "avgPlace") return (5 - value) / 4;
  return max > 0 ? value / max : 0;
}

/** Leaders best-first for a metric, each with its bar length. */
export function rankLeaders(leaders: LeaderStats[], metric: LeaderMetric) {
  const max = Math.max(...leaders.map((l) => metricValue(l, metric)), 0);
  return leaders
    .map((leader) => {
      const value = metricValue(leader, metric);
      return { leader, value, bar: barLength(value, metric, max) };
    })
    .sort((a, b) => b.bar - a.bar);
}
