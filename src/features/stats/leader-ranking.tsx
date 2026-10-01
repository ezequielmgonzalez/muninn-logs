"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { NativeSelect } from "@/components/notebook/native-select";
import { BrushBar, PaintedBand } from "@/components/notebook/painted-band";
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
    <section>
      <PaintedBand>{t("leaders")}</PaintedBand>
      {ranked.length === 0 ? (
        <p className="type-caption mt-4 text-ink-muted">{t("noLeaders")}</p>
      ) : (
        <>
          <div className="mt-2.5 mb-3.5 flex items-center justify-end gap-2 notebook:mt-4 notebook:mb-4.5">
            <label htmlFor="leader-sort" className="type-caption text-ink-muted">
              {t("sortBy")}
            </label>
            <NativeSelect
              id="leader-sort"
              size="sm"
              className="w-[150px]"
              value={metric}
              onChange={(e) => setMetric(e.target.value as LeaderMetric)}
            >
              {LEADER_METRICS.map((m) => (
                <option key={m} value={m}>
                  {t(`metrics.${m}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <ol className="flex flex-col gap-[13px] notebook:gap-[15px]">
            {ranked.map(({ leader, value, bar }, i) => {
              const style = ARNAK_LEADER_STYLES[leader.slug];
              return (
                <li key={leader.slug} className="flex items-center gap-3 notebook:gap-3.5">
                  {/* The portrait frame from the design, with the leader's emoji. */}
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-paper text-xl shadow-portrait notebook:size-[46px] notebook:text-2xl"
                  >
                    {style.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px]">
                        <b className="font-semibold">{tGame(`leaders.${leader.slug}`)}</b>{" "}
                        <span className="text-ink-muted">· {t("games", { count: leader.games })}</span>
                      </span>
                      <span className="shrink-0 text-[17px] font-bold">{display(value)}</span>
                    </div>
                    {/* Zero (e.g. no wins with a leader) draws a hairline, not a stroke. */}
                    <BrushBar value={bar} tone={style.tone} index={i} />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
