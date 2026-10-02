import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { CrownIcon } from "@/components/notebook/icons";
import { InkButton } from "@/components/notebook/ink-button";
import { NotebookShell } from "@/components/notebook/notebook-shell";
import { BrushBar, PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { DeleteMatch } from "@/features/matches/delete-match";
import { playedOnDate } from "@/features/matches/format";
import { getMatch } from "@/features/matches/queries";
import { ARNAK_CATEGORY_TONES, ARNAK_LEADER_STYLES, ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function MatchPage({ params, searchParams }: PageProps<"/[locale]/matches/[id]">) {
  const [profile, locale, t, tLog, tGame, format] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Matches"),
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

  const left = (
    <>
      {saved === "1" && (
        <p role="status" className="type-body-strong mb-4 text-ink-body">
          {t("saved")}
        </p>
      )}
      <PaintedBand as="h1">
        {match.playedOn
          ? format.dateTime(playedOnDate(match.playedOn), { dateStyle: "long", timeZone: "UTC" })
          : t("undatedTitle")}
      </PaintedBand>
      {details.length > 0 && <p className="type-caption mt-3 text-center text-ink-muted">{details.join(" · ")}</p>}

      <section className="mt-8.5">
        <PaintedBand variant={2} flip>
          {t("results")}
        </PaintedBand>
        <ol className="mt-5.5 flex flex-col gap-4">
          {match.players.map((p, i) => (
            <li key={p.playerId} className="flex items-center gap-3.5">
              <span className="type-stat-lg w-6 shrink-0 text-center text-ink-muted">{p.rank}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-[7px] text-[15px]">
                    {p.isWinner && <CrownIcon className="shrink-0" />}
                    <span className="truncate">
                      {p.leader && <span aria-hidden>{ARNAK_LEADER_STYLES[p.leader].emoji} </span>}
                      <b className="font-semibold">{p.name}</b>
                      {p.isMe && <span className="text-ink-muted"> · {t("you")}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-[17px] font-bold" aria-label={t("points", { total: p.total })}>
                    {p.total}
                  </span>
                </div>
                <BrushBar
                  value={best > 0 ? Math.max(p.total, 0) / best : 0}
                  tone={p.leader ? ARNAK_LEADER_STYLES[p.leader].tone : "ink-muted"}
                  index={i}
                />
                {p.wonTiebreak && p.isWinner && (
                  <p className="type-caption m-0 mt-1 text-ink-muted">{t("wonTiebreak")}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* At the end, so the date's band lines up with the right page's. */}
      <p className="mt-8.5">
        <Button asChild variant="link">
          <Link href="/matches">← {t("allMatches")}</Link>
        </Button>
      </p>
    </>
  );

  const right = (
    <>
      <section>
        <PaintedBand>{t("byCategory")}</PaintedBand>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm notebook:text-[15px]">
            <thead>
              <tr>
                <th scope="col" className="w-[38%] border-b-[1.5px] border-ink-body/40 pb-2.5" />
                {match.players.map((p) => (
                  <th
                    scope="col"
                    key={p.playerId}
                    className="truncate border-b-[1.5px] border-ink-body/40 px-1 pb-2.5 text-center font-semibold"
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ARNAK_SCORE_CATEGORIES.map((category) => (
                <tr key={category}>
                  <th scope="row" className="border-b border-ink-body/14 py-[9px] pr-2 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: `var(--${ARNAK_CATEGORY_TONES[category]})` }}
                      />
                      <span className="truncate">{tGame(`scoreCategories.${category}`)}</span>
                    </span>
                  </th>
                  {match.players.map((p) => (
                    <td key={p.playerId} className="border-b border-ink-body/14 py-[9px] text-center text-ink-body">
                      {match.scores[p.playerId]?.[category] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="pt-3 pr-2 text-left italic">
                  {tLog("total")}
                </th>
                {match.players.map((p) => (
                  <td key={p.playerId} className="pt-3 text-center text-lg font-bold">
                    {p.total}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {match.loggedByMe && (
        <div className="mt-11 flex flex-col gap-5">
          <InkButton asChild>
            <Link href={`/matches/${match.id}/edit`}>{t("edit")}</Link>
          </InkButton>
          <DeleteMatch matchId={match.id} />
        </div>
      )}
    </>
  );

  return <NotebookShell active="matches" left={left} right={right} />;
}
