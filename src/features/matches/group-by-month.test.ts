import { describe, expect, it } from "vitest";

import { groupByMonth, spreadOf } from "./group-by-month";
import type { MatchSummary } from "./queries";

const match = (id: string, playedOn: string | null) => ({ id, playedOn }) as MatchSummary;

describe("groupByMonth", () => {
  it("groups consecutive games by month, undated last", () => {
    const groups = groupByMonth([
      match("a", "2026-09-29"),
      match("b", "2026-09-01"),
      match("c", "2026-08-15"),
      match("d", null),
      match("e", null),
    ]);
    expect(groups.map((g) => [g.month, g.matches.map((m) => m.id)])).toEqual([
      ["2026-09", ["a", "b"]],
      ["2026-08", ["c"]],
      [null, ["d", "e"]],
    ]);
  });
});

describe("spreadOf", () => {
  const groups = groupByMonth(["2026-09-01", "2026-08-01", "2026-07-01"].map((d, i) => match(String(i), d)));

  it("puts two months on each spread, the newest first", () => {
    expect(spreadOf(groups, 0)).toMatchObject({ current: 0, spreads: 2, left: { month: "2026-09" }, right: { month: "2026-08" } });
    expect(spreadOf(groups, 1)).toMatchObject({ current: 1, left: { month: "2026-07" }, right: undefined });
  });

  it("clamps a spread out of range", () => {
    expect(spreadOf(groups, 9).current).toBe(1);
    expect(spreadOf(groups, -3).current).toBe(0);
    expect(spreadOf([], 0)).toMatchObject({ current: 0, spreads: 1, left: undefined });
  });
});
