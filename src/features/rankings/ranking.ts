// Sorting the ranking and sizing its bars. The rows come from get_rankings().

export const RANKING_SORTS = ["winRate", "avgPoints", "maxPoints", "minPoints", "avgPlace", "games"] as const;
export type RankingSort = (typeof RANKING_SORTS)[number];

export type RankingRow = {
  player_id: string;
  kind: "me" | "friend" | "own_guest" | "other_guest";
  name: string;
  /** Another organizer's guest: whose (null when that profile isn't visible). */
  owner_name: string | null;
  games: number;
  wins: number;
  avg_points: number;
  avg_place: number;
  max_total: number;
  min_total: number;
};

export function sortValue(row: RankingRow, sort: RankingSort): number {
  switch (sort) {
    case "winRate":
      return row.wins / row.games;
    case "avgPoints":
      return row.avg_points;
    case "maxPoints":
      return row.max_total;
    case "minPoints":
      return row.min_total;
    case "avgPlace":
      return row.avg_place;
    case "games":
      return row.games;
  }
}

/**
 * Best first: the highest win rate, points and games (the highest lowest
 * total too: the best worst game), the lowest place. Ties:
 * more games first, then by name. Each row gets its bar, from 0 to 1 relative
 * to the best value in the list (for place: the best place over this one's).
 */
export function rankRows(rows: readonly RankingRow[], sort: RankingSort, locale: string) {
  const lowerIsBetter = sort === "avgPlace";
  const sorted = [...rows].sort((a, b) => {
    const [va, vb] = [sortValue(a, sort), sortValue(b, sort)];
    return (lowerIsBetter ? va - vb : vb - va) || b.games - a.games || a.name.localeCompare(b.name, locale);
  });
  const values = sorted.map((row) => sortValue(row, sort));
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values, 0);
  return sorted.map((row, i) => {
    const value = values[i];
    const bar = lowerIsBetter ? (value > 0 ? best / value : 0) : best > 0 ? value / best : 0;
    return { row, value, bar, position: i + 1 };
  });
}
