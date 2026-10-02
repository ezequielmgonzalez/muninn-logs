import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { NotebookShell } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
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
  const [profile, locale, t, tStats, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("FriendProfile"),
    getTranslations("Stats"),
    getTranslations("HomePage"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { username } = await params;
  const friend = await getFriendByUsername(profile.id, decodeURIComponent(username));
  // Not a friend (or not a user at all): to the viewer, there's nothing here.
  if (!friend) notFound();

  const [players, tCount] = await Promise.all([getPlayerCount(), getTranslations("PlayerCount")]);
  const stats = await getPlayerStats(friend.id, players);

  const left = (
    <>
      <PaintedBand as="h1">{tHome("journal", { name: friend.display_name })}</PaintedBand>
      <p className="type-caption mt-3 text-center text-ink-muted">{tStats("expeditions", { count: stats.games })}</p>
      <p className="mt-4 flex items-center justify-between gap-4">
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
      {stats.games === 0 ? (
        <p className="type-caption mt-8.5 text-ink-muted">
          {players ? tCount("none", { count: players }) : t("empty", { name: friend.display_name })}
        </p>
      ) : (
        <div className="mt-8.5">
          <WinRateSection stats={stats} />
        </div>
      )}
    </>
  );

  const right =
    stats.games === 0 ? undefined : (
      <>
        <CategoriesSection stats={stats} />
        <div className="mt-11">
          <LeaderRanking leaders={stats.leaders} />
        </div>
      </>
    );

  return <NotebookShell active="friends" left={left} right={right} playerFilter />;
}
