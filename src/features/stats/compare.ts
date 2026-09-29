import { ARNAK_SCORE_CATEGORIES, type ArnakScoreCategory } from "@/games/arnak";

import type { PlayerStats } from "./queries";

export type ComparisonKey = "games" | "winRate" | "avgPlace" | "avgPoints" | ArnakScoreCategory;

export type ComparisonRow = {
  key: ComparisonKey;
  mine: number | null;
  theirs: number | null;
  /** Who does better on this stat; null when it isn't a "better" stat or can't be compared. */
  better: "mine" | "theirs" | "tie" | null;
};

function winRate(stats: PlayerStats) {
  return stats.games > 0 ? stats.wins / stats.games : null;
}

function judge(mine: number | null, theirs: number | null, lowerIsBetter = false): ComparisonRow["better"] {
  if (mine === null || theirs === null) return null;
  if (mine === theirs) return "tie";
  return mine < theirs === lowerIsBetter ? "mine" : "theirs";
}

/**
 * Two players' stats, stat by stat. Higher is better, except average place.
 * Fear is stored negative, so a higher (less negative) fear average is better too.
 * Games played is context, not a contest.
 */
export function compareStats(mine: PlayerStats, theirs: PlayerStats): ComparisonRow[] {
  const category = (stats: PlayerStats, slug: ArnakScoreCategory) =>
    stats.categories.find((c) => c.slug === slug)?.average ?? null;

  return [
    { key: "games", mine: mine.games, theirs: theirs.games, better: null },
    { key: "winRate", mine: winRate(mine), theirs: winRate(theirs), better: judge(winRate(mine), winRate(theirs)) },
    { key: "avgPlace", mine: mine.avg_place, theirs: theirs.avg_place, better: judge(mine.avg_place, theirs.avg_place, true) },
    { key: "avgPoints", mine: mine.avg_points, theirs: theirs.avg_points, better: judge(mine.avg_points, theirs.avg_points) },
    ...ARNAK_SCORE_CATEGORIES.map((slug) => {
      const m = category(mine, slug);
      const o = category(theirs, slug);
      return { key: slug, mine: m, theirs: o, better: judge(m, o) };
    }),
  ];
}
