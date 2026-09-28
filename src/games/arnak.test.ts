import { describe, expect, it } from "vitest";

import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

import { ARNAK_LEADER_STYLES, ARNAK_LEADERS, ARNAK_SCORE_CATEGORIES } from "./arnak";

describe.each([
  ["es", es],
  ["en", en],
])("Arnak labels (%s)", (_locale, messages) => {
  const arnak = messages.Games.arnak;

  it("has a label for every leader", () => {
    expect(Object.keys(arnak.leaders).sort()).toEqual([...ARNAK_LEADERS].sort());
  });

  it("has a label for every scoring category", () => {
    expect(Object.keys(arnak.scoreCategories).sort()).toEqual(
      [...ARNAK_SCORE_CATEGORIES].sort(),
    );
  });
});

describe("Arnak leader styles", () => {
  it("gives every leader a distinct color, so a color always means one leader", () => {
    const tones = ARNAK_LEADERS.map((leader) => ARNAK_LEADER_STYLES[leader].tone);
    expect(new Set(tones).size).toBe(ARNAK_LEADERS.length);
  });

  it("gives every leader a distinct emoji", () => {
    const emojis = ARNAK_LEADERS.map((leader) => ARNAK_LEADER_STYLES[leader].emoji);
    expect(new Set(emojis).size).toBe(ARNAK_LEADERS.length);
  });
});
