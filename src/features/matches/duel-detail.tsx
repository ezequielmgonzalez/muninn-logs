import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { CrownIcon } from "@/components/notebook/icons";
import { InkButton } from "@/components/notebook/ink-button";
import { NotebookPages } from "@/components/notebook/notebook-shell";
import { TurnLink } from "@/components/notebook/page-turn";
import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { LOTR_SIDE_STYLES } from "@/games/lotr-duel";

import { DeleteMatch } from "./delete-match";
import { playedOnDate } from "./format";
import type { MatchDetail, MatchPlayer } from "./queries";

/** A player's name, linking to their Estadísticas when the user can see them. */
export type PlayerLink = (player: MatchPlayer) => { href: string; section: "stats" | "friends" } | null;

/**
 * A LOTR duel's page: who won and how (or the draw) on the left, with each
 * player's side; editing on the right, as for any match.
 */
export async function DuelDetail({ match, saved, statsOf }: { match: MatchDetail; saved: boolean; statsOf: PlayerLink }) {
  const [t, tGame, format] = await Promise.all([getTranslations("Matches"), getTranslations("Games.lotr-duel"), getFormatter()]);
  const duel = match.duel!;
  const winner = match.players.find((p) => p.isWinner);

  const name = (p: MatchPlayer): ReactNode => {
    const link = statsOf(p);
    return link ? (
      <TurnLink
        href={link.href}
        section={link.section}
        direction="forward"
        className="font-semibold underline decoration-ink-body/35 decoration-1 underline-offset-4 hover:decoration-bronze"
      >
        {p.name}
      </TurnLink>
    ) : (
      <b className="font-semibold">{p.name}</b>
    );
  };

  const left = (
    <>
      {saved && (
        <p role="status" className="type-body-strong mb-4 text-ink-body">
          {t("saved")}
        </p>
      )}
      <PaintedBand as="h1">
        {match.playedOn
          ? format.dateTime(playedOnDate(match.playedOn), { dateStyle: "long", timeZone: "UTC" })
          : t("undatedTitle")}
      </PaintedBand>
      <p className="type-caption mt-3 text-center text-ink-muted">
        {[tGame("short"), match.durationMinutes && t("duration", { minutes: match.durationMinutes })].filter(Boolean).join(" · ")}
      </p>

      <section className="mt-8.5">
        <PaintedBand variant={2} flip>
          {t("results")}
        </PaintedBand>
        {duel.result === "draw" || !winner ? (
          <p className="type-entry-title mt-5.5 text-center text-ink-body">{tGame("draw")}</p>
        ) : (
          <div className="mt-5.5 text-center">
            <p className="type-entry-title m-0 flex items-center justify-center gap-[7px] text-ink-body">
              <CrownIcon />
              {t("winner", { names: winner.name })}
            </p>
            {duel.victory && (
              <p className="type-caption m-0 mt-1 text-ink-muted">
                {t("victoryOf", { victory: tGame(`victories.${duel.victory}`) })}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mt-8.5">
        <PaintedBand>{t("sides")}</PaintedBand>
        <ul className="mt-4 flex flex-col">
          {match.players.map((p) => (
            <li key={p.playerId} className="flex items-center gap-3 border-b border-ink-body/14 py-3 text-[15px] last:border-b-0">
              <span aria-hidden className="text-xl">
                {p.side && LOTR_SIDE_STYLES[p.side].emoji}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {name(p)}
                {p.isMe && <span className="text-ink-muted"> · {t("you")}</span>}
              </span>
              <span className="shrink-0 text-ink-muted">{p.side && tGame(`sides.${p.side}`)}</span>
              {p.isWinner && <CrownIcon className="shrink-0" />}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8.5">
        <Button asChild variant="link">
          <TurnLink href="/matches" direction="backward" section="matches">
            ← {t("allMatches")}
          </TurnLink>
        </Button>
      </p>
    </>
  );

  const right = match.loggedByMe && (
    <div className="flex flex-col gap-5 notebook:mt-11">
      <InkButton asChild>
        <TurnLink href={`/matches/${match.id}/edit`} direction="forward">
          {t("edit")}
        </TurnLink>
      </InkButton>
      <DeleteMatch matchId={match.id} />
    </div>
  );

  return <NotebookPages left={left} right={right || undefined} />;
}
