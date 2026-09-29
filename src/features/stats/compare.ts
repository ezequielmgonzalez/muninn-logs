import { ARNAK_SCORE_CATEGORIES, type ArnakScoreCategory } from "@/games/arnak";

import type { PlayerStats } from "./queries";

export type ComparisonKey = "games" | "winRate" | "avgPlace" | "avgPoints" | ArnakScoreCategory;

export type ComparisonRow = {
  key: ComparisonKey;
  /** One value per player, in the order they were given. */
  values: (number | null)[];
  /** Which players have the best value. All false when it can't or shouldn't be judged. */
  best: boolean[];
};

function winRate(stats: PlayerStats) {
  return stats.games > 0 ? stats.wins / stats.games : null;
}

/**
 * Marks everyone with the best value. Nobody is marked when fewer than two
 * players have a value, or when everyone ties (nobody does better).
 */
function markBest(values: (number | null)[], lowerIsBetter = false): boolean[] {
  const present = values.filter((v): v is number => v !== null);
  const none = values.map(() => false);
  if (present.length < 2) return none;
  const best = lowerIsBetter ? Math.min(...present) : Math.max(...present);
  const marked = values.map((v) => v === best);
  return present.every((v) => v === best) ? none : marked;
}

/**
 * Several players' stats, stat by stat. Higher is better, except average
 * place. Fear is stored negative, so a higher (less negative) fear average is
 * better too. Games played is context, not a contest.
 */
export function compareStats(players: PlayerStats[]): ComparisonRow[] {
  const row = (key: ComparisonKey, values: (number | null)[], lowerIsBetter = false): ComparisonRow => ({
    key,
    values,
    best: markBest(values, lowerIsBetter),
  });
  const category = (stats: PlayerStats, slug: ArnakScoreCategory) =>
    stats.categories.find((c) => c.slug === slug)?.average ?? null;

  return [
    { key: "games", values: players.map((p) => p.games), best: players.map(() => false) },
    row("winRate", players.map(winRate)),
    row("avgPlace", players.map((p) => p.avg_place), true),
    row("avgPoints", players.map((p) => p.avg_points)),
    ...ARNAK_SCORE_CATEGORIES.map((slug) => row(slug, players.map((p) => category(p, slug)))),
  ];
}
