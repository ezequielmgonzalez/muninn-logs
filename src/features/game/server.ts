import "server-only";

import { cookies } from "next/headers";

import { GAME_COOKIE, type Game, parseGame } from "./options";

/** The game the notebook is about. ?juego= reaches it through the proxy. */
export async function getGame(): Promise<Game> {
  return parseGame((await cookies()).get(GAME_COOKIE)?.value);
}
