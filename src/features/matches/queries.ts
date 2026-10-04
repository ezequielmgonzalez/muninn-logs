import "server-only";

import { DEFAULT_GAME, type Game, GAMES } from "@/features/game/options";
import type { PlayerCounts } from "@/features/player-count/options";
import { ARNAK_BOARD_SIDES, ARNAK_LEADERS, type ArnakBoardSide, type ArnakLeader, type ArnakScoreCategory } from "@/games/arnak";
import {
  LOTR_RESULTS,
  LOTR_SIDES,
  LOTR_VICTORIES,
  type LotrResult,
  type LotrSide,
  type LotrVictory,
} from "@/games/lotr-duel";
import { createClient } from "@/lib/supabase/server";

// Reading matches. RLS already limits them to ones the user logged or played.

export type MatchPlayer = {
  playerId: string;
  name: string;
  /** A user's username (null for guests): their page, if they're a friend. */
  username: string | null;
  isMe: boolean;
  isGuest: boolean;
  /** Arnak: the player's leader. */
  leader: ArnakLeader | null;
  /** LOTR Duel: the player's side. */
  side: LotrSide | null;
  /** Null when the match's turn order is unknown (e.g. copied from an old score pad). */
  turnOrder: number | null;
  total: number;
  rank: number;
  isWinner: boolean;
  wonTiebreak: boolean;
};

export type MatchSummary = {
  id: string;
  game: Game;
  /** LOTR Duel: who won, and how (null in a draw); null for games decided by points. */
  duel: { result: LotrResult; victory: LotrVictory | null } | null;
  /** Null for undated games. */
  playedOn: string | null;
  durationMinutes: number | null;
  boardSide: ArnakBoardSide | null;
  loggedByMe: boolean;
  /** Whether the players' turn order was recorded (it's all or nothing). */
  turnOrderKnown: boolean;
  /** Ranked: winners first, then by rank and turn order. */
  players: MatchPlayer[];
};

export type MatchDetail = MatchSummary & {
  scores: Record<string, Record<ArnakScoreCategory, number>>;
};

const MATCH_COLUMNS = `
  id, played_on, created_by, duration_minutes, setup,
  game:games!inner ( slug ),
  match_players (
    player_id, turn_order, won_tiebreak,
    player:players ( name, user_id, profile:profiles!players_user_id_fkey ( display_name, username ) ),
    character:game_characters ( slug )
  )` as const;

type MatchRow = {
  id: string;
  played_on: string | null;
  created_by: string;
  duration_minutes: number | null;
  setup: unknown;
  game: { slug: string };
  match_players: {
    player_id: string;
    turn_order: number | null;
    won_tiebreak: boolean;
    player: {
      name: string | null;
      user_id: string | null;
      profile: { display_name: string; username: string | null } | null;
    } | null;
    character: { slug: string } | null;
  }[];
};

async function toSummaries(rows: MatchRow[]): Promise<MatchSummary[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const [{ data: claims }, { data: results, error }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("match_results")
      .select("match_id, player_id, total, rank, is_winner")
      .in("match_id", rows.map((r) => r.id)),
  ]);
  if (error) throw error;
  const me = claims?.claims.sub;

  return rows.map((row) => {
    const players = row.match_players.map((mp): MatchPlayer => {
      const result = results?.find((r) => r.match_id === row.id && r.player_id === mp.player_id);
      return {
        playerId: mp.player_id,
        name: mp.player?.profile?.display_name ?? mp.player?.name ?? "?",
        username: mp.player?.profile?.username ?? null,
        isMe: mp.player?.user_id != null && mp.player.user_id === me,
        isGuest: mp.player?.user_id == null,
        leader: ARNAK_LEADERS.find((slug) => slug === mp.character?.slug) ?? null,
        side: LOTR_SIDES.find((slug) => slug === mp.character?.slug) ?? null,
        turnOrder: mp.turn_order,
        total: result?.total ?? 0,
        rank: result?.rank ?? 0,
        isWinner: result?.is_winner ?? false,
        wonTiebreak: mp.won_tiebreak,
      };
    });
    players.sort((a, b) => a.rank - b.rank || (a.turnOrder ?? 0) - (b.turnOrder ?? 0));

    const setup = (row.setup ?? {}) as { board_side?: string; result?: string; victory?: string };
    const result = LOTR_RESULTS.find((r) => r === setup.result);
    return {
      id: row.id,
      game: GAMES.find((g) => g === row.game.slug) ?? DEFAULT_GAME,
      duel: result ? { result, victory: LOTR_VICTORIES.find((v) => v === setup.victory) ?? null } : null,
      playedOn: row.played_on,
      durationMinutes: row.duration_minutes,
      boardSide: ARNAK_BOARD_SIDES.find((side) => side === setup.board_side) ?? null,
      loggedByMe: row.created_by === me,
      turnOrderKnown: players.every((p) => p.turnOrder !== null),
      players,
    };
  });
}

/** The newest matches of a game, optionally only those of these table sizes (player_count, a computed field). */
export async function listMatches(limit = 50, players: PlayerCounts = null, game: Game = DEFAULT_GAME): Promise<MatchSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("matches").select(MATCH_COLUMNS).eq("game.slug", game);
  if (players) query = query.in("player_count", [...players]);
  const { data, error } = await query
    .order("played_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return toSummaries(data as unknown as MatchRow[]);
}

/** One match with every player's points per category, or null if not visible. */
export async function getMatch(id: string): Promise<MatchDetail | null> {
  const supabase = await createClient();
  const [{ data, error }, { data: scores, error: scoresError }] = await Promise.all([
    supabase.from("matches").select(MATCH_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("match_player_scores")
      .select("player_id, points, category:score_categories ( slug )")
      .eq("match_id", id),
  ]);
  if (error) throw error;
  if (scoresError) throw scoresError;
  if (!data) return null;

  const [summary] = await toSummaries([data as unknown as MatchRow]);
  const byPlayer: MatchDetail["scores"] = {};
  for (const s of scores ?? []) {
    const slug = (s.category as unknown as { slug: ArnakScoreCategory }).slug;
    byPlayer[s.player_id] = { ...byPlayer[s.player_id], [slug]: s.points };
  }
  return { ...summary, scores: byPlayer };
}
