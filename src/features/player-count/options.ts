/**
 * Filtering stats and lists by table size: Arnak is played by 2, 3 or 4, and
 * the "Jugadores" filter picks any of them (at least one). All three is no
 * filter at all, so it's stored as null. The choice is a cookie, so it
 * follows the user from screen to screen, and the URL can carry it too
 * (?jugadores=3,4: the proxy turns it into the cookie).
 */
export const PLAYER_COUNTS = [2, 3, 4] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];
/** The table sizes counted, smallest first; null for all of them. */
export type PlayerCounts = readonly PlayerCount[] | null;

export const PLAYER_COUNTS_COOKIE = "players";
export const PLAYER_COUNTS_PARAM = "jugadores";

/**
 * "3,4" → [3, 4]. Unknown sizes are ignored and duplicates merged; nothing
 * valid, or every size, means no filter (null). A single size ("3") is what
 * the cookie held before several could be picked.
 */
export function parsePlayerCounts(value: string | null | undefined): PlayerCounts {
  const picked = PLAYER_COUNTS.filter((n) => (value ?? "").split(",").some((part) => part.trim() === String(n)));
  return picked.length === 0 || picked.length === PLAYER_COUNTS.length ? null : picked;
}

/** The value for the cookie and ?jugadores=, or null when nothing is filtered. */
export function serializePlayerCounts(counts: PlayerCounts): string | null {
  return counts ? counts.join(",") : null;
}

/** Which sizes are ticked: all of them when there's no filter. */
export function checkedCounts(counts: PlayerCounts): readonly PlayerCount[] {
  return counts ?? PLAYER_COUNTS;
}

/** Ticking or unticking one size; undefined when that would leave none ticked, which isn't allowed. */
export function togglePlayerCount(counts: PlayerCounts, size: PlayerCount): PlayerCounts | undefined {
  const checked = checkedCounts(counts);
  const next = checked.includes(size) ? checked.filter((n) => n !== size) : [...checked, size];
  if (next.length === 0) return undefined;
  return parsePlayerCounts(next.join(","));
}

/** A key that changes with the filter, e.g. to paint a screen again ("all" or "3,4"). */
export function playerCountsKey(counts: PlayerCounts): string {
  return serializePlayerCounts(counts) ?? "all";
}
