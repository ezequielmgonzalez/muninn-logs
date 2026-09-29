import "server-only";

import { z } from "zod";

import { ARNAK_LEADERS, ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { createClient } from "@/lib/supabase/server";

// The shape get_player_stats() returns, parsed so the pages get real types.
const statsSchema = z.object({
  games: z.number(),
  wins: z.number(),
  avg_points: z.number().nullable(),
  avg_place: z.number().nullable(),
  categories: z.array(z.object({ slug: z.enum(ARNAK_SCORE_CATEGORIES), average: z.number().nullable() })),
  leaders: z.array(
    z.object({
      slug: z.enum(ARNAK_LEADERS),
      games: z.number(),
      wins: z.number(),
      avg_place: z.number(),
      avg_points: z.number(),
      avg_research: z.number().nullable(),
    }),
  ),
});

export type PlayerStats = z.infer<typeof statsSchema>;
export type LeaderStats = PlayerStats["leaders"][number];

/** Arnak stats for the user or one of their friends (the database enforces who). */
export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_player_stats", { target_user_id: userId });
  if (error) throw error;
  return statsSchema.parse(data);
}
