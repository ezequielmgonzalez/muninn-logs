"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { NativeSelect } from "@/components/notebook/native-select";
import { BrushBar, PaintedBand } from "@/components/notebook/painted-band";
import { ARNAK_LEADER_STYLES } from "@/games/arnak";

import { isLeaderMetric, type LeaderMetric, METRIC_GROUPS, pointMetric, rankLeaders } from "./leader-metrics";
import type { LeaderStats } from "./queries";

/**
 * "Which leader am I best with?": the design's ranking card, re-sorted by the
 * chosen stat. Games played without a leader rank as "Sin líder".
 */
export function LeaderRanking({ leaders }: { leaders: LeaderStats[] }) {
  const t = useTranslations("Stats");
  const tGame = useTranslations("Games.arnak");
  const format = useFormatter();
  const [metric, setMetric] = useState<LeaderMetric>("winRate");
  const ranked = rankLeaders(leaders, metric);

  const measureLabel = (group: (typeof METRIC_GROUPS)[number]["group"]) =>
    group === "general" || group === "total" ? t(`metricGroups.${group}`) : tGame(`scoreCategories.${group}`);
  const metricLabel = (m: LeaderMetric) => {
    const point = pointMetric(m);
    if (!point) return t(`metrics.${m as "winRate" | "avgPlace" | "games"}`);
    return t("pointMetric", { measure: measureLabel(point.measure), stat: t(`pointStats.${point.stat}`) });
  };

  const display = (value: number) => {
    if (metric === "winRate") return format.number(value, { style: "percent", maximumFractionDigits: 0 });
    if (metric === "avgPlace") return format.number(value, { maximumFractionDigits: 2 });
    // Averages keep a decimal; games, highest and lowest are whole.
    return format.number(value, { maximumFractionDigits: pointMetric(metric)?.stat === "average" ? 1 : 0 });
  };

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
              className="w-[190px]"
              value={metric}
              onChange={(e) => isLeaderMetric(e.target.value) && setMetric(e.target.value)}
            >
              {METRIC_GROUPS.map(({ group, metrics }) => (
                <optgroup key={group} label={measureLabel(group)}>
                  {metrics.map((m) => (
                    <option key={m} value={m}>
                      {metricLabel(m)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </div>
          {/* A new order repaints every bar, top to bottom. */}
          <ol key={metric} className="flex flex-col gap-[13px] notebook:gap-[15px]">
            {ranked.map(({ leader, value, bar }, i) => {
              const style = leader.slug ? ARNAK_LEADER_STYLES[leader.slug] : null;
              return (
                <li key={leader.slug ?? "none"} className="flex items-center gap-3 notebook:gap-3.5">
                  {/* The portrait frame from the design, with the leader's emoji (a dash without one). */}
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-paper text-xl text-ink-muted shadow-portrait notebook:size-[46px] notebook:text-2xl"
                  >
                    {style ? style.emoji : "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px]">
                        <b className="font-semibold">{leader.slug ? tGame(`leaders.${leader.slug}`) : t("noLeader")}</b>{" "}
                        <span className="text-ink-muted">· {t("games", { count: leader.games })}</span>
                      </span>
                      <span className="shrink-0 text-[17px] font-bold">{display(value)}</span>
                    </div>
                    {/* Zero (e.g. no wins with a leader) draws a hairline, not a stroke. */}
                    <BrushBar value={bar} tone={style?.tone ?? "ink-muted"} index={i} />
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
