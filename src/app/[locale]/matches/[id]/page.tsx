import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { PaintedBand, BrushBar } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { DeleteMatch } from "@/features/matches/delete-match";
import { playedOnDate } from "@/features/matches/format";
import { getMatch } from "@/features/matches/queries";
import { ARNAK_LEADER_STYLES, ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function MatchPage({ params, searchParams }: PageProps<"/[locale]/matches/[id]">) {
  const [profile, locale, t, tHome, tLog, tGame, format] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Matches"),
    getTranslations("HomePage"),
    getTranslations("LogMatch"),
    getTranslations("Games.arnak"),
    getFormatter(),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { id } = await params;
  const { saved } = await searchParams;
  // Not a UUID, not visible to this user, or deleted: all look the same.
  const matchId = z.uuid().safeParse(id);
  const match = matchId.success ? await getMatch(matchId.data) : null;
  if (!match) notFound();

  const best = Math.max(...match.players.map((p) => p.total), 0);
  const details = [
    match.boardSide && tLog(match.boardSide),
    match.durationMinutes && t("duration", { minutes: match.durationMinutes }),
  ].filter(Boolean);

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-11 px-6 py-11">
        <div className="flex flex-col gap-5">
          <Link href="/matches" className="text-sm text-ink-muted underline-offset-4 hover:underline">
            ← {t("allMatches")}
          </Link>
          {saved === "1" && (
            <p role="status" className="type-body-strong text-ink-body">
              {t("saved")}
            </p>
          )}
          <PaintedBand as="h1">
            {match.playedOn
              ? format.dateTime(playedOnDate(match.playedOn), { dateStyle: "long", timeZone: "UTC" })
              : t("undatedTitle")}
          </PaintedBand>
          {details.length > 0 && <p className="type-caption text-ink-muted">{details.join(" · ")}</p>}
        </div>

        <section className="flex flex-col gap-5">
          <PaintedBand>{t("results")}</PaintedBand>
          <ol className="flex flex-col gap-4">
            {match.players.map((p, i) => (
              <li key={p.playerId} className="flex items-center gap-4">
                <span className="type-stat-lg w-6 shrink-0 text-center text-ink-muted">{p.rank}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="type-body-strong truncate">
                      {p.leader && <span aria-hidden>{ARNAK_LEADER_STYLES[p.leader].emoji} </span>}
                      {p.name}
                      {p.isMe && <span className="font-normal text-ink-muted"> · {t("you")}</span>}
                      {p.isWinner && <span aria-hidden> 🏆</span>}
                    </span>
                    <span className="type-stat-lg shrink-0" aria-label={t("points", { total: p.total })}>
                      {p.total}
                    </span>
                  </span>
                  <BrushBar
                    value={best > 0 ? Math.max(p.total, 0) / best : 0}
                    tone={p.leader ? ARNAK_LEADER_STYLES[p.leader].tone : "ink-muted"}
                    index={i}
                  />
                  {p.wonTiebreak && p.isWinner && (
                    <span className="type-caption text-ink-muted">{t("wonTiebreak")}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-5">
          <PaintedBand>{t("byCategory")}</PaintedBand>
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th scope="col" className="w-24" />
                  {match.players.map((p) => (
                    <th scope="col" key={p.playerId} className="truncate px-1 pb-2 text-center text-sm font-semibold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ARNAK_SCORE_CATEGORIES.map((category) => (
                  <tr key={category} className="border-b">
                    <th scope="row" className="py-2 pr-2 text-left text-sm font-medium">
                      {tGame(`scoreCategories.${category}`)}
                    </th>
                    {match.players.map((p) => (
                      <td key={p.playerId} className="py-2 text-center">
                        {match.scores[p.playerId]?.[category] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="type-body-strong pt-3 pr-2 text-left">
                    {tLog("total")}
                  </th>
                  {match.players.map((p) => (
                    <td key={p.playerId} className="type-stat-lg pt-3 text-center">
                      {p.total}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {match.loggedByMe && (
          <div className="flex flex-col gap-3">
            <Button asChild variant="outline" className="h-11 text-base">
              <Link href={`/matches/${match.id}/edit`}>{t("edit")}</Link>
            </Button>
            <DeleteMatch matchId={match.id} />
          </div>
        )}
      </main>
    </>
  );
}
