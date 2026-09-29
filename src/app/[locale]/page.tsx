import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { countIncomingRequests } from "@/features/friends/queries";
import { MatchList } from "@/features/matches/match-list";
import { listMatches } from "@/features/matches/queries";
import { getPlayerStats } from "@/features/stats/queries";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function Home() {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("HomePage"),
  ]);
  if (!profile) return <Landing />;
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const [tStats, tAuth, format, stats, recent, incomingRequests] = await Promise.all([
    getTranslations("Stats"),
    getTranslations("Auth"),
    getFormatter(),
    getPlayerStats(profile.id),
    listMatches(3),
    countIncomingRequests(profile.id),
  ]);

  const seeMore = (href: string, label: string) => (
    <Link href={href} className="self-end text-sm text-ink-muted underline-offset-4 hover:underline">
      {label} →
    </Link>
  );

  return (
    <>
      <PaintedBand as="h1" size="page" trailing={tStats("expeditions", { count: stats.games })}>
        {t("journal", { name: profile.display_name })}
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-11 px-6 py-11">
        <Button asChild className="h-11 w-full text-base">
          <Link href="/matches/new">{t("logGame")}</Link>
        </Button>

        <section className="flex flex-col gap-5">
          <PaintedBand as="h2">{t("summary")}</PaintedBand>
          {stats.games === 0 ? (
            <p className="type-caption text-ink-muted">{t("noMatches")}</p>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  [tStats("winRate"), format.number(stats.wins / stats.games, { style: "percent", maximumFractionDigits: 0 })],
                  [tStats("avgPlace"), format.number(stats.avg_place ?? 0, { maximumFractionDigits: 2 })],
                  [t("games"), String(stats.games)],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col-reverse gap-1">
                    <dt className="text-sm text-ink-muted">{label}</dt>
                    <dd className="type-stat-lg">{value}</dd>
                  </div>
                ))}
              </dl>
              {seeMore("/profile", t("seeStats"))}
            </>
          )}
        </section>

        {recent.length > 0 && (
          <section className="flex flex-col gap-3">
            <PaintedBand as="h2">{t("recent")}</PaintedBand>
            <MatchList matches={recent} />
            {seeMore("/matches", t("seeAllMatches"))}
          </section>
        )}

        <div className="flex flex-col items-center gap-4">
          <Button asChild variant="outline" className="h-11 w-full text-base">
            <Link href="/friends">
              {incomingRequests > 0 ? t("friendsWithRequests", { count: incomingRequests }) : t("friends")}
            </Link>
          </Button>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="ghost">
              {tAuth("signOut")}
            </Button>
          </form>
          <LocaleSwitcher />
        </div>
      </main>
    </>
  );
}

/** The signed-out home: what Muninn Logs is, and a way in. */
async function Landing() {
  const t = await getTranslations("HomePage");
  return (
    <>
      <PaintedBand as="h1" size="page">
        Muninn Logs
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-11 text-center">
        <p className="text-lg text-ink-muted italic">{t("tagline")}</p>
        <Button asChild className="h-11 w-full text-base">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
        <LocaleSwitcher />
      </main>
    </>
  );
}
