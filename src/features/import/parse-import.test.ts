import { describe, expect, it } from "vitest";

import { importedNames, leaderLookup, parseImport } from "./parse-import";

const leaders = leaderLookup([
  { captain: "Capitán", falconer: "Cetrera", baroness: "Baronesa", professor: "Profesor", explorer: "Exploradora", mystic: "Místico", mechanic: "Mecánica", journalist: "Periodista" },
  { captain: "Captain", falconer: "Falconer", baroness: "Baroness", professor: "Professor", explorer: "Explorer", mystic: "Mystic", mechanic: "Mechanic", journalist: "Journalist" },
]);

const HEADER = "partida;fecha;jugador;lider;investigacion;templo;idolos;guardianes;cartas;miedo";

function parse(...rows: string[]) {
  return parseImport([HEADER, ...rows].join("\n"), leaders);
}

describe("parseImport", () => {
  it("groups rows into games, in turn order", () => {
    const { games, issues } = parse(
      "1;01/03/2025;Ana;La Cetrera;10;8;6;4;12;2",
      "1;;Bob;;9;7;5;3;11;1",
      "2;;Ana;mystic;1;1;1;1;1;0",
      "2;;Jessi;Capitan;2;2;2;2;2;0",
    );
    expect(issues).toEqual([]);
    expect(games).toEqual([
      {
        label: "1",
        playedOn: "2025-03-01",
        boardSide: null,
        durationMinutes: null,
        players: [
          { name: "Ana", leader: "falconer", scores: { research: 10, temple: 8, idols: 6, guardians: 4, cards: 12, fear: 2 }, wonTiebreak: false },
          { name: "Bob", leader: null, scores: { research: 9, temple: 7, idols: 5, guardians: 3, cards: 11, fear: 1 }, wonTiebreak: false },
        ],
      },
      expect.objectContaining({ label: "2", playedOn: null, players: [expect.objectContaining({ leader: "mystic" }), expect.objectContaining({ leader: "captain" })] }),
    ]);
  });

  it("accepts English headers, commas, and optional columns", () => {
    const { games, issues } = parseImport(
      [
        "Game,Date,Player,Leader,Research,Temple,Idols,Guardians,Cards,Fear,Total,Tiebreak,Board,Duration",
        "7,2025-03-01,Ana,,5,0,0,0,0,-1,4,x,Snake,90",
        "7,,Bob,,4,0,0,0,0,0,4,,,",
      ].join("\r\n"),
      leaders,
    );
    expect(issues).toEqual([]);
    expect(games[0]).toMatchObject({ playedOn: "2025-03-01", boardSide: "snake", durationMinutes: 90 });
    expect(games[0].players[0]).toMatchObject({ scores: expect.objectContaining({ fear: 1 }), wonTiebreak: true });
  });

  it.each([
    ["Cascada", "waterfall"],
    ["árbol", "tree"],
    ["Monos", "monkey"],
    ["lizard", "lizard"],
  ])("reads the board side %s", (written, side) => {
    const { games, issues } = parseImport(
      `partida,jugador,investigacion,templo,idolos,guardianes,cartas,miedo,tablero\n1,Ana,1,0,0,0,0,0,${written}\n1,Bob,0,0,0,0,0,0,`,
      leaders,
    );
    expect(issues).toEqual([]);
    expect(games[0].boardSide).toBe(side);
  });

  it("continues the game above when the game cell is blank (merged cells)", () => {
    const { games } = parse("1;;Ana;;1;1;1;1;1;0", ";;Bob;;1;1;1;1;1;0", "2;;Ana;;1;1;1;1;1;0", ";;Bob;;1;1;1;1;1;0");
    expect(games.map((g) => g.players.length)).toEqual([2, 2]);
  });

  it("skips empty lines, like a spreadsheet's trailing ;;;", () => {
    const { games, issues } = parse("1;;Ana;;1;1;1;1;1;0", ";;;;;;;;;", "1;;Bob;;1;1;1;1;1;0", "");
    expect(issues).toEqual([]);
    expect(games).toHaveLength(1);
  });

  it("reports missing and unknown columns", () => {
    expect(parseImport("partida;jugador;templ\n1;Ana;3", leaders).issues).toEqual([
      { code: "missingColumns", columns: "investigacion, templo, idolos, guardianes, cartas, miedo" },
      { code: "unknownColumns", columns: "templ" },
    ]);
  });

  it("reports an empty file", () => {
    expect(parseImport(HEADER, leaders).issues).toEqual([{ code: "empty" }]);
  });

  it("reports bad cells by row", () => {
    const { issues } = parse(
      ";;Ana;;1;1;1;1;1;0",
      "1;31/02/2025;;Nadie;1;;x;1;-3;0",
    );
    expect(issues).toEqual([
      { code: "missingGame", row: 2 },
      { code: "missingPlayer", row: 3 },
      { code: "missingNumber", row: 3, column: "templo" },
      { code: "invalidNumber", row: 3, column: "idolos", value: "x" },
      { code: "invalidNumber", row: 3, column: "cartas", value: "-3" },
      { code: "unknownLeader", row: 3, value: "Nadie" },
      { code: "invalidDate", row: 3, value: "31/02/2025" },
      { code: "playerCount", game: "1", count: 0 },
    ]);
  });

  it("rejects names longer than a guest's name can be", () => {
    const { issues } = parse(`1;;${"x".repeat(51)};;1;1;1;1;1;0`, "1;;Bob;;1;1;1;1;1;0");
    expect(issues).toEqual([{ code: "nameTooLong", row: 2, max: 50 }]);
  });

  it("checks a written total against the categories", () => {
    const { issues } = parseImport(
      "partida;jugador;investigacion;templo;idolos;guardianes;cartas;miedo;total\n1;Ana;10;0;0;0;0;2;12\n1;Bob;1;0;0;0;0;0;1",
      leaders,
    );
    expect(issues).toEqual([{ code: "totalMismatch", row: 2, written: 12, computed: 8 }]);
  });

  it("checks each game like the match form", () => {
    const { issues } = parseImport(
      [
        "partida;jugador;lider;investigacion;templo;idolos;guardianes;cartas;miedo;desempate;tablero;fecha",
        "1;Ana;mystic;1;0;0;0;0;0;x;pajaro;2025-01-01",
        "1;ana;mystic;1;0;0;0;0;0;si;serpiente;2025-01-02",
        "2;Ana;;5;0;0;0;0;0;x;;",
        "2;Bob;;1;0;0;0;0;0;;;",
        "3;Ana;;1;0;0;0;0;0;quizás;;",
        "3;Bob;;1;0;0;0;0;0;;;",
      ].join("\n"),
      leaders,
    );
    expect(issues).toEqual([
      { code: "conflict", game: "1", column: "fecha" },
      { code: "conflict", game: "1", column: "tablero" },
      { code: "invalidTiebreak", row: 6, value: "quizás" },
      { code: "duplicatePlayer", game: "1", name: "ana" },
      { code: "duplicateLeader", game: "1", leader: "mystic" },
      { code: "multipleTiebreaks", game: "1" },
      { code: "tiebreakNotTied", game: "2", name: "Ana" },
    ]);
  });

  it("limits the number of games", () => {
    const rows = Array.from({ length: 501 }, (_, i) => [`${i};;Ana;;1;1;1;1;1;0`, `${i};;Bob;;1;1;1;1;1;0`]).flat();
    expect(parse(...rows).issues).toEqual([{ code: "tooManyGames", max: 500 }]);
  });
});

describe("importedNames", () => {
  it("lists each name once, as first spelled", () => {
    const { games } = parse("1;;Ana;;1;1;1;1;1;0", "1;;Jessi;;1;1;1;1;1;0", "2;;jessi;;1;1;1;1;1;0", "2;;Bob  Ross;;1;1;1;1;1;0");
    expect(importedNames(games)).toEqual(["Ana", "Jessi", "Bob Ross"]);
  });
});
