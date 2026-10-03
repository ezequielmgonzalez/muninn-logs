import "server-only";

import { cache } from "react";
import { z } from "zod";

import { type PlayerCounts, parsePlayerCounts, serializePlayerCounts } from "@/features/player-count/options";
import { ARNAK_LEADERS, ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { createClient } from "@/lib/supabase/server";

import type { Finish } from "./head-to-head";

// The shape get_player_stats() returns, parsed so the pages get real types.
/** A leader's points in the total or a category: average, lowest and highest. */
const points = z.object({ average: z.number(), min: z.number(), max: z.number() });

const statsSchema = z.object({
  games: z.number(),
  wins: z.number(),
  avg_points: z.number().nullable(),
  avg_place: z.number().nullable(),
  categories: z.array(z.object({ slug: z.enum(ARNAK_SCORE_CATEGORIES), average: z.number().nullable() })),
  /** Per leader, most played first; matches without a leader come last, with slug null. */
  leaders: z.array(
    z.object({
      slug: z.enum(ARNAK_LEADERS).nullable(),
      games: z.number(),
      wins: z.number(),
      avg_place: z.number(),
      total: points,
      categories: z.array(points.extend({ slug: z.enum(ARNAK_SCORE_CATEGORIES) })),
    }),
  ),
});

export type PlayerStats = z.infer<typeof statsSchema>;
/** What comparing needs: a player's own stats, or theirs over the games played together. */
export type ComparableStats = Omit<PlayerStats, "leaders">;
export type LeaderStats = PlayerStats["leaders"][number];

/**
 * Arnak stats for the user or one of their friends (the database enforces who),
 * from their games of those table sizes or all of them. Cached per request:
 * the notebook shell counts the user's games with it too.
 */
export function getPlayerStats(userId: string, players: PlayerCounts = null): Promise<PlayerStats> {
  // Cached by the sizes' text: a new array each call would never hit the cache.
  return playerStatsFor(userId, serializePlayerCounts(players));
}

const playerStatsFor = cache(async (userId: string, players: string | null): Promise<PlayerStats> => {
  const supabase = await createClient();
  const counts = parsePlayerCounts(players);
  const { data, error } = await supabase.rpc("get_player_stats", {
    target_user_id: userId,
    ...(counts ? { player_counts: [...counts] } : {}),
  });
  if (error) throw error;
  return statsSchema.parse(data);
});

/**
 * A guest's Arnak stats, from the games of theirs the user can see (the
 * database lets their owner and anyone who played with them ask).
 */
export async function getGuestStats(guestId: string, players: PlayerCounts = null): Promise<PlayerStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_guest_stats", {
    guest_id: guestId,
    ...(players ? { player_counts: [...players] } : {}),
  });
  if (error) throw error;
  return statsSchema.parse(data);
}

const sharedStatsSchema = z.array(statsSchema.omit({ leaders: true }));

/**
 * The user's and each friend's stats over only the games where all of them
 * played together: the user first, then the friends in this order. The
 * database refuses anyone who isn't an accepted friend.
 */
export async function getSharedStats(friendIds: string[], players: PlayerCounts = null): Promise<ComparableStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_stats", {
    friend_ids: friendIds,
    ...(players ? { player_counts: [...players] } : {}),
  });
  if (error) throw error;
  return sharedStatsSchema.parse(data);
}

/**
 * For Comparar's "Cara a cara": every finish of the user and these friends in
 * the Arnak matches the user played (only those can be "together"), at those
 * table sizes. RLS shows exactly the user's matches. Returns each user's
 * player id alongside, in the same order.
 */
export async function getFinishes(userIds: string[], players: PlayerCounts = null) {
  const supabase = await createClient();
  const { data: people, error } = await supabase.from("players").select("id, user_id").in("user_id", userIds);
  if (error) throw error;
  const playerIds = userIds.map((id) => people.find((p) => p.user_id === id)?.id ?? null);
  if (!playerIds[0]) return { playerIds, finishes: [] };

  let mine = supabase
    .from("matches")
    .select("id, game:games!inner(slug), match_players!inner(player_id)")
    .eq("game.slug", "arnak")
    .eq("match_players.player_id", playerIds[0]);
  if (players) mine = mine.in("player_count", [...players]);
  const [{ data: matches, error: matchesError }, { data: results, error: resultsError }] = await Promise.all([
    mine,
    supabase
      .from("match_results")
      .select("match_id, player_id, rank, is_winner")
      .in("player_id", playerIds.filter((id) => id !== null)),
  ]);
  if (matchesError) throw matchesError;
  if (resultsError) throw resultsError;

  const played = new Set(matches.map((m) => m.id));
  const finishes: Finish[] = results.flatMap((r) =>
    r.match_id && r.player_id && r.rank !== null && played.has(r.match_id)
      ? [{ match_id: r.match_id, player_id: r.player_id, rank: r.rank, is_winner: r.is_winner ?? false }]
      : [],
  );
  return { playerIds, finishes };
}
