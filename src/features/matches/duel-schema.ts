import { z } from "zod";

import { LOTR_DUEL_SLUG, LOTR_RESULTS, LOTR_SIDES, LOTR_VICTORIES } from "@/games/lotr-duel";

// What the LOTR Duel form submits (as JSON), and its translation into the
// payload of log_match(). Mirrors the database's checks (save_match_players).

const playerSchema = z
  .object({
    /** An existing player, or… */
    playerId: z.uuid().optional(),
    /** …a guest created with this match (trimmed, like players.name). */
    newGuestName: z.string().trim().min(1).max(50).optional(),
    side: z.enum(LOTR_SIDES),
  })
  .refine((p) => (p.playerId === undefined) !== (p.newGuestName === undefined), {
    message: "A player is either existing or a new guest",
  });

export const logDuelSchema = z
  .object({
    /** Optional, as for any game: old games may have no date. */
    playedOn: z.iso.date().nullable(),
    durationMinutes: z.number().int().min(1).max(1440).nullable(),
    // A duel: two players, one per side.
    players: z.array(playerSchema).length(2),
    result: z.enum(LOTR_RESULTS),
    /** How the winning side won; a draw has none. */
    victory: z.enum(LOTR_VICTORIES).nullable(),
  })
  // Zod runs these even when the length is wrong: read the players carefully.
  .refine((d) => !d.players[0]?.playerId || d.players[0].playerId !== d.players[1]?.playerId, {
    message: "The same player can't play twice",
    path: ["players"],
  })
  .refine((d) => d.players[0]?.side !== d.players[1]?.side, {
    message: "One player per side",
    path: ["players"],
  })
  .refine((d) => (d.result === "draw") === (d.victory === null), {
    message: "A win says how; a draw doesn't",
    path: ["victory"],
  });

export type LogDuelInput = z.infer<typeof logDuelSchema>;

/** Arguments for the log_match() database function. A duel has no turn order to record, and no points. */
export function toLogDuelArgs(input: LogDuelInput) {
  return {
    game_slug: LOTR_DUEL_SLUG,
    played_on: input.playedOn,
    duration_minutes: input.durationMinutes ?? undefined,
    setup: input.victory ? { result: input.result, victory: input.victory } : { result: input.result },
    turn_order_known: false,
    players: input.players.map((p) => ({
      ...(p.playerId ? { player_id: p.playerId } : { new_guest_name: p.newGuestName }),
      character: p.side,
      scores: {},
    })),
  };
}
