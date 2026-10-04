import type { MatchSummary } from "@/features/matches/queries";

/** The user's record against one opponent, from the duels they played together. */
export type OpponentRecord = {
  playerId: string;
  name: string;
  isGuest: boolean;
  username: string | null;
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

/**
 * "Contra cada rival": the user's wins, draws and losses against each
 * opponent, in the duels the user played. Most played first, then by name.
 */
export function opponentRecords(duels: readonly MatchSummary[]): OpponentRecord[] {
  const records = new Map<string, OpponentRecord>();
  for (const duel of duels) {
    const me = duel.players.find((p) => p.isMe);
    if (!me || !duel.duel) continue;
    for (const other of duel.players) {
      if (other.isMe) continue;
      const record = records.get(other.playerId) ?? {
        playerId: other.playerId,
        name: other.name,
        isGuest: other.isGuest,
        username: other.username,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };
      record.games += 1;
      if (duel.duel.result === "draw") record.draws += 1;
      else if (me.isWinner) record.wins += 1;
      else record.losses += 1;
      records.set(other.playerId, record);
    }
  }
  return [...records.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}
