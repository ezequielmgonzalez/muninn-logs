import { describe, expect, it } from "vitest";

import {
  codeSchema,
  displayNameSchema,
  emailSchema,
  usernameSchema,
} from "./schemas";

describe("emailSchema", () => {
  it("normalizes case and surrounding spaces", () => {
    expect(emailSchema.parse("  Ana@Example.COM ")).toBe("ana@example.com");
  });

  it("rejects non-emails", () => {
    expect(emailSchema.safeParse("ana").success).toBe(false);
  });
});

describe("codeSchema", () => {
  it.each(["123456", " 123456 "])("accepts %j", (code) => {
    expect(codeSchema.safeParse(code).success).toBe(true);
  });

  it.each(["12345", "1234567", "12345a"])("rejects %j", (code) => {
    expect(codeSchema.safeParse(code).success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it("lowercases and trims", () => {
    expect(usernameSchema.parse("  Ana_92 ")).toBe("ana_92");
  });

  it.each(["ab", "a".repeat(21), "ana lopez", "ana-lopez", "ñandú"])(
    "rejects %j",
    (username) => {
      expect(usernameSchema.safeParse(username).success).toBe(false);
    },
  );
});

describe("displayNameSchema", () => {
  it("trims", () => {
    expect(displayNameSchema.parse("  Ana ")).toBe("Ana");
  });

  it.each(["", "   ", "a".repeat(51)])("rejects %j", (name) => {
    expect(displayNameSchema.safeParse(name).success).toBe(false);
  });
});
