import { describe, expect, it } from "vitest";

import { logMatchSchema, toLogMatchArgs } from "./schema";

const zero = { research: 0, temple: 0, idols: 0, guardians: 0, cards: 0, fear: 0 };
const ana = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";

function match(players: unknown[], extra: Record<string, unknown> = {}) {
  return { playedOn: "2026-09-20", boardSide: null, durationMinutes: null, players, ...extra };
}

function player(extra: Record<string, unknown>) {
  return { leader: null, scores: zero, wonTiebreak: false, ...extra };
}

describe("logMatchSchema", () => {
  it("accepts existing players and new guests", () => {
    const result = logMatchSchema.safeParse(
      match([player({ playerId: ana, leader: "captain" }), player({ newGuestName: " Jessi " })]),
    );
    expect(result.success).toBe(true);
    expect(result.data?.players[1].newGuestName).toBe("Jessi");
  });

  it.each(["waterfall", "tree", "monkey", "lizard"])("accepts the %s board side", (side) => {
    expect(logMatchSchema.safeParse(match([player({ playerId: ana }), player({ playerId: bob })], { boardSide: side })).success).toBe(true);
  });

  it("rejects an unknown board side", () => {
    expect(logMatchSchema.safeParse(match([player({ playerId: ana }), player({ playerId: bob })], { boardSide: "volcano" })).success).toBe(false);
  });

  it("accepts a game without a date", () => {
    expect(logMatchSchema.safeParse(match([player({ playerId: ana }), player({ playerId: bob })], { playedOn: null })).success).toBe(true);
  });

  it.each([
    ["one player", match([player({ playerId: ana })])],
    ["five players", match(Array.from({ length: 5 }, (_, i) => player({ newGuestName: `P${i}` })))],
    ["the same player twice", match([player({ playerId: ana }), player({ playerId: ana })])],
    [
      "the same leader twice",
      match([player({ playerId: ana, leader: "mystic" }), player({ playerId: bob, leader: "mystic" })]),
    ],
    [
      "two tiebreak winners",
      match([player({ playerId: ana, wonTiebreak: true }), player({ playerId: bob, wonTiebreak: true })]),
    ],
    [
      "a player who is both existing and new",
      match([player({ playerId: ana, newGuestName: "Ana" }), player({ playerId: bob })]),
    ],
    ["a negative score", match([player({ playerId: ana, scores: { ...zero, cards: -1 } }), player({ playerId: bob })])],
    ["an unknown leader", match([player({ playerId: ana, leader: "wizard" }), player({ playerId: bob })])],
    ["a bad date", match([player({ playerId: ana }), player({ playerId: bob })], { playedOn: "20/09/2026" })],
  ])("rejects %s", (_case, input) => {
    expect(logMatchSchema.safeParse(input).success).toBe(false);
  });
});

describe("toLogMatchArgs", () => {
  it("builds log_match() arguments, storing fear as negative points", () => {
    const input = logMatchSchema.parse(
      match(
        [
          player({ playerId: ana, leader: "captain", wonTiebreak: true, scores: { ...zero, cards: 12, fear: 3 } }),
          player({ newGuestName: "Jessi" }),
        ],
        { boardSide: "snake", durationMinutes: 90 },
      ),
    );

    expect(toLogMatchArgs(input)).toEqual({
      game_slug: "arnak",
      played_on: "2026-09-20",
      duration_minutes: 90,
      setup: { board_side: "snake" },
      players: [
        {
          player_id: ana,
          character: "captain",
          won_tiebreak: true,
          scores: { ...zero, cards: 12, fear: -3 },
        },
        { new_guest_name: "Jessi", character: null, won_tiebreak: false, scores: zero },
      ],
    });
  });

  it("sends no setup when the board side wasn't recorded", () => {
    const input = logMatchSchema.parse(match([player({ playerId: ana }), player({ playerId: bob })]));
    expect(toLogMatchArgs(input).setup).toEqual({});
    expect(toLogMatchArgs(input).duration_minutes).toBeUndefined();
  });
});
