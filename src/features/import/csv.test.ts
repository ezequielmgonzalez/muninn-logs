import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv } from "./csv";

describe("detectDelimiter", () => {
  it.each([
    ["partida,jugador,templo", ","],
    ["partida;jugador;templo", ";"],
    ["partida\tjugador\ttemplo", "\t"],
    ['"a;b",c,d\n1;2;3;4;5', ","],
  ])("%j uses %j", (text, delimiter) => {
    expect(detectDelimiter(text)).toBe(delimiter);
  });
});

describe("parseCsv", () => {
  it("reads quoted fields, escaped quotes and newlines inside quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n1,"two\nlines",3')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "two\nlines", "3"],
    ]);
  });

  it("handles CRLF, a BOM and a trailing newline", () => {
    expect(parseCsv("﻿a;b\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a,,c\n,,")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ]);
  });
});
