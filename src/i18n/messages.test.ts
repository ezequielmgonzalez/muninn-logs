import { describe, expect, it } from "vitest";

import en from "./messages/en.json";
import es from "./messages/es.json";

// Flattens {"A": {"b": "x"}} into ["A.b"] so nested keys can be compared.
function keyPaths(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? keyPaths(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("messages", () => {
  it("en has exactly the same keys as es", () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(es).sort());
  });

  it("has no empty translations", () => {
    for (const messages of [es, en]) {
      const flat = keyPaths(messages).map((path) =>
        path.split(".").reduce<unknown>(
          (node, key) => (node as Record<string, unknown>)[key],
          messages,
        ),
      );
      expect(flat.every((value) => value !== "")).toBe(true);
    }
  });
});
