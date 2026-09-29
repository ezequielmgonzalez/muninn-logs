import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { playedOnDate } from "@/features/matches/format";
import { listMatches } from "@/features/matches/queries";
import { ARNAK_LEADER_STYLES } from "@/games/arnak";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function MatchesPage() {
  const [profile, locale, t, tHome, format] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Matches"),
    getTranslations("HomePage"),
    getFormatter(),
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
          <ul className="flex flex-col">
            {matches.map((match) => {
              const winners = match.players.filter((p) => p.isWinner).map((p) => p.name);
              const me = match.players.find((p) => p.isMe);
              return (
                <li key={match.id} className="border-b last:border-b-0">
                  <Link href={`/matches/${match.id}`} className="flex flex-col gap-1 py-4">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="type-body-strong">
                        {format.dateTime(playedOnDate(match.playedOn), { dateStyle: "medium", timeZone: "UTC" })}
                      </span>
                      {me && (
                        <span className="shrink-0 text-sm text-ink-muted">
                          {t("place", { rank: me.rank, count: match.players.length })}
                        </span>
                      )}
                    </span>
                    <span className="text-ink-body">
                      🏆{" "}
                      {winners.length > 1
                        ? t("sharedWin", { names: format.list(winners) })
                        : t("winner", { names: winners[0] ?? "?" })}
                    </span>
                    <span className="truncate text-sm text-ink-muted">
                      {match.players
                        .map((p) => `${p.leader ? `${ARNAK_LEADER_STYLES[p.leader].emoji} ` : ""}${p.name}`)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
