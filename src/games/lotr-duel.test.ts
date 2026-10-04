import { describe, expect, it } from "vitest";

import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

import { LOTR_SIDE_STYLES, LOTR_SIDES, LOTR_VICTORIES, LOTR_VICTORY_TONES } from "./lotr-duel";

describe.each([
  ["es", es],
  ["en", en],
])("LOTR Duel labels (%s)", (_locale, messages) => {
  const duel = messages.Games["lotr-duel"];

  it("has a label for every side, long and short", () => {
    expect(Object.keys(duel.sides).sort()).toEqual([...LOTR_SIDES].sort());
    expect(Object.keys(duel.sidesShort).sort()).toEqual([...LOTR_SIDES].sort());
  });

  it("has a label for every victory", () => {
    expect(Object.keys(duel.victories).sort()).toEqual([...LOTR_VICTORIES].sort());
  });
});

describe("LOTR Duel colors", () => {
  it("tells the sides apart, and the victories apart", () => {
    expect(new Set(LOTR_SIDES.map((side) => LOTR_SIDE_STYLES[side].tone)).size).toBe(LOTR_SIDES.length);
    expect(new Set(LOTR_VICTORIES.map((v) => LOTR_VICTORY_TONES[v])).size).toBe(LOTR_VICTORIES.length);
  });
});
