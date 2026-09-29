import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { MatchList } from "@/features/matches/match-list";
import { listMatches } from "@/features/matches/queries";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function MatchesPage() {
  const [profile, locale, t, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Matches"),
    getTranslations("HomePage"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const matches = await listMatches();

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-11">
        <PaintedBand as="h1">{t("title")}</PaintedBand>
        {matches.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="type-caption text-ink-muted">{t("empty")}</p>
            <Button asChild className="h-11 text-base">
              <Link href="/matches/new">{t("logFirst")}</Link>
            </Button>
          </div>
        ) : (
          <MatchList matches={matches} />
        )}
      </main>
    </>
  );
}
