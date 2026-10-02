/**
 * Filtering stats and lists by the number of players: Arnak is played by 2,
 * 3 or 4. null means every game. The choice is a cookie, so it follows the
 * user from screen to screen.
 */
export const PLAYER_COUNTS = [2, 3, 4] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

export const PLAYER_COUNT_COOKIE = "players";

export function parsePlayerCount(value: string | null | undefined): PlayerCount | null {
  const n = Number(value);
  return (PLAYER_COUNTS as readonly number[]).includes(n) ? (n as PlayerCount) : null;
}
