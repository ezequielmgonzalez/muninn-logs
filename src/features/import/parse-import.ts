import { type ScoreEntries, tiedForFirst, total } from "@/features/matches/scoring";
import {
  ARNAK_LEADERS,
  ARNAK_SCORE_CATEGORIES,
  type ArnakBoardSide,
  type ArnakLeader,
  type ArnakScoreCategory,
} from "@/games/arnak";

import { parseCsv } from "./csv";

// Turns an imported CSV into games: one row per player per game, rows of the
// same game share its "partida" value. Checks everything the match form and
// log_match() would, and reports every problem at once by row or by game.
//
// The rows' order is never taken as the turn order: old score pads rarely
// list players in it. A game's turn order comes from its "turno" column, set
// on every one of its rows or on none (then it's unknown).

/** Keeps one import well under the Server Action body limit (1 MB). */
export const MAX_IMPORT_GAMES = 500;

/** Like the match form's new guests (players.name). */
const MAX_NAME_LENGTH = 50;

type Column =
  | "game"
  | "date"
  | "turn"
  | "player"
  | "leader"
  | ArnakScoreCategory
  | "total"
  | "tiebreak"
  | "board"
  | "duration";

/** Accepted headers, compared without case, accents, spaces or punctuation. */
const HEADERS: Record<Column, string[]> = {
  game: ["partida", "game", "match"],
  date: ["fecha", "date"],
  turn: ["turno", "orden", "ordendeturno", "ordendeturnos", "turn", "turnorder", "seat"],
  player: ["jugador", "jugadora", "nombre", "player", "name"],
  leader: ["lider", "leader"],
  research: ["investigacion", "research"],
  temple: ["templo", "templos", "temple", "temples"],
  idols: ["idolos", "idolo", "idols", "idol"],
  guardians: ["guardianes", "guardian", "guardians"],
  cards: ["cartas", "cards"],
  fear: ["miedo", "fear"],
  total: ["total"],
  tiebreak: ["desempate", "tiebreak", "tiebreaker"],
  board: ["tablero", "ladodeltablero", "board", "boardside"],
  duration: ["duracion", "minutos", "duration", "minutes"],
};

const REQUIRED: Column[] = ["game", "player", ...ARNAK_SCORE_CATEGORIES];

const YES = new Set(["x", "si", "s", "yes", "y", "true", "1"]);
const NO = new Set(["", "no", "n", "false", "0"]);
/** Board sides by their Spanish or English name (accents and a plural "s" ignored). */
const BOARD_SIDES: Record<string, ArnakBoardSide> = {
  pajaro: "bird",
  ave: "bird",
  bird: "bird",
  serpiente: "snake",
  snake: "snake",
  cascada: "waterfall",
  waterfall: "waterfall",
  arbol: "tree",
  tree: "tree",
  mono: "monkey",
  monkey: "monkey",
  lagarto: "lizard",
  lizard: "lizard",
};

export type ImportedPlayer = {
  name: string;
  leader: ArnakLeader | null;
  /** Fear as a count of fear cards, like the match form. */
  scores: ScoreEntries;
  wonTiebreak: boolean;
};

export type ImportedGame = {
  /** The "partida" value, e.g. "12". */
  label: string;
  playedOn: string | null;
  boardSide: ArnakBoardSide | null;
  durationMinutes: number | null;
  /** Whether every row had a "turno": then `players` is in turn order. */
  turnOrderKnown: boolean;
  /** In turn order when it's known; otherwise in the order of their rows. */
  players: ImportedPlayer[];
};

/** `row` is the spreadsheet row (the header is row 1); `column` the header as written. */
export type ImportIssue =
  | { code: "empty" }
  | { code: "missingColumns"; columns: string }
  | { code: "unknownColumns"; columns: string }
  | { code: "tooManyGames"; max: number }
  | { code: "missingGame"; row: number }
  | { code: "missingPlayer"; row: number }
  | { code: "nameTooLong"; row: number; max: number }
  | { code: "missingNumber"; row: number; column: string }
  | { code: "invalidNumber"; row: number; column: string; value: string }
  | { code: "unknownLeader"; row: number; value: string }
  | { code: "invalidDate"; row: number; value: string }
  | { code: "invalidBoard"; row: number; value: string }
  | { code: "invalidTiebreak"; row: number; value: string }
  | { code: "invalidTurn"; row: number; value: string }
  | { code: "totalMismatch"; row: number; written: number; computed: number }
  | { code: "playerCount"; game: string; count: number }
  | { code: "duplicatePlayer"; game: string; name: string }
  | { code: "duplicateLeader"; game: string; leader: ArnakLeader }
  | { code: "multipleTiebreaks"; game: string }
  | { code: "tiebreakNotTied"; game: string; name: string }
  | { code: "conflict"; game: string; column: string }
  | { code: "partialTurns"; game: string }
  | { code: "badTurns"; game: string; count: number };

export type ImportResult = { games: ImportedGame[]; issues: ImportIssue[] };

/** Lowercase, without accents or surrounding spaces. */
export function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** How a name is told apart, like import_matches(): trimmed, any case. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Leader names to slugs: the slugs themselves plus every translated label
 * (e.g. es "Cetrera", en "Falconer"), matched without case or accents.
 */
export function leaderLookup(labels: Record<ArnakLeader, string>[]): Map<string, ArnakLeader> {
  const lookup = new Map<string, ArnakLeader>();
  for (const slug of ARNAK_LEADERS) {
    lookup.set(slug, slug);
    for (const l of labels) lookup.set(fold(l[slug]), slug);
  }
  return lookup;
}

function findLeader(value: string, leaders: Map<string, ArnakLeader>): ArnakLeader | undefined {
  // "La Cetrera", "the Captain": articles are optional.
  return leaders.get(fold(value).replace(/^(el|la|los|las|the)\s+/, ""));
}

/** ISO (2025-03-01) or day first (1/3/2025, 01-03-25); undefined if not a real date. */
function parseDate(value: string): string | undefined {
  let parts: [number, number, number] | undefined;
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dayFirst = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/);
  if (iso) parts = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dayFirst) {
    const year = Number(dayFirst[3]);
    parts = [year < 100 ? 2000 + year : year, Number(dayFirst[2]), Number(dayFirst[1])];
  }
  if (!parts) return undefined;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return date.toISOString().slice(0, 10);
}

/** A whole number within [min, max], or undefined. */
function parseWhole(value: string, min: number, max: number): number | undefined {
  if (!/^-?\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

type GameDraft = ImportedGame & {
  rows: number[];
  /** Each player's "turno", in row order; null where it's empty. */
  turns: (number | null)[];
  /** Per-game values may sit on any of its rows, but must agree. */
  given: Partial<Record<"date" | "board" | "duration", string>>;
  conflicts: Set<string>;
  hasRowIssues: boolean;
};

export function parseImport(text: string, leaders: Map<string, ArnakLeader>): ImportResult {
  const records = parseCsv(text)
    .map((fields, index) => ({ fields: fields.map((f) => f.trim()), row: index + 1 }))
    .filter((r) => r.fields.some((f) => f !== ""));
  const [header, ...rows] = records;
  if (!header || rows.length === 0) return { games: [], issues: [{ code: "empty" }] };

  // Which column is which. Unknown headers are reported rather than ignored,
  // so a typo ("templ") doesn't silently drop a category.
  const columns = new Map<Column, number>();
  const headerText = new Map<Column, string>();
  const unknown: string[] = [];
  header.fields.forEach((text, index) => {
    if (text === "") return;
    const key = fold(text).replace(/[^a-z0-9]/g, "");
    const column = (Object.keys(HEADERS) as Column[]).find((c) => HEADERS[c].includes(key));
    if (column) {
      columns.set(column, index);
      headerText.set(column, text);
    } else unknown.push(text);
  });
  const missing = REQUIRED.filter((c) => !columns.has(c));
  const fileIssues: ImportIssue[] = [];
  if (missing.length > 0) fileIssues.push({ code: "missingColumns", columns: missing.map((c) => HEADERS[c][0]).join(", ") });
  if (unknown.length > 0) fileIssues.push({ code: "unknownColumns", columns: unknown.join(", ") });
  if (fileIssues.length > 0) return { games: [], issues: fileIssues };

  const issues: ImportIssue[] = [];
  const games = new Map<string, GameDraft>();
  let previousGame: string | undefined;

  for (const { fields, row } of rows) {
    const cell = (column: Column) => {
      const index = columns.get(column);
      return index === undefined ? "" : (fields[index] ?? "");
    };
    let rowHasIssues = false;
    const rowIssue = (issue: ImportIssue) => {
      issues.push(issue);
      rowHasIssues = true;
    };

    // A blank "partida" continues the game above: merged cells export that way.
    const label = cell("game") || previousGame;
    if (!label) {
      issues.push({ code: "missingGame", row });
      continue;
    }
    previousGame = label;
    let game = games.get(label);
    if (!game) {
      game = {
        label,
        playedOn: null,
        boardSide: null,
        durationMinutes: null,
        turnOrderKnown: false,
        players: [],
        rows: [],
        turns: [],
        given: {},
        conflicts: new Set(),
        hasRowIssues: false,
      };
      games.set(label, game);
    }
    game.rows.push(row);

    const name = cell("player").replace(/\s+/g, " ");
    if (!name) rowIssue({ code: "missingPlayer", row });
    else if (name.length > MAX_NAME_LENGTH) rowIssue({ code: "nameTooLong", row, max: MAX_NAME_LENGTH });

    const scores = {} as ScoreEntries;
    for (const category of ARNAK_SCORE_CATEGORIES) {
      const raw = cell(category);
      // Fear may be written as on the score pad (-2) or as a card count (2).
      const value = category === "fear" ? parseWhole(raw, -999, 999) : parseWhole(raw, 0, 999);
      if (value === undefined) {
        const column = headerText.get(category)!;
        rowIssue(raw === "" ? { code: "missingNumber", row, column } : { code: "invalidNumber", row, column, value: raw });
        scores[category] = 0;
      } else scores[category] = Math.abs(value);
    }

    const writtenTotal = cell("total");
    if (writtenTotal !== "") {
      const written = parseWhole(writtenTotal, -999, 9999);
      if (written === undefined) rowIssue({ code: "invalidNumber", row, column: headerText.get("total")!, value: writtenTotal });
      else if (!rowHasIssues && written !== total(scores)) {
        rowIssue({ code: "totalMismatch", row, written, computed: total(scores) });
      }
    }

    let leader: ArnakLeader | null = null;
    if (cell("leader") !== "") {
      const found = findLeader(cell("leader"), leaders);
      if (found) leader = found;
      else rowIssue({ code: "unknownLeader", row, value: cell("leader") });
    }

    let turn: number | null = null;
    if (cell("turn") !== "") {
      const parsed = parseWhole(cell("turn"), 1, 4);
      if (parsed === undefined) rowIssue({ code: "invalidTurn", row, value: cell("turn") });
      else turn = parsed;
    }

    const tiebreak = fold(cell("tiebreak"));
    const wonTiebreak = YES.has(tiebreak);
    if (!wonTiebreak && !NO.has(tiebreak)) rowIssue({ code: "invalidTiebreak", row, value: cell("tiebreak") });

    // Per-game values: parse, then check they agree with earlier rows.
    const perGame = (column: "date" | "board" | "duration", parse: (raw: string) => boolean) => {
      const raw = cell(column);
      if (raw === "") return;
      if (!parse(raw)) return;
      const previous = game.given[column];
      if (previous !== undefined && fold(previous) !== fold(raw) && !game.conflicts.has(column)) {
        game.conflicts.add(column);
        issues.push({ code: "conflict", game: label, column: headerText.get(column)! });
      }
      game.given[column] ??= raw;
    };
    perGame("date", (raw) => {
      const date = parseDate(raw);
      if (date === undefined) rowIssue({ code: "invalidDate", row, value: raw });
      else game.playedOn ??= date;
      return date !== undefined;
    });
    perGame("board", (raw) => {
      const side = BOARD_SIDES[fold(raw).replace(/s$/, "")];
      if (side === undefined) rowIssue({ code: "invalidBoard", row, value: raw });
      else game.boardSide ??= side;
      return side !== undefined;
    });
    perGame("duration", (raw) => {
      const minutes = parseWhole(raw, 1, 1440);
      if (minutes === undefined) rowIssue({ code: "invalidNumber", row, column: headerText.get("duration")!, value: raw });
      else game.durationMinutes ??= minutes;
      return minutes !== undefined;
    });

    game.hasRowIssues ||= rowHasIssues;
    if (name) {
      game.players.push({ name, leader, scores, wonTiebreak });
      game.turns.push(turn);
    }
  }

  // Whole-game checks, like the match form's.
  for (const game of games.values()) {
    const { label, turns } = game;

    // Turns: on every row or none, and then 1 to N without repeats.
    const given = turns.filter((t) => t !== null);
    if (given.length > 0 && !game.hasRowIssues) {
      if (given.length < turns.length) issues.push({ code: "partialTurns", game: label });
      else if ([...given].sort((a, b) => a - b).some((t, i) => t !== i + 1)) {
        issues.push({ code: "badTurns", game: label, count: turns.length });
      } else {
        game.players = game.players.map((p, i) => ({ p, turn: turns[i]! })).sort((a, b) => a.turn - b.turn).map(({ p }) => p);
        game.turnOrderKnown = true;
      }
    }

    const { players } = game;
    if (players.length < 2 || players.length > 4) issues.push({ code: "playerCount", game: label, count: players.length });

    const seen = new Set<string>();
    for (const p of players) {
      if (seen.has(nameKey(p.name))) issues.push({ code: "duplicatePlayer", game: label, name: p.name });
      seen.add(nameKey(p.name));
    }
    const leadersSeen = new Set<ArnakLeader>();
    for (const p of players) {
      if (p.leader && leadersSeen.has(p.leader)) issues.push({ code: "duplicateLeader", game: label, leader: p.leader });
      if (p.leader) leadersSeen.add(p.leader);
    }

    const tiebreakWinners = players.filter((p) => p.wonTiebreak);
    if (tiebreakWinners.length > 1) issues.push({ code: "multipleTiebreaks", game: label });
    else if (tiebreakWinners.length === 1 && !game.hasRowIssues) {
      const tied = tiedForFirst(players.map((p) => total(p.scores)));
      if (!tied.includes(players.indexOf(tiebreakWinners[0]))) {
        issues.push({ code: "tiebreakNotTied", game: label, name: tiebreakWinners[0].name });
      }
    }
  }

  if (games.size > MAX_IMPORT_GAMES) issues.push({ code: "tooManyGames", max: MAX_IMPORT_GAMES });

  return {
    games: [...games.values()].map(({ label, playedOn, boardSide, durationMinutes, turnOrderKnown, players }) => ({
      label,
      playedOn,
      boardSide,
      durationMinutes,
      turnOrderKnown,
      players,
    })),
    issues,
  };
}

/** Every distinct name across the games, spelled as it first appears. */
export function importedNames(games: ImportedGame[]): string[] {
  const names = new Map<string, string>();
  for (const game of games) for (const p of game.players) if (!names.has(nameKey(p.name))) names.set(nameKey(p.name), p.name);
  return [...names.values()];
}
