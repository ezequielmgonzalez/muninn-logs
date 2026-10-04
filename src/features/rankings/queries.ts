import "server-only";

import { z } from "zod";

import type { Game } from "@/features/game/options";
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
      max_total: z.number(),
      min_total: z.number(),
    }),
  ),
});

export type Ranking = z.infer<typeof rankingSchema>;

/** Everyone the Consulta lets in, with their numbers under it (get_rankings(): the caller's view, RLS decides). */
export async function getRanking(filters: RankingFilters, players: PlayerCounts, game: Game = "arnak"): Promise<Ranking> {
  const supabase = await createClient();
  const groups = {
    include_friends: filters.groups.includes("friends"),
    include_own_guests: filters.groups.includes("ownGuests"),
    include_other_guests: filters.groups.includes("otherGuests"),
  };
  // A duel's Consulta is its side (a character, like a leader) and who's in.
  const { data, error } = game === "lotr-duel"
    ? await supabase.rpc("get_rankings", { game_slug: game, ...(filters.side ? { leader_slug: filters.side } : {}), ...groups })
    : await supabase.rpc("get_rankings", {
    ...(filters.leader === "none" ? { no_leader: true } : filters.leader ? { leader_slug: filters.leader } : {}),
    ...(filters.temple === "none" ? { no_board_side: true } : filters.temple ? { board_side: filters.temple } : {}),
    ...(filters.seat ? { seat: filters.seat } : {}),
    ...groups,
    ...(players ? { player_counts: [...players] } : {}),
  });
  if (error) throw error;
  return rankingSchema.parse(data);
}
