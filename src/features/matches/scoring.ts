import type { ArnakScoreCategory } from "@/games/arnak";

/** Scores as typed in the form; fear is a count of fear cards (subtracted). */
export type ScoreEntries = Record<ArnakScoreCategory, number>;

export function total(scores: ScoreEntries): number {
  return (
    scores.research + scores.temple + scores.idols + scores.guardians + scores.cards - scores.fear
  );
}

/**
 * Indexes of the players tied for first place, or [] when first place is
 * unique. Only then does the form ask who won the tiebreak.
 */
export function tiedForFirst(totals: number[]): number[] {
  if (totals.length < 2) return [];
  const best = Math.max(...totals);
  const tied = totals.flatMap((t, i) => (t === best ? [i] : []));
  return tied.length > 1 ? tied : [];
}
