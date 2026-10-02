/** Which way the diary's page turns: forward to a later section, backward to an earlier one. */
export type TurnDirection = "forward" | "backward";

/** The sections in the order of the diary (and of the navigation). */
export const SECTION_ORDER = ["home", "matches", "stats", "friends"] as const;
export type NotebookSection = (typeof SECTION_ORDER)[number];

/**
 * The turn from the current section to another. None to the same section;
 * forward from a screen outside the sections (e.g. editing the profile).
 */
export function sectionTurn(from: NotebookSection | undefined, to: NotebookSection): TurnDirection | undefined {
  if (from === to) return undefined;
  if (from === undefined) return "forward";
  return SECTION_ORDER.indexOf(to) > SECTION_ORDER.indexOf(from) ? "forward" : "backward";
}
