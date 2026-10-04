import { ARNAK_SLUG } from "@/games/arnak";
import { LOTR_DUEL_SLUG } from "@/games/lotr-duel";

// Which game the notebook is about: every stat, list and the match form are
// that game's. A cookie remembers it, and ?juego= in a URL sets it (the proxy
// turns it into the cookie on the same request), like the Jugadores filter.

export const GAMES = [ARNAK_SLUG, LOTR_DUEL_SLUG] as const;
export type Game = (typeof GAMES)[number];

/** The game the notebook starts with, and the one games without a choice use. */
export const DEFAULT_GAME: Game = ARNAK_SLUG;

export const GAME_COOKIE = "juego";
export const GAME_PARAM = "juego";

/** In the URL and the cookie, short and in the group's words: ?juego=lotr. */
const GAME_PARAMS: Record<Game, string> = { arnak: "arnak", "lotr-duel": "lotr" };

/** The game a cookie or URL names; anything else means the default. */
export function parseGame(value: string | null | undefined): Game {
  return GAMES.find((game) => GAME_PARAMS[game] === value) ?? DEFAULT_GAME;
}

export function gameParam(game: Game): string {
  return GAME_PARAMS[game];
}

/** Whether the game has table sizes to filter by (a duel is always two players). */
export function hasTableSizes(game: Game): boolean {
  return game === ARNAK_SLUG;
}
