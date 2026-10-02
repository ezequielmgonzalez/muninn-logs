import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { TurnLink } from "@/components/notebook/page-turn";
import { getFriendByUsername } from "@/features/friends/queries";
import { getPlayerCount } from "@/features/player-count/server";
import { getPlayerStats } from "@/features/stats/queries";
import { SomeoneElsesStats } from "@/features/stats/someone-elses-stats";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

/** A friend's diary: their stats, laid out like your own Estadísticas. */
export default async function FriendProfilePage({ params }: PageProps<"/[locale]/friends/[username]">) {
  const [profile, locale, t, tStats] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("FriendProfile"),
    getTranslations("Stats"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { username } = await params;
  const friend = await getFriendByUsername(profile.id, decodeURIComponent(username));
  // Not a friend (or not a user at all): to the viewer, there's nothing here.
  if (!friend) notFound();

  const players = await getPlayerCount();
  const stats = await getPlayerStats(friend.id, players);

  return (
    <SomeoneElsesStats
      name={friend.display_name}
      caption={tStats("expeditions", { count: stats.games })}
      stats={stats}
      players={players}
      empty={t("empty", { name: friend.display_name })}
      links={
        <>
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
        </>
      }
    />
  );
}
