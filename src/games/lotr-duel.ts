import type { PaintTone } from "@/components/notebook/painted-band";

// The Lord of the Rings: Duel for Middle-earth ("LOTR Duel") catalog. Must
// match supabase/migrations/*_lotr_duel.sql; labels live in the messages
// under Games.lotr-duel.

export const LOTR_DUEL_SLUG = "lotr-duel";

/** The two sides, one per player: the game's characters. */
export const LOTR_SIDES = ["sauron", "fellowship"] as const;

/**
 * How a duel is won: one of the three victories, or, when none happened,
 * more influence over Middle-earth at the end. With equal influence it's a
 * draw, which has no victory.
 */
export const LOTR_VICTORIES = ["middle_earth", "ring", "races", "influence"] as const;

/** A duel's result: the side that won, or a draw. */
export const LOTR_RESULTS = [...LOTR_SIDES, "draw"] as const;

export type LotrSide = (typeof LOTR_SIDES)[number];
export type LotrVictory = (typeof LOTR_VICTORIES)[number];
export type LotrResult = (typeof LOTR_RESULTS)[number];

/** Each side as leaders are shown: an emoji (no official art) and a color from design/tokens.json. */
export const LOTR_SIDE_STYLES: Record<LotrSide, { emoji: string; tone: Exclude<PaintTone, "ink" | "ink-muted"> }> = {
  sauron: { emoji: "👁️", tone: "chart-1" },
  fellowship: { emoji: "💍", tone: "chart-4" },
};

/** Each victory's color, for the bars of how games are won and lost. */
export const LOTR_VICTORY_TONES: Record<LotrVictory, Exclude<PaintTone, "ink" | "ink-muted">> = {
  middle_earth: "chart-3",
  ring: "chart-2",
  races: "chart-6",
  influence: "chart-5",
};
