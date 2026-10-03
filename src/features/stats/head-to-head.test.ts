import { describe, expect, it } from "vitest";

import { ARNAK_SCORE_CATEGORIES, type ArnakScoreCategory } from "@/games/arnak";

import { advantage, duel, type Finish, wholeTable } from "./head-to-head";
import type { ComparableStats } from "./queries";

const finish = (match_id: string, player_id: string, rank: number): Finish => ({
  match_id,
  player_id,
  rank,
  is_winner: rank === 1,
});

const finishes = [
  // m1: me 1st, ana 2nd. m2: ana 1st, me 3rd, bo 2nd. m3: me and ana tie for 2nd. m4: bo and me only.
  finish("m1", "me", 1),
  finish("m1", "ana", 2),
  finish("m2", "ana", 1),
  finish("m2", "bo", 2),
  finish("m2", "me", 3),
  finish("m3", "x", 1),
  finish("m3", "me", 2),
  finish("m3", "ana", 2),
  finish("m4", "bo", 1),
  finish("m4", "me", 2),
];

describe("duel", () => {
  it("counts who finished higher in the matches you both played; a tie counts for neither", () => {
    expect(duel(finishes, "me", "ana")).toEqual({ together: 3, mine: 1, theirs: 1 });
    expect(duel(finishes, "me", "bo")).toEqual({ together: 2, mine: 0, theirs: 2 });
  });

  it("is empty when you never played together", () => {
    expect(duel(finishes, "me", "nobody")).toEqual({ together: 0, mine: 0, theirs: 0 });
  });
});

describe("wholeTable", () => {
  it("counts the matches where all of you played, and each one's wins there", () => {
    expect(wholeTable(finishes, ["me", "ana", "bo"])).toEqual({ matches: 1, wins: [0, 1, 0] });
  });

  it("finds none when you never all sat together", () => {
    expect(wholeTable(finishes, ["me", "ana", "nobody"]).matches).toBe(0);
  });
});

function stats(averages: Partial<Record<ArnakScoreCategory, number | null>>): ComparableStats {
  return {
    games: 4,
    wins: 1,
    avg_points: 50,
    avg_place: 2,
    categories: ARNAK_SCORE_CATEGORIES.map((slug) => ({ slug, average: averages[slug] ?? 10 })),
  };
}

describe("advantage", () => {
  it("names where you lead most and where they lead most", () => {
    const note = advantage(stats({ idols: 14.2, research: 22.4 }), stats({ idols: 11.9, research: 24.1 }));
    expect(note).toEqual({ kind: "edge", ahead: { slug: "idols", diff: 2.3 }, behind: { slug: "research", diff: 1.7 } });
  });

  it("reads Miedo the same way: the less negative is better", () => {
    const note = advantage(stats({ fear: -1.2 }), stats({ fear: -3 }));
    expect(note).toEqual({ kind: "edge", ahead: { slug: "fear", diff: 1.8 }, behind: undefined });
    expect(advantage(stats({ fear: -3 }), stats({ fear: -1.2 }))).toEqual({
      kind: "edge",
      ahead: undefined,
      behind: { slug: "fear", diff: 1.8 },
    });
  });

  it("is even when nothing differs at one decimal", () => {
    expect(advantage(stats({}), stats({ cards: 10.04 }))).toEqual({ kind: "even" });
  });

  it("has nothing to say without averages (no games)", () => {
    const none = { ...stats({}), categories: ARNAK_SCORE_CATEGORIES.map((slug) => ({ slug, average: null })) };
    expect(advantage(none, stats({}))).toBeNull();
  });
});
