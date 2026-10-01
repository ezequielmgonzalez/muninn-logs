import type { AddablePlayer } from "@/features/matches/log-match-form";
import type { LogMatchInput } from "@/features/matches/schema";

import { fold, type ImportedGame, nameKey } from "./parse-import";

/** Who a CSV name is: an existing player's id, or a guest created by the import. */
export const NEW_GUEST = "new";
export type NameChoices = Record<string, string>;

/**
 * A first guess for each name: the first addable player with that name,
 * ignoring case and accents ("jose" is José), else a new guest. Addable
 * players come ordered: you, then friends, then guests.
 */
export function suggestChoices(names: string[], addable: AddablePlayer[]): NameChoices {
  return Object.fromEntries(
    names.map((name) => [nameKey(name), addable.find((p) => fold(p.name) === fold(name))?.id ?? NEW_GUEST]),
  );
}

export type SamePlayerIssue = { game: string; playerId: string };

/**
 * The games as the match form would submit them. Two names can't point to
 * the same player in one game; those games are returned as issues.
 */
export function toMatchInputs(
  games: ImportedGame[],
  choices: NameChoices,
): { matches: LogMatchInput[]; issues: SamePlayerIssue[] } {
  const issues: SamePlayerIssue[] = [];
  const matches = games.map((game): LogMatchInput => {
    const players = game.players.map((p) => {
      const choice = choices[nameKey(p.name)] ?? NEW_GUEST;
      const who = choice === NEW_GUEST ? { newGuestName: p.name } : { playerId: choice };
      return { ...who, leader: p.leader, scores: p.scores, wonTiebreak: p.wonTiebreak };
    });
    const ids = players.flatMap((p) => ("playerId" in p ? [p.playerId] : []));
    const repeated = ids.find((id, i) => ids.indexOf(id) !== i);
    if (repeated) issues.push({ game: game.label, playerId: repeated });
    return {
      playedOn: game.playedOn,
      boardSide: game.boardSide,
      durationMinutes: game.durationMinutes,
      players,
    };
  });
  return { matches, issues };
}
