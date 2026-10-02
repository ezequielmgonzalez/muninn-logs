import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { Button } from "@/components/ui/button";
import { TurnLink } from "@/components/notebook/page-turn";
import { getFriendByUsername } from "@/features/friends/queries";
import { LeaderRanking } from "@/features/stats/leader-ranking";
import { getPlayerCount } from "@/features/player-count/server";
import { getPlayerStats } from "@/features/stats/queries";
import { CategoriesSection, WinRateSection } from "@/features/stats/stats-view";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

/** A friend's diary: their stats, laid out like your own Estadísticas. */
export default async function FriendProfilePage({ params }: PageProps<"/[locale]/friends/[username]">) {
  const [profile, locale, t, tStats, tNav] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("FriendProfile"),
    getTranslations("Stats"),
    getTranslations("Nav"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { username } = await params;
  const friend = await getFriendByUsername(profile.id, decodeURIComponent(username));
  // Not a friend (or not a user at all): to the viewer, there's nothing here.
  if (!friend) notFound();

  const [players, tCount] = await Promise.all([getPlayerCount(), getTranslations("PlayerCount")]);
  const stats = await getPlayerStats(friend.id, players);

  // Laid out like your own Estadísticas, under the friend's name. A new player
  // count paints the page again; the ranking repaints its own bars, keeping its order.
  const left = (
    <Fragment key={players ?? "all"}>
      <header className="text-center">
        <h1 className="m-0">
          <span className="type-caption block text-sm text-ink-muted">{tNav("diaryOf")} </span>
          <span className="type-diary-name block leading-[1.15] text-ink">{friend.display_name}</span>
        </h1>
        <p className="type-caption m-0 mt-1 text-ink-muted">{tStats("expeditions", { count: stats.games })}</p>
        <p className="mt-3 flex items-center justify-between gap-4">
          <Button asChild variant="link">
            <TurnLink href="/friends" direction="backward" section="friends">
              ← {t("back")}
            </TurnLink>
          </Button>
          <Button asChild variant="link">
            <TurnLink href={{ pathname: "/compare", query: { with: friend.username ?? "" } }} direction="forward">
              {t("compare")} →
            </TurnLink>
          </Button>
        </p>
      </header>
      {stats.games === 0 ? (
        <p className="type-caption mt-8.5 text-ink-muted">
          {players ? tCount("none", { count: players }) : t("empty", { name: friend.display_name })}
        </p>
      ) : (
        <>
          <WinRateSection stats={stats} className="mt-8 notebook:mt-8.5" />
          <CategoriesSection stats={stats} className="mt-8 notebook:mt-8.5" />
        </>
      )}
    </Fragment>
  );

  const right = stats.games === 0 ? undefined : <LeaderRanking leaders={stats.leaders} />;

  return <NotebookPages left={left} right={right} />;
}
