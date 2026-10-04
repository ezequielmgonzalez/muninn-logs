import { getTranslations } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { noGamesFor, PlayerCountsNote } from "@/features/player-count/copy";
import { type PlayerCounts, playerCountsKey } from "@/features/player-count/options";

import { DuelWinRateSection, SidesSection, VictoriesSection } from "./duel-view";
import { LeaderRanking } from "./leader-ranking";
import type { DuelStats, PlayerStats } from "./queries";
import { CategoriesSection, WinRateSection } from "./stats-view";

/**
 * A friend's or a guest's Estadísticas, laid out like your own: under their
 * "Diario de" name and a line of links, Win Rate and the categories on the
 * left page, the leaders' ranking on the right. A new player count paints the
 * page again; the ranking repaints its own bars, keeping its order.
 */
export async function SomeoneElsesStats({
  name,
  caption,
  links,
  stats,
  players,
  empty,
}: {
  name: string;
  /** Under the name, e.g. "Invitado · 3 expediciones registradas". */
  caption: string;
  /** The way back, and anything else to do from here. */
  links: ReactNode;
  stats: PlayerStats;
  players: PlayerCounts;
  /** When there are no games to show (with no player filter). */
  empty: string;
}) {
  const left = (
    <Fragment key={playerCountsKey(players)}>
      <DiaryHeader name={name} caption={caption} links={links} />
      {stats.games === 0 ? (
        <p className="type-caption mt-8.5 text-ink-muted">{players ? await noGamesFor(players) : empty}</p>
      ) : (
        <>
          <WinRateSection stats={stats} className="mt-8 notebook:mt-8.5" note={<PlayerCountsNote counts={players} />} />
          <CategoriesSection stats={stats} className="mt-8 notebook:mt-8.5" />
        </>
      )}
    </Fragment>
  );
  return <NotebookPages left={left} right={stats.games === 0 ? undefined : <LeaderRanking leaders={stats.leaders} />} />;
}

/**
 * The same for LOTR Duel: wins, draws and losses and the sides on the left
 * page, how their duels were won and lost on the right. (Their record against
 * each opponent stays theirs: it's built from matches, which only the people
 * in them see.)
 */
export async function SomeoneElsesDuels({
  name,
  caption,
  links,
  stats,
  empty,
}: {
  name: string;
  caption: string;
  links: ReactNode;
  stats: DuelStats;
  empty: string;
}) {
  const left = (
    <Fragment key="lotr-duel">
      <DiaryHeader name={name} caption={caption} links={links} />
      {stats.games === 0 ? (
        <p className="type-caption mt-8.5 text-ink-muted">{empty}</p>
      ) : (
        <>
          <DuelWinRateSection stats={stats} className="mt-8 notebook:mt-8.5" />
          <SidesSection stats={stats} className="mt-8 notebook:mt-8.5" flip />
        </>
      )}
    </Fragment>
  );
  return <NotebookPages left={left} right={stats.games === 0 ? undefined : <VictoriesSection stats={stats} />} />;
}

/** "Diario de / Manuela", a caption, and a line of links. */
async function DiaryHeader({ name, caption, links }: { name: string; caption: string; links: ReactNode }) {
  const tNav = await getTranslations("Nav");
  return (
    <header className="text-center">
      <h1 className="m-0">
        <span className="type-caption block text-sm text-ink-muted">{tNav("diaryOf")} </span>
        <span className="type-diary-name block leading-[1.15] text-ink">{name}</span>
      </h1>
      <p className="type-caption m-0 mt-1 text-ink-muted">{caption}</p>
      <p className="mt-3 flex items-center justify-between gap-4">{links}</p>
    </header>
  );
}
