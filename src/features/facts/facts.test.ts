import { describe, expect, it } from "vitest";

import type { MatchSummary } from "@/features/matches/queries";
import type { ArnakBoardSide, ArnakLeader } from "@/games/arnak";

import { type Fact, findFacts } from "./facts";

type Seat = [name: string, total: number, leader?: ArnakLeader];

let next = 0;
/** A game: players with their totals (ranked by them; "Vos" is the user), seated in the order given when `seated`. */
function game(seats: Seat[], options: { side?: ArnakBoardSide; minutes?: number; seated?: boolean } = {}): MatchSummary {
  const players = seats.map(([name, total, leader], i) => ({
    playerId: name,
    name,
    username: null,
    isMe: name === "Vos",
    isGuest: false,
    leader: leader ?? null,
    turnOrder: options.seated ? i + 1 : null,
    total,
    rank: 1 + seats.filter(([, other]) => other > total).length,
    isWinner: seats.every(([, other]) => other <= total),
    wonTiebreak: false,
  }));
  players.sort((a, b) => a.rank - b.rank);
  return {
    id: String(next++),
    playedOn: null,
    durationMinutes: options.minutes ?? null,
    boardSide: options.side ?? null,
    loggedByMe: true,
    turnOrderKnown: Boolean(options.seated),
    players,
  };
}

/** findFacts takes the list newest first, like listMatches: write games oldest first. */
const facts = (...games: MatchSummary[]) => findFacts([...games].reverse());
const of = <K extends Fact["kind"]>(list: Fact[], kind: K) => list.filter((f): f is Extract<Fact, { kind: K }> => f.kind === kind);
const me = { name: "Vos", isMe: true };
const person = (name: string) => ({ name, isMe: false });

describe("¿Sabías que…?", () => {
  it("says nothing until there are a few games", () => {
    expect(facts(game([["Vos", 50], ["Jessi", 40]]), game([["Vos", 50], ["Jessi", 60]]))).toEqual([]);
  });

  it("tells the highest and lowest totals, and who wins most, when one person holds them", () => {
    const list = facts(
      game([["Vos", 50], ["Jessi", 114]]),
      game([["Vos", 60], ["Jessi", 40]]),
      game([["Vos", 80], ["Jessi", 30]]),
    );
    expect(of(list, "highestScore")).toEqual([{ kind: "highestScore", who: person("Jessi"), points: 114 }]);
    expect(of(list, "lowestScore")).toEqual([{ kind: "lowestScore", who: person("Jessi"), points: 30 }]);
    expect(of(list, "mostWins")).toEqual([{ kind: "mostWins", who: me, wins: 2 }]);
    expect(of(list, "bestAverage")).toEqual([{ kind: "bestAverage", who: me, average: 63.3 }]);
  });

  it("names no record when it's shared", () => {
    const list = facts(game([["Vos", 80], ["Jessi", 40]]), game([["Vos", 40], ["Jessi", 80]]), game([["Vos", 60], ["Jessi", 60]]));
    expect(of(list, "highestScore")).toEqual([]);
    expect(of(list, "mostWins")).toEqual([]);
  });

  it("finds who never won at a table size", () => {
    const list = facts(
      game([["Vos", 60], ["Manuela", 50]]),
      game([["Vos", 60], ["Manuela", 50]]),
      game([["Vos", 60], ["Manuela", 50]]),
      game([["Manuela", 70], ["Vos", 60], ["Jessi", 50]]),
    );
    expect(of(list, "winlessAtSize")).toEqual([{ kind: "winlessAtSize", who: person("Manuela"), games: 3, size: 2 }]);
  });

  it("finds the group's most played leader someone never tried, and a favorite", () => {
    const list = facts(
      ...Array.from({ length: 5 }, (_, i) =>
        game([
          ["Vos", 60, i < 3 ? "captain" : "mystic"],
          ["Ezequiel", 50, "professor"],
          ["Jessi", 40, i < 2 ? "journalist" : "baroness"],
        ]),
      ),
    );
    // Ezequiel never played the Capitán (3 games) or the Baronesa (3): a tie, so neither. Vos never played the Profesor (5).
    expect(of(list, "neverLeader")).toContainEqual({ kind: "neverLeader", who: me, leader: "professor" });
    expect(of(list, "neverLeader").filter((f) => f.who.name === "Ezequiel")).toEqual([]);
    expect(of(list, "favoriteLeader")).toContainEqual({ kind: "favoriteLeader", who: person("Ezequiel"), leader: "professor", count: 5, games: 5 });
    expect(of(list, "favoriteLeader")).toContainEqual({ kind: "favoriteLeader", who: me, leader: "captain", count: 3, games: 5 });
  });

  it("tells which leader wins most often, and which never won", () => {
    const list = facts(
      ...Array.from({ length: 3 }, () => game([["Vos", 60, "captain"], ["Jessi", 40, "mystic"]])),
    );
    expect(of(list, "leaderBest")).toEqual([{ kind: "leaderBest", leader: "captain", wins: 3, games: 3 }]);
    expect(of(list, "leaderWinless")).toEqual([{ kind: "leaderWinless", leader: "mystic", games: 3 }]);
  });

  it("counts the longest run of wins, in the order the games were played", () => {
    const list = facts(
      game([["Vos", 60], ["Jessi", 40]]),
      game([["Vos", 60], ["Jessi", 40]]),
      game([["Vos", 30], ["Jessi", 40]]),
      game([["Vos", 60], ["Jessi", 40]]),
      game([["Vos", 60], ["Jessi", 40]]),
      game([["Vos", 60], ["Jessi", 40]]),
    );
    expect(of(list, "winStreak")).toEqual([{ kind: "winStreak", who: me, count: 3 }]);
  });

  it("tells who you play with most, and who always finishes ahead of whom", () => {
    const list = facts(
      game([["Iñaki", 70], ["Vos", 60], ["Jessi", 40]]),
      game([["Iñaki", 70], ["Vos", 60]]),
      game([["Vos", 60], ["Iñaki", 50]]),
      game([["Vos", 60], ["Jessi", 40]]),
    );
    expect(of(list, "mostPlayedWith")).toEqual([{ kind: "mostPlayedWith", who: person("Iñaki"), games: 3 }]);
    expect(of(list, "rivalry")).toEqual([]);

    const always = facts(...Array.from({ length: 3 }, () => game([["Jessi", 70], ["Vos", 60]])));
    expect(of(always, "rivalry")).toEqual([{ kind: "rivalry", winner: person("Jessi"), loser: me, games: 3 }]);
  });

  it("tells how the first seat does, once enough games have a turn order", () => {
    const seated = (first: Seat, second: Seat) => game([first, second], { seated: true });
    const four = [seated(["Vos", 60], ["Jessi", 40]), seated(["Jessi", 60], ["Vos", 40]), seated(["Vos", 30], ["Jessi", 40]), seated(["Vos", 60], ["Jessi", 40])];
    expect(of(facts(...four, game([["Vos", 60], ["Jessi", 40]])), "firstSeat")).toEqual([]);
    expect(of(facts(...four, seated(["Jessi", 30], ["Vos", 40])), "firstSeat")).toEqual([{ kind: "firstSeat", wins: 3, games: 5 }]);
  });

  it("tells the most played temple, the biggest and closest wins, and the longest game", () => {
    const list = facts(
      game([["Vos", 90], ["Jessi", 40]], { side: "snake", minutes: 95 }),
      game([["Jessi", 61], ["Vos", 60]], { side: "snake", minutes: 140 }),
      game([["Vos", 70], ["Jessi", 50]], { side: "snake" }),
      game([["Vos", 70], ["Jessi", 50]], { side: "bird" }),
    );
    expect(of(list, "topTemple")).toEqual([{ kind: "topTemple", temple: "snake", games: 3 }]);
    expect(of(list, "biggestWin")).toEqual([{ kind: "biggestWin", winner: me, loser: person("Jessi"), diff: 50 }]);
    expect(of(list, "closestGame")).toEqual([{ kind: "closestGame", winner: person("Jessi"), loser: me, diff: 1 }]);
    expect(of(list, "longestGame")).toEqual([{ kind: "longestGame", minutes: 140 }]);
  });
});
