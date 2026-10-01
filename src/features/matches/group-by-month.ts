import type { MatchSummary } from "./queries";

export type MonthGroup = {
  /** "2026-09", or null for undated games. */
  month: string | null;
  matches: MatchSummary[];
};

/**
 * Matches (newest first) grouped by the month they were played, keeping the
 * order. Undated games form one group at the end, as the query sorts them last.
 */
export function groupByMonth(matches: MatchSummary[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const match of matches) {
    const month = match.playedOn?.slice(0, 7) ?? null;
    const last = groups.at(-1);
    if (last && last.month === month) last.matches.push(match);
    else groups.push({ month, matches: [match] });
  }
  return groups;
}

/** The notebook shows two months per spread: spread 0 is the two newest. */
export function spreadOf(groups: MonthGroup[], spread: number) {
  const spreads = Math.max(1, Math.ceil(groups.length / 2));
  const current = Math.min(Math.max(0, spread), spreads - 1);
  return {
    current,
    spreads,
    left: groups[current * 2],
    right: groups[current * 2 + 1],
  };
}
