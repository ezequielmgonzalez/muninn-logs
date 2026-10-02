import "server-only";

import { cache } from "react";
import { z } from "zod";

import { ARNAK_LEADERS, ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { createClient } from "@/lib/supabase/server";

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
 * Arnak stats for the user or one of their friends (the database enforces who).
 * Cached per request: the notebook shell counts the user's games with it too.
 */
export const getPlayerStats = cache(async (userId: string): Promise<PlayerStats> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_player_stats", { target_user_id: userId });
  if (error) throw error;
  return statsSchema.parse(data);
});

const sharedStatsSchema = z.array(statsSchema.omit({ leaders: true }));

/**
 * The user's and each friend's stats over only the games where all of them
 * played together: the user first, then the friends in this order. The
 * database refuses anyone who isn't an accepted friend.
 */
export async function getSharedStats(friendIds: string[]): Promise<ComparableStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_stats", { friend_ids: friendIds });
  if (error) throw error;
  return sharedStatsSchema.parse(data);
}
