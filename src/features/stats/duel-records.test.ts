import { describe, expect, it } from "vitest";

import type { MatchSummary } from "@/features/matches/queries";
import type { LotrResult } from "@/games/lotr-duel";

import { opponentRecords } from "./duel-records";

let next = 0;
/** A duel between the user (Sauron) and someone (the Fellowship). */
function duel(opponent: string, result: LotrResult, withMe = true): MatchSummary {
  const player = (name: string, isMe: boolean, side: "sauron" | "fellowship") => ({
    playerId: name,
    name,
    username: null,
    isMe,
    isGuest: false,
    leader: null,
    side,
    turnOrder: null,
    total: 0,
    rank: result === "draw" || result === side ? 1 : 2,
    isWinner: result === side,
    wonTiebreak: false,
  });
  return {
    id: String(next++),
    game: "lotr-duel",
    duel: { result, victory: result === "draw" ? null : "ring" },
    playedOn: null,
    durationMinutes: null,
    boardSide: null,
    loggedByMe: true,
    turnOrderKnown: false,
    players: [player(withMe ? "Vos" : "Iñaki", withMe, "sauron"), player(opponent, false, "fellowship")],
  };
}

describe("the user's record against each opponent", () => {
  it("counts wins, draws and losses, most played first", () => {
    const records = opponentRecords([
      duel("Jessi", "sauron"),
      duel("Bob", "fellowship"),
      duel("Jessi", "draw"),
      duel("Jessi", "fellowship"),
    ]);
    expect(records.map(({ name, games, wins, draws, losses }) => ({ name, games, wins, draws, losses }))).toEqual([
      { name: "Jessi", games: 3, wins: 1, draws: 1, losses: 1 },
      { name: "Bob", games: 1, wins: 0, draws: 0, losses: 1 },
    ]);
  });

  it("only counts the user's own duels", () => {
    expect(opponentRecords([duel("Jessi", "sauron", false)])).toEqual([]);
  });
});
