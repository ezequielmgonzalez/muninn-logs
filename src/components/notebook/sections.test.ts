import { describe, expect, it } from "vitest";

import { hasGameSwitch, hasPlayerFilter, hasSaveBar, sectionOf } from "./sections";

describe("sectionOf", () => {
  it.each([
    ["/", "home"],
    ["/matches", "matches"],
    ["/matches/2b4c", "matches"],
    ["/profile", "stats"],
    ["/rankings", "rankings"],
    ["/friends", "friends"],
    ["/friends/beto", "friends"],
    ["/compare", "friends"],
    ["/guests", "friends"],
    ["/guests/9f1c", "friends"],
  ])("marks %s as %s", (path, section) => {
    expect(sectionOf(path)).toBe(section);
  });

  it.each(["/matches/new", "/matches/2b4c/edit", "/profile/edit", "/account/delete", "/admin/guests", "/admin/import"])(
    "marks no section on %s",
    (path) => {
      expect(sectionOf(path)).toBeUndefined();
    },
  );
});

describe("hasPlayerFilter", () => {
  it("is on the screens with stats or lists of games", () => {
    for (const path of ["/", "/matches", "/profile", "/compare", "/friends/beto", "/guests/9f1c", "/rankings"]) expect(hasPlayerFilter(path)).toBe(true);
    for (const path of ["/friends", "/matches/new", "/matches/2b4c", "/profile/edit", "/guests"]) expect(hasPlayerFilter(path)).toBe(false);
  });
});

describe("hasGameSwitch", () => {
  it("is on the screens about one game, the new match's form included", () => {
    for (const path of ["/", "/matches", "/matches/new", "/profile", "/friends/beto", "/guests/9f1c", "/rankings"]) expect(hasGameSwitch(path)).toBe(true);
    // Comparar is Arnak's only; a match (or its edit form) keeps its own game.
    for (const path of ["/compare", "/matches/2b4c", "/matches/2b4c/edit", "/friends", "/profile/edit"]) expect(hasGameSwitch(path)).toBe(false);
  });
});

describe("hasSaveBar", () => {
  it("is the match form, new or edited", () => {
    expect(hasSaveBar("/matches/new")).toBe(true);
    expect(hasSaveBar("/matches/2b4c/edit")).toBe(true);
    expect(hasSaveBar("/matches/2b4c")).toBe(false);
  });
});
