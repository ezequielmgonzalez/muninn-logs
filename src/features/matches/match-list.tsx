import { getFormatter, getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { CrownIcon } from "@/components/notebook/icons";
import { ARNAK_LEADER_STYLES } from "@/games/arnak";
import { TurnLink } from "@/components/notebook/page-turn";

import { playedOnDate } from "./format";
import type { MatchSummary } from "./queries";

/**
 * Matches as a list of entries (design/components/MatchEntry.md): the date and
 * the user's place, the winner with the crown, and who played in finishing
 * order, the user in bold. Each entry links to the match.
 */
export async function MatchList({ matches }: { matches: MatchSummary[] }) {
  const [t, format] = await Promise.all([getTranslations("Matches"), getFormatter()]);

  return (
    <ul className="flex flex-col">
      {matches.map((match) => {
        const winners = match.players.filter((p) => p.isWinner).map((p) => p.name);
        const me = match.players.find((p) => p.isMe);
        return (
          <li key={match.id} className="border-b border-ink-body/14 last:border-b-0">
            <TurnLink
              href={`/matches/${match.id}`}
              direction="forward"
              className="flex flex-col pt-3.5 pb-[13px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-bold">
                  {match.playedOn
                    ? format.dateTime(playedOnDate(match.playedOn), { dateStyle: "medium", timeZone: "UTC" })
                    : t("undated")}
                </span>
                {me && (
                  <span className="shrink-0 text-sm text-ink-muted">
                    {t("place", { rank: me.rank, count: match.players.length })}
                  </span>
                )}
              </span>
              <span className="type-entry-title mt-1 mb-1.5 flex items-center gap-[7px] text-ink-body">
                <CrownIcon />
                {winners.length > 1
                  ? t("sharedWin", { names: format.list(winners) })
                  : t("winner", { names: winners[0] ?? "?" })}
              </span>
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-muted">
                {match.players.map((p, i) => (
                  <Fragment key={p.playerId}>
                    {i > 0 && (
                      <span aria-hidden className="text-ink-body/35">
                        ·
                      </span>
                    )}
                    <span className={p.isMe ? "font-semibold text-ink-body" : undefined}>
                      {p.leader && <span aria-hidden>{ARNAK_LEADER_STYLES[p.leader].emoji} </span>}
                      {p.name}
                    </span>
                  </Fragment>
                ))}
              </span>
            </TurnLink>
          </li>
        );
      })}
    </ul>
  );
}
