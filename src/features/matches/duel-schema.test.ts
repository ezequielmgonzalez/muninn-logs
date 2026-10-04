import { describe, expect, it } from "vitest";

import { type LogDuelInput, logDuelSchema, toLogDuelArgs } from "./duel-schema";

const ana = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const duel: LogDuelInput = {
  playedOn: "2026-10-04",
  durationMinutes: 40,
  players: [
    { playerId: ana, side: "sauron" },
    { newGuestName: "Jessi", side: "fellowship" },
  ],
  result: "fellowship",
  victory: "ring",
};

describe("a LOTR duel", () => {
  it("is two players, one per side, with who won and how", () => {
    expect(logDuelSchema.safeParse(duel).success).toBe(true);
    expect(logDuelSchema.safeParse({ ...duel, players: [duel.players[0]] }).success).toBe(false);
    expect(logDuelSchema.safeParse({ ...duel, players: [...duel.players, { playerId: bob, side: "sauron" }] }).success).toBe(false);
  });

  it("has one player per side, never the same player twice", () => {
    const both = (side: "sauron" | "fellowship") => duel.players.map((p) => ({ ...p, side }));
    expect(logDuelSchema.safeParse({ ...duel, players: both("sauron") }).success).toBe(false);
    const twice = [
      { playerId: ana, side: "sauron" },
      { playerId: ana, side: "fellowship" },
    ];
    expect(logDuelSchema.safeParse({ ...duel, players: twice }).success).toBe(false);
  });

  it("says how a side won, and nothing for a draw", () => {
    expect(logDuelSchema.safeParse({ ...duel, victory: null }).success).toBe(false);
    expect(logDuelSchema.safeParse({ ...duel, result: "draw", victory: "ring" }).success).toBe(false);
    expect(logDuelSchema.safeParse({ ...duel, result: "draw", victory: null }).success).toBe(true);
  });

  it("becomes log_match()'s arguments: sides as characters, the result in the setup, no points or turns", () => {
    expect(toLogDuelArgs(duel)).toEqual({
      game_slug: "lotr-duel",
      played_on: "2026-10-04",
      duration_minutes: 40,
      setup: { result: "fellowship", victory: "ring" },
      turn_order_known: false,
      players: [
        { player_id: ana, character: "sauron", scores: {} },
        { new_guest_name: "Jessi", character: "fellowship", scores: {} },
      ],
    });
    expect(toLogDuelArgs({ ...duel, result: "draw", victory: null, durationMinutes: null }).setup).toEqual({ result: "draw" });
  });
});
