import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { getPlayerStats } from "@/features/stats/queries";
import { StatsView } from "@/features/stats/stats-view";
import { Link, redirect } from "@/i18n/navigation";
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

  const stats = await getPlayerStats(profile.id);

  return (
    <>
      <PaintedBand as="h1" size="page" trailing={t("expeditions", { count: stats.games })}>
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-11">
        {stats.games === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-start gap-4">
            <p className="type-caption text-ink-muted">{t("empty")}</p>
            <Button asChild className="h-11 text-base">
              <Link href="/matches/new">{t("logGame")}</Link>
            </Button>
          </div>
        ) : (
          <StatsView stats={stats} />
        )}
      </main>
    </>
  );
}
