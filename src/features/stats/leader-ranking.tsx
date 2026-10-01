"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { PaintedBand, PaintedBar } from "@/components/painted-band";
import { ARNAK_LEADER_STYLES } from "@/games/arnak";

import { LEADER_METRICS, type LeaderMetric, rankLeaders } from "./leader-metrics";
import type { LeaderStats } from "./queries";

/** "Which leader am I best with?": the design's ranking card, re-sorted by the chosen stat. */
export function LeaderRanking({ leaders }: { leaders: LeaderStats[] }) {
  const t = useTranslations("Stats");
  const tGame = useTranslations("Games.arnak");
  const format = useFormatter();
  const [metric, setMetric] = useState<LeaderMetric>("winRate");
  const ranked = rankLeaders(leaders, metric);

  const display = (value: number) =>
    metric === "winRate"
      ? format.number(value, { style: "percent", maximumFractionDigits: 0 })
      : metric === "avgPlace"
        ? format.number(value, { maximumFractionDigits: 2 })
        : format.number(value, { maximumFractionDigits: 1 });

  return (
    <section className="flex flex-col gap-5">
      <PaintedBand
        trailing={
          <select
            aria-label={t("sortBy")}
            value={metric}
            onChange={(e) => setMetric(e.target.value as LeaderMetric)}
            className="h-9 rounded-sm border border-band-text-muted/60 bg-transparent px-2 text-band-text [&>option]:text-ink-body"
          >
            {LEADER_METRICS.map((m) => (
              <option key={m} value={m}>
                {t(`metrics.${m}`)}
              </option>
            ))}
          </select>
        }
      >
        {t("leaders")}
      </PaintedBand>
      {ranked.length === 0 ? (
        <p className="type-caption text-ink-muted">{t("noLeaders")}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {ranked.map(({ leader, value, bar }, i) => {
            const style = ARNAK_LEADER_STYLES[leader.slug];
            return (
              <li key={leader.slug} className="flex items-center gap-3.5">
                {/* The portrait frame from the design, with the leader's emoji. */}
                <span
                  aria-hidden
                  className="flex size-11.5 shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-card text-2xl shadow-[0_2px_5px_rgba(43,32,20,0.35)]"
                >
                  {style.emoji}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="type-body-strong truncate">
                      {tGame(`leaders.${leader.slug}`)}
                      <span className="font-normal text-ink-muted">
                        {" · "}
                        {t("games", { count: leader.games })}
                      </span>
                    </span>
                    <span className="type-stat-lg shrink-0">{display(value)}</span>
                  </span>
                  {/* A sliver even for the weakest, so every row keeps its stroke. */}
                  <PaintedBar value={Math.max(bar, 0.08)} tone={style.tone} index={i} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
