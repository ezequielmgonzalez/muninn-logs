import "server-only";

import { cookies } from "next/headers";

import { PLAYER_COUNTS_COOKIE, type PlayerCounts, parsePlayerCounts } from "./options";

/** The table sizes the user filters by, or null for every game. ?jugadores= reaches it through the proxy. */
export async function getPlayerCounts(): Promise<PlayerCounts> {
  return parsePlayerCounts((await cookies()).get(PLAYER_COUNTS_COOKIE)?.value);
}
