import type { ArnakBoardSide, ArnakLeader } from "@/games/arnak";

// The Rankings "Consulta": which leader, which temple side, and who's in.
// It lives in the URL, in Spanish like the rest of the group's links:
// ?lider=profesor&templo=serpiente&quienes=amigos,invitados,otros.
// Each one is left out when it's the default (Todos, Cualquiera, everyone).

/** The leader's name in the URL (the app's Spanish names, without accents). */
export const LEADER_PARAMS: Record<ArnakLeader, string> = {
  captain: "capitan",
  falconer: "cetrera",
  baroness: "baronesa",
  professor: "profesor",
  explorer: "exploradora",
  mystic: "mistico",
  mechanic: "mecanica",
  journalist: "periodista",
};

/** The two temple sides the Consulta offers (the base game's). */
export const RANKING_TEMPLES = ["bird", "snake"] as const satisfies readonly ArnakBoardSide[];
export type RankingTemple = (typeof RANKING_TEMPLES)[number];
const TEMPLE_PARAMS: Record<RankingTemple, string> = { bird: "pajaro", snake: "serpiente" };

export const RANKING_GROUPS = ["friends", "ownGuests", "otherGuests"] as const;
export type RankingGroup = (typeof RANKING_GROUPS)[number];
const GROUP_PARAMS: Record<RankingGroup, string> = { friends: "amigos", ownGuests: "invitados", otherGuests: "otros" };

export type RankingFilters = {
  /** null: every leader ("Todos"). */
  leader: ArnakLeader | null;
  /** null: either side ("Cualquiera"). */
  temple: RankingTemple | null;
  /** Who's in besides you (always in). */
  groups: readonly RankingGroup[];
};

export const DEFAULT_FILTERS: RankingFilters = { leader: null, temple: null, groups: RANKING_GROUPS };

const keyOf = <K extends string>(map: Record<K, string>, value: string | undefined) =>
  (Object.keys(map) as K[]).find((key) => map[key] === value) ?? null;

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The Consulta from the page's search params; anything unknown means its default. */
export function parseRankingFilters(params: Params): RankingFilters {
  const who = first(params.quienes);
  return {
    leader: keyOf(LEADER_PARAMS, first(params.lider)),
    temple: keyOf(TEMPLE_PARAMS, first(params.templo)),
    groups:
      who === undefined
        ? RANKING_GROUPS
        : RANKING_GROUPS.filter((group) => who.split(",").includes(GROUP_PARAMS[group])),
  };
}

/** The search params for a Consulta, leaving out the defaults ("quienes=" when nobody else is in). */
export function rankingSearchParams(filters: RankingFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.leader) params.lider = LEADER_PARAMS[filters.leader];
  if (filters.temple) params.templo = TEMPLE_PARAMS[filters.temple];
  if (filters.groups.length !== RANKING_GROUPS.length) {
    params.quienes = RANKING_GROUPS.filter((g) => filters.groups.includes(g))
      .map((g) => GROUP_PARAMS[g])
      .join(",");
  }
  return params;
}

export function isDefaultFilters(filters: RankingFilters) {
  return Object.keys(rankingSearchParams(filters)).length === 0;
}
