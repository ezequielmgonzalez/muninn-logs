import { getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { LeaderRanking } from "@/features/stats/leader-ranking";
import { noGamesFor, PlayerCountsNote } from "@/features/player-count/copy";
import { playerCountsKey } from "@/features/player-count/options";
import { getPlayerCounts } from "@/features/player-count/server";
import { getPlayerStats } from "@/features/stats/queries";
import { CategoriesSection, WinRateSection } from "@/features/stats/stats-view";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function ProfilePage() {
  const [profile, locale, t, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Stats"),
    getTranslations("HomePage"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const players = await getPlayerCounts();
  const stats = await getPlayerStats(profile.id, players);
  const title = <h1 className="sr-only">{tHome("journal", { name: profile.display_name })}</h1>;

  if (stats.games === 0) {
    // Nothing to show yet: the insert and the tab bar offer "Cargar partida".
    return (
      <NotebookPages
        left={
          <>
            {title}
            <PaintedBand>{t("winRate")}</PaintedBand>
            <PlayerCountsNote counts={players} />
            <p className="type-caption mt-5.5 text-ink-muted">{players ? await noGamesFor(players) : t("empty")}</p>
          </>
        }
      />
    );
  }

  return (
    <NotebookPages
      left={
        // A new player count paints the page again. The ranking repaints its own bars, keeping its order.
        <Fragment key={playerCountsKey(players)}>
          {title}
          <WinRateSection stats={stats} note={<PlayerCountsNote counts={players} />} />
          <CategoriesSection stats={stats} className="mt-8 notebook:mt-8.5" />
        </Fragment>
      }
      right={<LeaderRanking leaders={stats.leaders} />}
    />
  );
}
