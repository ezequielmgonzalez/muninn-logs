import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { hasTableSizes } from "@/features/game/options";
import { getGame } from "@/features/game/server";
import { PlayerCountsNote } from "@/features/player-count/copy";
import { playerCountsKey } from "@/features/player-count/options";
import { getPlayerCounts } from "@/features/player-count/server";
import { parseRankingFilters, RANKING_GROUPS, rankingSearchParams } from "@/features/rankings/filters";
import { getRanking } from "@/features/rankings/queries";
import { RankingList } from "@/features/rankings/ranking-list";
import { ClearRankingFilters, RankingFiltersCard, RankingQuery } from "@/features/rankings/ranking-query";
import { StatsSwitch } from "@/features/rankings/stats-switch";
import { ARNAK_LEADER_STYLES } from "@/games/arnak";
import { LOTR_SIDE_STYLES } from "@/games/lotr-duel";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

/**
 * Rankings: how everyone you play with does with a leader, on a temple side,
 * at some table sizes (for LOTR Duel: with a side). The left page is the Consulta (a card and a sheet on
 * phones), the right page the ranking. Everything comes from get_rankings(),
 * which only sees what you may see.
 */
export default async function RankingsPage({ searchParams }: PageProps<"/[locale]/rankings">) {
  const [profile, locale, t, tLeaders, tDuel, format] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Rankings"),
    getTranslations("Games.arnak.leaders"),
    getTranslations("Games.lotr-duel"),
    getFormatter(),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  // LOTR Duel ranks by side, at its only table size.
  const game = await getGame();
  const duel = game === "lotr-duel";
  const [filters, players] = await Promise.all([
    searchParams.then(parseRankingFilters),
    hasTableSizes(game) ? getPlayerCounts() : null,
  ]);
  const ranking = await getRanking(filters, players, game);
  // A new Consulta or player count paints the ranking again (its sort stays).
  const fresh = `${game}|${JSON.stringify(rankingSearchParams(filters))}|${playerCountsKey(players)}`;

  const b = (chunks: ReactNode) => <b className="font-semibold not-italic">{chunks}</b>;
  const sentence = duel
    ? t.rich("duelSentence", { side: filters.side ?? "both", b })
    : t.rich("sentence", {
        leader: filters.leader === "none" ? "none" : filters.leader ? "one" : "all",
        article: filters.leader && filters.leader !== "none" ? t(`articles.${filters.leader}`) : "",
        name: filters.leader && filters.leader !== "none" ? tLeaders(filters.leader) : "",
        temple: filters.temple ?? "any",
        seat: filters.seat ? String(filters.seat) : "any",
        b,
      });

  // The phone's card: "Profesor · templo de la Serpiente" / "Amigos e invitados · mesas de 3 y 4".
  const who =
    filters.groups.length === RANKING_GROUPS.length
      ? t("card.everyone")
      : filters.groups.length === 0
        ? t("card.onlyYou")
        : format.list(filters.groups.map((group) => t(`groups.${group}`)), { type: "conjunction" });
  const tables = players
    ? t("card.tables", { counts: format.list(players.map(String), { type: "conjunction" }) })
    : t("card.allTables");
  // A duel's: "Sauron" / "Amigos e invitados".
  const lines: [string, string] = duel
    ? [filters.side ? tDuel(`sides.${filters.side}`) : t("bothSides"), who]
    : [
        t("card.leaderTemple", {
          leader:
            filters.leader === "none" ? t("unspecified") : filters.leader ? tLeaders(filters.leader) : t("allLeaders"),
          temple: filters.temple ?? "any",
          seat: filters.seat ? String(filters.seat) : "any",
        }),
        `${who} · ${tables}`,
      ];

  // The bars take the leader's or side's color; bronze for all of them, grey for games without one.
  const tone = duel
    ? filters.side
      ? LOTR_SIDE_STYLES[filters.side].tone
      : "player-you"
    : filters.leader === "none"
      ? "ink-muted"
      : filters.leader
        ? ARNAK_LEADER_STYLES[filters.leader].tone
        : "player-you";

  const left = (
    <>
      <h1 className="sr-only">{t("ranking")}</h1>
      {/* Phones: back to your numbers, and the Consulta folded into a card. */}
      <div className="flex flex-col gap-5.5 notebook:hidden">
        <StatsSwitch current="rankings" />
        <RankingFiltersCard game={game} filters={filters} lines={lines} />
      </div>
      <div className="max-notebook:hidden">
        <RankingQuery game={game} filters={filters} />
      </div>
    </>
  );

  const right = (
    <section>
      <PaintedBand>{t("ranking")}</PaintedBand>
      <PlayerCountsNote counts={players} />
      <p className="m-0 mt-3 text-center text-[17px] text-ink-body italic">{sentence}</p>
      {ranking.players.length === 0 ? (
        <div className="mt-8.5 text-center">
          <p className="type-caption m-0 text-ink-muted">{t("empty")}</p>
          <p className="m-0 mt-3">
            <ClearRankingFilters filters={filters} />
          </p>
        </div>
      ) : (
        <>
          <p className="type-caption m-0 mt-1 text-center text-ink-muted">
            {t("summary", { players: ranking.players.length, matches: ranking.matches })}
          </p>
          <RankingList
            rows={ranking.players}
            tone={tone}
            sorts={duel ? ["winRate", "games"] : undefined}
            paintKey={fresh}
          />
        </>
      )}
    </section>
  );

  return <NotebookPages left={left} right={right} />;
}
