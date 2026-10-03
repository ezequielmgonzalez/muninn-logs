import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isEnabled } from "./flags";

afterEach(() => vi.unstubAllEnvs());

describe("isEnabled", () => {
  it("is off unless the variable says exactly true", () => {
    expect(isEnabled("compareHeadToHead")).toBe(false);
    for (const value of ["", "1", "TRUE", "yes", "false"]) {
      vi.stubEnv("FEATURE_COMPARE_HEAD_TO_HEAD", value);
      expect(isEnabled("compareHeadToHead")).toBe(false);
    }
  });

  it("is on with true, read on every call", () => {
    vi.stubEnv("FEATURE_COMPARE_HEAD_TO_HEAD", "true");
    expect(isEnabled("compareHeadToHead")).toBe(true);
  });
});
