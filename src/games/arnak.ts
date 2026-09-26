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
