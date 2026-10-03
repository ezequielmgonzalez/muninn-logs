import type { ArnakScoreCategory } from "@/games/arnak";

import type { ComparableStats } from "./queries";

// Comparar's "Cara a cara": you against each friend, over the games you
// played together, and the advantage note under each duel.

/** One player's finish in one match (match_results). */
export type Finish = { match_id: string; player_id: string; rank: number; is_winner: boolean };

const byMatch = (finishes: readonly Finish[]) => {
  const matches = new Map<string, Map<string, Finish>>();
  for (const f of finishes) {
    if (!matches.has(f.match_id)) matches.set(f.match_id, new Map());
    matches.get(f.match_id)!.set(f.player_id, f);
  }
  return matches;
};

/**
 * You against one friend: the matches you both played, and in how many each
 * finished higher (a better place; the same place counts for neither).
 */
export function duel(finishes: readonly Finish[], me: string, friend: string) {
  let together = 0;
  let mine = 0;
  let theirs = 0;
  for (const players of byMatch(finishes).values()) {
    const [a, b] = [players.get(me), players.get(friend)];
    if (!a || !b) continue;
    together += 1;
    if (a.rank < b.rank) mine += 1;
    else if (b.rank < a.rank) theirs += 1;
  }
  return { together, mine, theirs };
}

/** Everyone at one table: the matches all of them played, and each one's wins there (in `players` order). */
export function wholeTable(finishes: readonly Finish[], players: readonly string[]) {
  const wins = players.map(() => 0);
  let matches = 0;
  for (const finish of byMatch(finishes).values()) {
    if (!players.every((p) => finish.has(p))) continue;
    matches += 1;
    players.forEach((p, i) => {
      if (finish.get(p)!.is_winner) wins[i] += 1;
    });
  }
  return { matches, wins };
}

export type Advantage =
  | { kind: "even" }
  | { kind: "edge"; ahead?: { slug: ArnakScoreCategory; diff: number }; behind?: { slug: ArnakScoreCategory; diff: number } };

/**
 * Where you lead a friend the most, and where they lead you the most, by the
 * table's category averages. More is better in every category: Miedo's points
 * are negative, so the higher (less negative) one is better there too.
 * Differences count at one decimal, as shown; null when there's nothing to
 * compare (no averages on either side).
 */
export function advantage(mine: ComparableStats, theirs: ComparableStats): Advantage | null {
  const diffs = mine.categories.flatMap((own) => {
    const other = theirs.categories.find((c) => c.slug === own.slug);
    if (own.average === null || other?.average == null) return [];
    return [{ slug: own.slug, diff: Math.round((own.average - other.average) * 10) / 10 }];
  });
  if (diffs.length === 0) return null;
  const best = diffs.reduce((a, b) => (b.diff > a.diff ? b : a));
  const worst = diffs.reduce((a, b) => (b.diff < a.diff ? b : a));
  const ahead = best.diff > 0 ? best : undefined;
  const behind = worst.diff < 0 ? { slug: worst.slug, diff: -worst.diff } : undefined;
  return ahead || behind ? { kind: "edge", ahead, behind } : { kind: "even" };
}
