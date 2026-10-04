import { ARNAK_BOARD_SIDES, type ArnakBoardSide, type ArnakLeader } from "@/games/arnak";

// The Rankings "Consulta": which leader, which temple side, which seat, and
// who's in. It lives in the URL, in Spanish like the rest of the group's links:
// ?lider=profesor&templo=serpiente&turno=1&quienes=amigos,invitados,otros.
// Each one is left out when it's the default (Todos, Cualquiera, any seat,
// everyone). Leader and temple can also be "sin-especificar": the games
// where none was recorded.

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

/** Every temple side a game can be set up with: the base game's two and the expansions'. */
export const RANKING_TEMPLES = ARNAK_BOARD_SIDES;
export type RankingTemple = ArnakBoardSide;
const TEMPLE_PARAMS: Record<RankingTemple, string> = {
  bird: "pajaro",
  snake: "serpiente",
  waterfall: "cascada",
  tree: "arbol",
  monkey: "mono",
  lizard: "lagarto",
};

/** No leader or no temple recorded: a choice of its own. */
export const UNSPECIFIED = "none";
const UNSPECIFIED_PARAM = "sin-especificar";

/** Where a player started in the turn order. */
export const RANKING_SEATS = [1, 2, 3, 4] as const;
export type RankingSeat = (typeof RANKING_SEATS)[number];

export const RANKING_GROUPS = ["friends", "ownGuests", "otherGuests"] as const;
export type RankingGroup = (typeof RANKING_GROUPS)[number];
const GROUP_PARAMS: Record<RankingGroup, string> = { friends: "amigos", ownGuests: "invitados", otherGuests: "otros" };

export type RankingFilters = {
  /** null: every leader ("Todos"); "none": the games with no leader recorded. */
  leader: ArnakLeader | typeof UNSPECIFIED | null;
  /** null: either side ("Cualquiera"); "none": no side recorded. */
  temple: RankingTemple | typeof UNSPECIFIED | null;
  /** null: any seat. */
  seat: RankingSeat | null;
  /** Who's in besides you (always in). */
  groups: readonly RankingGroup[];
};

export const DEFAULT_FILTERS: RankingFilters = { leader: null, temple: null, seat: null, groups: RANKING_GROUPS };

const keyOf = <K extends string>(map: Record<K, string>, value: string | undefined) =>
  (Object.keys(map) as K[]).find((key) => map[key] === value) ?? null;

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The Consulta from the page's search params; anything unknown means its default. */
export function parseRankingFilters(params: Params): RankingFilters {
  const who = first(params.quienes);
  const [leader, temple] = [first(params.lider), first(params.templo)];
  const seat = Number(first(params.turno));
  return {
    leader: leader === UNSPECIFIED_PARAM ? UNSPECIFIED : keyOf(LEADER_PARAMS, leader),
    temple: temple === UNSPECIFIED_PARAM ? UNSPECIFIED : keyOf(TEMPLE_PARAMS, temple),
    seat: (RANKING_SEATS as readonly number[]).includes(seat) ? (seat as RankingSeat) : null,
    groups:
      who === undefined
        ? RANKING_GROUPS
        : RANKING_GROUPS.filter((group) => who.split(",").includes(GROUP_PARAMS[group])),
  };
}

/** The search params for a Consulta, leaving out the defaults ("quienes=" when nobody else is in). */
export function rankingSearchParams(filters: RankingFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.leader) params.lider = filters.leader === UNSPECIFIED ? UNSPECIFIED_PARAM : LEADER_PARAMS[filters.leader];
  if (filters.temple) params.templo = filters.temple === UNSPECIFIED ? UNSPECIFIED_PARAM : TEMPLE_PARAMS[filters.temple];
  if (filters.seat) params.turno = String(filters.seat);
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
