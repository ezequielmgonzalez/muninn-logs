import "server-only";

import { cookies } from "next/headers";

import { PLAYER_COUNT_COOKIE, type PlayerCount, parsePlayerCount } from "./options";

/** The number of players the user filters by, or null for every game. */
export async function getPlayerCount(): Promise<PlayerCount | null> {
  return parsePlayerCount((await cookies()).get(PLAYER_COUNT_COOKIE)?.value);
}
