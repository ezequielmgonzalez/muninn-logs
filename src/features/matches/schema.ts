import { z } from "zod";

import { ARNAK_BOARD_SIDES, ARNAK_LEADERS, ARNAK_SCORE_CATEGORIES, ARNAK_SLUG } from "@/games/arnak";

// What the match form submits (as JSON), and its translation into the
// payload of the log_match() database function.

const points = z.number().int().min(0).max(999);

const playerSchema = z
  .object({
    /** An existing player, or… */
    playerId: z.uuid().optional(),
    /** …a guest created with this match (trimmed, like players.name). */
    newGuestName: z.string().trim().min(1).max(50).optional(),
    leader: z.enum(ARNAK_LEADERS).nullable(),
    /** Every category as a non-negative number; fear is the count of fear cards. */
    scores: z.object(
      Object.fromEntries(ARNAK_SCORE_CATEGORIES.map((category) => [category, points])) as Record<
        (typeof ARNAK_SCORE_CATEGORIES)[number],
        typeof points
      >,
    ),
    wonTiebreak: z.boolean(),
  })
  .refine((p) => (p.playerId === undefined) !== (p.newGuestName === undefined), {
    message: "A player is either existing or a new guest",
  });

export const logMatchSchema = z
  .object({
    /** Optional: games logged long after (e.g. from old score pads) may have no date. */
    playedOn: z.iso.date().nullable(),
    boardSide: z.enum(ARNAK_BOARD_SIDES).nullable(),
    durationMinutes: z.number().int().min(1).max(1440).nullable(),
    /**
     * Whether `players` is in turn order. Games copied from old score pads
     * often don't say who went first: then no player gets a turn, rather than
     * a made-up one that stats by turn order would count.
     */
    turnOrderKnown: z.boolean(),
    // Arnak without the solo mode: 2 to 4 players.
    players: z.array(playerSchema).min(2).max(4),
  })
  .refine(
    (m) => {
      const ids = m.players.flatMap((p) => (p.playerId ? [p.playerId] : []));
      return new Set(ids).size === ids.length;
    },
    { message: "The same player can't play twice", path: ["players"] },
  )
  .refine(
    (m) => {
      const leaders = m.players.flatMap((p) => (p.leader ? [p.leader] : []));
      return new Set(leaders).size === leaders.length;
    },
    { message: "A leader can be played by only one player", path: ["players"] },
  )
  .refine((m) => m.players.filter((p) => p.wonTiebreak).length <= 1, {
    message: "Only one player can win the tiebreak",
    path: ["players"],
  });

export type LogMatchInput = z.infer<typeof logMatchSchema>;

/** Arguments for the log_match() database function. */
export function toLogMatchArgs(input: LogMatchInput) {
  return {
    game_slug: ARNAK_SLUG,
    played_on: input.playedOn,
    duration_minutes: input.durationMinutes ?? undefined,
    setup: input.boardSide ? { board_side: input.boardSide } : {},
    turn_order_known: input.turnOrderKnown,
    players: input.players.map((p) => ({
      ...(p.playerId ? { player_id: p.playerId } : { new_guest_name: p.newGuestName }),
      character: p.leader,
      won_tiebreak: p.wonTiebreak,
      // Fear is entered as a card count and stored negative, so totals are a plain sum.
      scores: { ...p.scores, fear: 0 - p.scores.fear },
    })),
  };
}
