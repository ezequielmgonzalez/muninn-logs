import { ARNAK_SCORE_CATEGORIES, type ArnakScoreCategory } from "@/games/arnak";

import type { ComparableStats } from "./queries";

export type ComparisonKey = "games" | "winRate" | "avgPlace" | "avgPoints" | ArnakScoreCategory;

export type ComparisonRow = {
  key: ComparisonKey;
  /** One value per player, in the order they were given. */
  values: (number | null)[];
  /** Which players have the best value. All false when it can't or shouldn't be judged. */
  best: boolean[];
};

function winRate(stats: ComparableStats) {
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
export function compareStats(players: ComparableStats[]): ComparisonRow[] {
  const row = (key: ComparisonKey, values: (number | null)[], lowerIsBetter = false): ComparisonRow => ({
    key,
    values,
    best: markBest(values, lowerIsBetter),
  });
  const category = (stats: ComparableStats, slug: ArnakScoreCategory) =>
    stats.categories.find((c) => c.slug === slug)?.average ?? null;

  return [
    { key: "games", values: players.map((p) => p.games), best: players.map(() => false) },
    row("winRate", players.map(winRate)),
    row("avgPlace", players.map((p) => p.avg_place), true),
    row("avgPoints", players.map((p) => p.avg_points)),
    ...ARNAK_SCORE_CATEGORIES.map((slug) => row(slug, players.map((p) => category(p, slug)))),
  ];
}

/** The categories drawn as grouped bars: fear is negative, so it stays in the table only. */
export const CHART_CATEGORIES = ARNAK_SCORE_CATEGORIES.filter((c) => c !== "fear");

export type CategoryBars = {
  slug: ArnakScoreCategory;
  /** One per player, in order: their average and its bar length (0 to 1, the best = 1). */
  players: { value: number | null; bar: number }[];
};

/** "Puntos por categoría": each category's averages, scaled to that category's best. */
export function categoryBars(players: ComparableStats[]): CategoryBars[] {
  return CHART_CATEGORIES.map((slug) => {
    const values = players.map((p) => p.categories.find((c) => c.slug === slug)?.average ?? null);
    const max = Math.max(0, ...values.filter((v): v is number => v !== null));
    return {
      slug,
      players: values.map((value) => ({ value, bar: value !== null && max > 0 ? Math.max(value, 0) / max : 0 })),
    };
  });
}
