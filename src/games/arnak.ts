import type { PaintTone } from "@/components/painted-band";

// Lost Ruins of Arnak catalog. Must match the rows seeded in
// supabase/migrations/*_seed_arnak_catalog.sql; labels live in the
// messages under Games.arnak.

export const ARNAK_SLUG = "arnak";

export const ARNAK_LEADERS = [
  // Expedition Leaders
  "captain",
  "falconer",
  "baroness",
  "professor",
  "explorer",
  "mystic",
  // The Missing Expedition
  "mechanic",
  "journalist",
] as const;

export const ARNAK_SCORE_CATEGORIES = [
  "research",
  "temple",
  "idols", // Includes points for empty idol slots.
  "guardians",
  "cards",
  "fear", // Stored negative.
] as const;

export type ArnakLeader = (typeof ARNAK_LEADERS)[number];
export type ArnakScoreCategory = (typeof ARNAK_SCORE_CATEGORIES)[number];

/**
 * How each leader is shown: an emoji instead of a portrait (the official
 * leader art isn't licensed for this app) and its categorical color from
 * design/tokens.json, used for its ranking bars everywhere.
 */
export const ARNAK_LEADER_STYLES: Record<
  ArnakLeader,
  { emoji: string; tone: Exclude<PaintTone, "ink" | "ink-muted"> }
> = {
  captain: { emoji: "⚓", tone: "chart-3" },
  falconer: { emoji: "🦅", tone: "chart-6" },
  baroness: { emoji: "👒", tone: "chart-2" },
  professor: { emoji: "🎓", tone: "chart-5" },
  explorer: { emoji: "🧭", tone: "chart-4" },
  mystic: { emoji: "🔮", tone: "chart-1" },
  mechanic: { emoji: "⚙️", tone: "chart-8" },
  journalist: { emoji: "📰", tone: "chart-7" },
};

/** Each scoring category's color from design/tokens.json; fear stays neutral. */
export const ARNAK_CATEGORY_TONES: Record<ArnakScoreCategory, Exclude<PaintTone, "ink">> = {
  research: "chart-5",
  temple: "chart-2",
  idols: "chart-8",
  guardians: "chart-1",
  cards: "chart-6",
  fear: "ink-muted",
};
