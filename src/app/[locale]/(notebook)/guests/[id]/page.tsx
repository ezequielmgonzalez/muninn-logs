import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { TurnLink } from "@/components/notebook/page-turn";
import { getGuest } from "@/features/guests/queries";
import { getGame } from "@/features/game/server";
import { getPlayerCounts } from "@/features/player-count/server";
import { getGuestDuelStats, getGuestStats } from "@/features/stats/queries";
import { SomeoneElsesDuels, SomeoneElsesStats } from "@/features/stats/someone-elses-stats";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

/**
 * A guest's diary: their stats from the games you can see, laid out like your
 * own Estadísticas. For their owner and anyone who played with them; no
 * friendship needed, since a guest has no account.
 */
export default async function GuestProfilePage({ params }: PageProps<"/[locale]/guests/[id]">) {
  const [profile, locale, t, tStats] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("GuestProfile"),
    getTranslations("Stats"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { id } = await params;
  const guest = await getGuest(id, profile.id);
  // Someone else's guest you never played with, or not a guest at all: nothing here.
  if (!guest) notFound();

  // Back to your guests if it's yours; otherwise you met them in your matches.
  const links = (
        <Button asChild variant="link">
          {guest.isMine ? (
            <TurnLink href="/guests" direction="backward" section="friends">
              ← {t("backToGuests")}
            </TurnLink>
          ) : (
            <TurnLink href="/matches" direction="backward" section="matches">
              ← {t("backToMatches")}
            </TurnLink>
          )}
        </Button>
  );

  if ((await getGame()) === "lotr-duel") {
    const stats = await getGuestDuelStats(guest.id);
    return (
      <SomeoneElsesDuels
        name={guest.name}
        caption={`${t("guest")} · ${tStats("duels", { count: stats.games })}`}
        stats={stats}
        empty={t("emptyDuels", { name: guest.name })}
        links={links}
      />
    );
  }

  const players = await getPlayerCounts();
  const stats = await getGuestStats(guest.id, players);
  return (
    <SomeoneElsesStats
      name={guest.name}
      caption={`${t("guest")} · ${tStats("expeditions", { count: stats.games })}`}
      stats={stats}
      players={players}
      empty={t("empty", { name: guest.name })}
      links={links}
    />
  );
}
