import { describe, expect, it } from "vitest";

import { logMatchSchema } from "@/features/matches/schema";

import type { ImportedGame } from "./parse-import";
import { NEW_GUEST, suggestChoices, toMatchInputs } from "./to-matches";

const ana = "11111111-1111-4111-8111-111111111111";
const jose = "22222222-2222-4222-8222-222222222222";
const addable = [
  { id: ana, name: "Ana", is_guest: false, is_me: true, owner_name: null },
  { id: jose, name: "José", is_guest: true, is_me: false, owner_name: "Ana" },
];
const zero = { research: 0, temple: 0, idols: 0, guardians: 0, cards: 0, fear: 0 };

function game(label: string, ...names: string[]): ImportedGame {
  return {
    label,
    playedOn: null,
    boardSide: null,
    durationMinutes: null,
    players: names.map((name) => ({ name, leader: null, scores: zero, wonTiebreak: false })),
  };
}

describe("suggestChoices", () => {
  it("matches names ignoring case and accents, else a new guest", () => {
    expect(suggestChoices(["ana", "Jose", "Jessi"], addable)).toEqual({ ana, jose, jessi: NEW_GUEST });
  });
});

describe("toMatchInputs", () => {
  it("builds what the match form would submit", () => {
    const { matches, issues } = toMatchInputs([game("1", "Ana", "Jessi")], { ana, jessi: NEW_GUEST });
    expect(issues).toEqual([]);
    expect(matches[0].players.map((p) => p.playerId ?? p.newGuestName)).toEqual([ana, "Jessi"]);
    expect(logMatchSchema.safeParse(matches[0]).success).toBe(true);
  });

  it("reports two names pointing to the same player in one game", () => {
    const { issues } = toMatchInputs([game("4", "Ana", "Anita")], { ana, anita: ana });
    expect(issues).toEqual([{ game: "4", playerId: ana }]);
  });
});
