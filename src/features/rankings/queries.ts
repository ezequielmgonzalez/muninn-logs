import "server-only";

import { z } from "zod";

import type { PlayerCounts } from "@/features/player-count/options";
import { createClient } from "@/lib/supabase/server";

import type { RankingFilters } from "./filters";

const rankingSchema = z.object({
  /** The distinct matches the ranking uses. */
  matches: z.number(),
  players: z.array(
    z.object({
      player_id: z.string(),
      kind: z.enum(["me", "friend", "own_guest", "other_guest"]),
      name: z.string(),
      owner_name: z.string().nullable(),
      games: z.number(),
      wins: z.number(),
      avg_points: z.number(),
      avg_place: z.number(),
    }),
  ),
});

export type Ranking = z.infer<typeof rankingSchema>;

/** Everyone the Consulta lets in, with their numbers under it (get_rankings(): the caller's view, RLS decides). */
export async function getRanking(filters: RankingFilters, players: PlayerCounts): Promise<Ranking> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_rankings", {
    ...(filters.leader ? { leader_slug: filters.leader } : {}),
    ...(filters.temple ? { board_side: filters.temple } : {}),
    include_friends: filters.groups.includes("friends"),
    include_own_guests: filters.groups.includes("ownGuests"),
    include_other_guests: filters.groups.includes("otherGuests"),
    ...(players ? { player_counts: [...players] } : {}),
  });
  if (error) throw error;
  return rankingSchema.parse(data);
}
