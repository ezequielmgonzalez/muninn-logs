import type { NotebookSection } from "./turn-direction";

// What the notebook frame shows for each screen, from its path (without the
// locale). The frame is a layout that stays put between screens, so it reads
// the path instead of being told by each page.

const MATCH_FORM = /^\/matches\/(new|[^/]+\/edit)$/;

/** The section marked as current. Compare and guests live under friends; the match form and settings under none. */
export function sectionOf(path: string): NotebookSection | undefined {
  if (path === "/") return "home";
  if (MATCH_FORM.test(path)) return undefined;
  if (path === "/matches" || path.startsWith("/matches/")) return "matches";
  if (path === "/profile") return "stats";
  if (path === "/friends" || path.startsWith("/friends/") || path === "/compare" || path === "/guests") return "friends";
  return undefined;
}

/** Screens with stats or lists of games, which the player count filters. */
export function hasPlayerFilter(path: string): boolean {
  return ["/", "/matches", "/profile", "/compare"].includes(path) || /^\/friends\/[^/]+$/.test(path);
}

/** The match form brings its own save bar on phones, in place of the tab bar. */
export function hasSaveBar(path: string): boolean {
  return MATCH_FORM.test(path);
}
