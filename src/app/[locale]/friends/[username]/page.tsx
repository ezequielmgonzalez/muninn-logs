import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { getFriendByUsername } from "@/features/friends/queries";
import { getPlayerStats } from "@/features/stats/queries";
import { StatsView } from "@/features/stats/stats-view";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

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

  const stats = await getPlayerStats(friend.id);

  return (
    <>
      <PaintedBand as="h1" size="page" trailing={tStats("expeditions", { count: stats.games })}>
        {tHome("journal", { name: friend.display_name })}
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-11 px-6 py-11">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/friends" className="text-sm text-ink-muted underline-offset-4 hover:underline">
            ← {t("back")}
          </Link>
          <Button asChild className="h-11 text-base">
            <Link href={{ pathname: "/compare", query: { with: friend.username ?? "" } }}>{t("compare")}</Link>
          </Button>
        </div>
        {stats.games === 0 ? (
          <p className="type-caption text-ink-muted">{t("empty", { name: friend.display_name })}</p>
        ) : (
          <StatsView stats={stats} />
        )}
      </main>
    </>
  );
}
