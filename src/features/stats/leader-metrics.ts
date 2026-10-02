import { ARNAK_SCORE_CATEGORIES, type ArnakScoreCategory } from "@/games/arnak";

import type { LeaderStats } from "./queries";

// What leaders can be ranked by: the general numbers, and for the total and
// each category its average, highest and lowest points ("research.max").

export const POINT_MEASURES = ["total", ...ARNAK_SCORE_CATEGORIES] as const;
export type PointMeasure = (typeof POINT_MEASURES)[number];
export const POINT_STATS = ["average", "max", "min"] as const;
export type PointStat = (typeof POINT_STATS)[number];

export type LeaderMetric = "winRate" | "avgPlace" | "games" | `${PointMeasure}.${PointStat}`;

/** The dropdown's groups: the general numbers, then every measure's average, highest and lowest. */
export const METRIC_GROUPS: { group: "general" | PointMeasure; metrics: LeaderMetric[] }[] = [
  { group: "general", metrics: ["winRate", "avgPlace", "games"] },
  ...POINT_MEASURES.map((measure) => ({
    group: measure,
    metrics: POINT_STATS.map((stat): LeaderMetric => `${measure}.${stat}`),
  })),
];

export const LEADER_METRICS: LeaderMetric[] = METRIC_GROUPS.flatMap((g) => g.metrics);

export function isLeaderMetric(value: string): value is LeaderMetric {
  return (LEADER_METRICS as string[]).includes(value);
}

/** A metric's measure and stat, or null for the general ones. */
export function pointMetric(metric: LeaderMetric): { measure: PointMeasure; stat: PointStat } | null {
  if (!metric.includes(".")) return null;
  const [measure, stat] = metric.split(".") as [PointMeasure, PointStat];
  return { measure, stat };
}

/** A leader's total or category points: average, highest and lowest. */
export function pointsOf(leader: LeaderStats, measure: PointMeasure) {
  return measure === "total" ? leader.total : leader.categories.find((c) => c.slug === (measure as ArnakScoreCategory));
}

export function metricValue(leader: LeaderStats, metric: LeaderMetric): number {
  switch (metric) {
    case "winRate":
      return leader.wins / leader.games;
    case "avgPlace":
      return leader.avg_place;
    case "games":
      return leader.games;
  }
  const { measure, stat } = pointMetric(metric)!;
  return pointsOf(leader, measure)?.[stat] ?? 0;
}

/**
 * Bar lengths from 0 to 1, the best value full. A lower place is better, so
 * it's inverted (1st = full bar, 4th a quarter). Fear is points below zero,
 * fewer being better: the closest to zero is full, and the worst still shows
 * a stroke. Everything else scales against the highest value.
 */
export function barLengths(values: number[], metric: LeaderMetric): number[] {
  if (metric === "avgPlace") return values.map((v) => (5 - v) / 4);
  if (pointMetric(metric)?.measure === "fear") {
    const worst = Math.min(...values, 0);
    const best = Math.max(...values);
    if (worst === 0 || best === worst) return values.map(() => 1);
    const floor = worst * 1.25;
    return values.map((v) => (v - floor) / (best - floor));
  }
  const max = Math.max(...values, 0);
  return values.map((v) => (max > 0 ? Math.max(v, 0) / max : 0));
}

/** Leaders best-first for a metric (more games breaking ties), each with its bar length. */
export function rankLeaders(leaders: LeaderStats[], metric: LeaderMetric) {
  const values = leaders.map((leader) => metricValue(leader, metric));
  const bars = barLengths(values, metric);
  return leaders
    .map((leader, i) => ({ leader, value: values[i], bar: bars[i] }))
    .sort((a, b) => b.bar - a.bar || b.leader.games - a.leader.games);
}
