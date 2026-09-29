import { getFormatter, getTranslations } from "next-intl/server";

import { ARNAK_LEADER_STYLES } from "@/games/arnak";
import { Link } from "@/i18n/navigation";

import { playedOnDate } from "./format";
import type { MatchSummary } from "./queries";

/** Matches as a list of links: date, the user's place, the winner and who played. */
export async function MatchList({ matches }: { matches: MatchSummary[] }) {
  const [t, format] = await Promise.all([getTranslations("Matches"), getFormatter()]);

  return (
    <ul className="flex flex-col">
      {matches.map((match) => {
        const winners = match.players.filter((p) => p.isWinner).map((p) => p.name);
        const me = match.players.find((p) => p.isMe);
        return (
          <li key={match.id} className="border-b last:border-b-0">
            <Link href={`/matches/${match.id}`} className="flex flex-col gap-1 py-4">
              <span className="flex items-baseline justify-between gap-3">
                <span className="type-body-strong">
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
  );
}
