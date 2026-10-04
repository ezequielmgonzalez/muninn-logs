import type { MatchPlayer, MatchSummary } from "@/features/matches/queries";
import { ARNAK_LEADERS, type ArnakBoardSide, type ArnakLeader } from "@/games/arnak";

// "¿Sabías que…?": little facts about the games the user can see (the ones
// they logged or played), for the crow to tell. Each one is true of those
// games as they are: a "most" or a record only when nobody shares it, a
// pattern only after enough games to mean something. The words live in the
// messages (Facts.<kind>); here, only who and how many.

export type Person = { name: string; isMe: boolean };

export type Fact =
  | { kind: "highestScore"; who: Person; points: number }
  | { kind: "lowestScore"; who: Person; points: number }
  | { kind: "mostWins"; who: Person; wins: number }
  | { kind: "bestAverage"; who: Person; average: number }
  | { kind: "winlessAtSize"; who: Person; games: number; size: number }
  | { kind: "neverLeader"; who: Person; leader: ArnakLeader }
  | { kind: "favoriteLeader"; who: Person; leader: ArnakLeader; count: number; games: number }
  | { kind: "leaderBest"; leader: ArnakLeader; wins: number; games: number }
  | { kind: "leaderWinless"; leader: ArnakLeader; games: number }
  | { kind: "winStreak"; who: Person; count: number }
  | { kind: "mostPlayedWith"; who: Person; games: number }
  | { kind: "rivalry"; winner: Person; loser: Person; games: number }
  | { kind: "firstSeat"; wins: number; games: number }
  | { kind: "topTemple"; temple: ArnakBoardSide; games: number }
  | { kind: "biggestWin"; winner: Person; loser: Person; diff: number }
  | { kind: "closestGame"; winner: Person; loser: Person; diff: number }
  | { kind: "longestGame"; minutes: number };

/** Below these, a pattern is a coincidence: no fact. */
const MIN = {
  /** Games anyone needs before facts about them ("promedio", "nunca jugó con…"). */
  games: 3,
  /** Games with leaders recorded before "nunca jugó con…". */
  leaderGames: 5,
  /** Wins in a row worth telling. */
  streak: 3,
  /** Games with a known turn order before "quien empieza primero…". */
  seatGames: 5,
};

type Entry = { match: MatchSummary; player: MatchPlayer };

/** Every fact the games support, in no particular order (the crow shuffles them). */
export function findFacts(matches: readonly MatchSummary[]): Fact[] {
  // Oldest first, for streaks: the list comes newest first.
  const played = [...matches].reverse().filter((m) => m.players.length > 1);
  const people = new Map<string, { person: Person; entries: Entry[] }>();
  for (const match of played) {
    for (const player of match.players) {
      const known = people.get(player.playerId) ?? { person: { name: player.name, isMe: player.isMe }, entries: [] };
      known.entries.push({ match, player });
      people.set(player.playerId, known);
    }
  }
  const everyone = [...people.values()];
  const facts: Fact[] = [];

  if (played.length < MIN.games) return facts;

  // Records: the highest and lowest totals, when one person holds them.
  const entries = played.flatMap((match) => match.players.map((player) => ({ match, player })));
  const totals = (p: (typeof everyone)[number]) => p.entries.map((e) => e.player.total);
  const highest = only(everyone, (p) => Math.max(...totals(p)));
  if (highest) facts.push({ kind: "highestScore", who: highest.person, points: Math.max(...totals(highest)) });
  const lowest = only(everyone, (p) => -Math.min(...totals(p)));
  if (lowest) facts.push({ kind: "lowestScore", who: lowest.person, points: Math.min(...totals(lowest)) });

  // People: wins, averages, losing runs at a table size, leaders, streaks.
  const wins = (list: Entry[]) => list.filter((e) => e.player.isWinner).length;
  const mostWins = only(everyone, (p) => wins(p.entries));
  if (mostWins && wins(mostWins.entries) > 1) facts.push({ kind: "mostWins", who: mostWins.person, wins: wins(mostWins.entries) });

  const regulars = everyone.filter((p) => p.entries.length >= MIN.games);
  const average = (p: (typeof everyone)[number]) => p.entries.reduce((sum, e) => sum + e.player.total, 0) / p.entries.length;
  const bestAverage = only(regulars, average);
  if (bestAverage) facts.push({ kind: "bestAverage", who: bestAverage.person, average: Math.round(average(bestAverage) * 10) / 10 });

  // How often each leader was played, to name the one someone never tried.
  const leaderGames = new Map<ArnakLeader, Entry[]>();
  for (const entry of entries) {
    if (entry.player.leader) leaderGames.set(entry.player.leader, [...(leaderGames.get(entry.player.leader) ?? []), entry]);
  }

  for (const { person, entries: own } of everyone) {
    for (const size of new Set(own.map((e) => e.match.players.length))) {
      const atSize = own.filter((e) => e.match.players.length === size);
      if (atSize.length >= MIN.games && wins(atSize) === 0) facts.push({ kind: "winlessAtSize", who: person, games: atSize.length, size });
    }

    const withLeader = own.filter((e) => e.player.leader);
    const used = counts(withLeader.map((e) => e.player.leader!));
    if (withLeader.length >= MIN.leaderGames) {
      // The group's most played leader this person never tried.
      const never = ARNAK_LEADERS.filter((l) => !used.has(l) && leaderGames.has(l));
      const popular = only(never, (l) => leaderGames.get(l)!.length);
      if (popular) facts.push({ kind: "neverLeader", who: person, leader: popular });
    }
    const favorite = only([...used.keys()], (l) => used.get(l)!);
    if (favorite && withLeader.length >= MIN.games + 1 && used.get(favorite)! >= MIN.games && used.get(favorite)! * 5 >= withLeader.length * 2) {
      facts.push({ kind: "favoriteLeader", who: person, leader: favorite, count: used.get(favorite)!, games: own.length });
    }

    let streak = 0;
    let longest = 0;
    for (const e of own) {
      streak = e.player.isWinner ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }
    if (longest >= MIN.streak) facts.push({ kind: "winStreak", who: person, count: longest });
  }

  // Leaders: the one that wins most often, and any that never won.
  const leaders = [...leaderGames].filter(([, list]) => list.length >= MIN.games);
  const best = only(leaders, ([, list]) => wins(list) / list.length);
  if (best && wins(best[1]) > 0) facts.push({ kind: "leaderBest", leader: best[0], wins: wins(best[1]), games: best[1].length });
  for (const [leader, list] of leaders) {
    if (wins(list) === 0) facts.push({ kind: "leaderWinless", leader, games: list.length });
  }

  // Pairs: who you play with most, and who always beats whom.
  const me = everyone.find((p) => p.person.isMe);
  if (me) {
    const together = new Map<string, number>();
    for (const e of me.entries) {
      for (const other of e.match.players) {
        if (!other.isMe) together.set(other.playerId, (together.get(other.playerId) ?? 0) + 1);
      }
    }
    const partner = only([...together.keys()], (id) => together.get(id)!);
    if (partner && together.get(partner)! >= MIN.games) {
      facts.push({ kind: "mostPlayedWith", who: people.get(partner)!.person, games: together.get(partner)! });
    }
  }
  const pairs = new Map<string, { a: MatchPlayer; b: MatchPlayer; aAhead: number; bAhead: number; games: number }>();
  for (const match of played) {
    for (const a of match.players) {
      for (const b of match.players) {
        if (a.playerId >= b.playerId) continue;
        const pair = pairs.get(`${a.playerId}:${b.playerId}`) ?? { a, b, aAhead: 0, bAhead: 0, games: 0 };
        pair.games += 1;
        if (a.rank < b.rank) pair.aAhead += 1;
        if (b.rank < a.rank) pair.bAhead += 1;
        pairs.set(`${a.playerId}:${b.playerId}`, pair);
      }
    }
  }
  for (const { a, b, aAhead, bAhead, games } of pairs.values()) {
    if (games < MIN.games) continue;
    if (aAhead === games) facts.push({ kind: "rivalry", winner: personOf(a), loser: personOf(b), games });
    if (bAhead === games) facts.push({ kind: "rivalry", winner: personOf(b), loser: personOf(a), games });
  }

  // Games: the first seat, the temples, margins, length.
  const seated = played.filter((m) => m.turnOrderKnown);
  if (seated.length >= MIN.seatGames) {
    const firstWins = seated.filter((m) => m.players.some((p) => p.turnOrder === 1 && p.isWinner)).length;
    facts.push({ kind: "firstSeat", wins: firstWins, games: seated.length });
  }

  const temples = counts(played.flatMap((m) => (m.boardSide ? [m.boardSide] : [])));
  const topTemple = only([...temples.keys()], (t) => temples.get(t)!);
  if (topTemple && temples.get(topTemple)! >= MIN.games) facts.push({ kind: "topTemple", temple: topTemple, games: temples.get(topTemple)! });

  // The winner against the runner-up (players come ranked); a shared first place has no margin.
  const margins = played.flatMap((m) => {
    const [first, second] = m.players;
    return first.rank < second.rank ? [{ winner: first, loser: second, diff: first.total - second.total }] : [];
  });
  const biggest = only(margins, (m) => m.diff);
  if (biggest && biggest.diff > 0) facts.push({ kind: "biggestWin", winner: personOf(biggest.winner), loser: personOf(biggest.loser), diff: biggest.diff });
  const closest = only(margins, (m) => -m.diff);
  if (closest && closest !== biggest) facts.push({ kind: "closestGame", winner: personOf(closest.winner), loser: personOf(closest.loser), diff: closest.diff });

  const longest = only(
    played.filter((m) => m.durationMinutes),
    (m) => m.durationMinutes!,
  );
  if (longest) facts.push({ kind: "longestGame", minutes: longest.durationMinutes! });

  return facts;
}

const personOf = (player: MatchPlayer): Person => ({ name: player.name, isMe: player.isMe });

/** The item with the highest score, or none when several share it (a "most" must be one). */
function only<T>(items: readonly T[], score: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestScore = -Infinity;
  let shared = false;
  for (const item of items) {
    const s = score(item);
    if (s > bestScore) [best, bestScore, shared] = [item, s, false];
    else if (s === bestScore) shared = true;
  }
  return shared ? undefined : best;
}

function counts<T>(items: readonly T[]) {
  const map = new Map<T, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}
