import { getLocale, getTranslations } from "next-intl/server";

import { NotebookShell } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { LeaderRanking } from "@/features/stats/leader-ranking";
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

  const stats = await getPlayerStats(profile.id);
  const title = <h1 className="sr-only">{tHome("journal", { name: profile.display_name })}</h1>;

  if (stats.games === 0) {
    // Nothing to show yet: the insert and the tab bar offer "Cargar partida".
    return (
      <NotebookShell
        active="stats"
        left={
          <>
            {title}
            <PaintedBand>{t("winRate")}</PaintedBand>
            <p className="type-caption mt-5.5 text-ink-muted">{t("empty")}</p>
          </>
        }
      />
    );
  }

  return (
    <NotebookShell
      active="stats"
      left={
        <>
          {title}
          <WinRateSection stats={stats} />
          <CategoriesSection stats={stats} className="mt-8 notebook:mt-8.5" />
        </>
      }
      right={<LeaderRanking leaders={stats.leaders} />}
    />
  );
}
