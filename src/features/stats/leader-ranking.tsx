"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { NativeSelect } from "@/components/notebook/native-select";
import { BrushBar, PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { ARNAK_CATEGORY_TONES, ARNAK_LEADER_STYLES } from "@/games/arnak";
import { cn } from "@/lib/utils";

import {
  isLeaderMetric,
  type LeaderMetric,
  METRIC_GROUPS,
  POINT_MEASURES,
  pointMetric,
  pointsOf,
  rankLeaders,
} from "./leader-metrics";
import type { LeaderStats } from "./queries";

/** A leader's page reads left to right, lowest to highest. */
const COLUMNS = ["min", "average", "max"] as const;

/** Games played without a leader are "none" here. */
const keyOf = (leader: LeaderStats) => leader.slug ?? "none";

/**
 * "Which leader am I best with?": the design's ranking card, re-sorted by the
 * chosen stat. Games with no leader recorded rank as "Sin especificar". Tapping a
 * leader opens their own numbers (LeaderDetail), with a way back.
 */
export function LeaderRanking({ leaders }: { leaders: LeaderStats[] }) {
  const t = useTranslations("Stats");
  const tGame = useTranslations("Games.arnak");
  const format = useFormatter();
  const [metric, setMetric] = useState<LeaderMetric>("winRate");
  const [open, setOpen] = useState<string | null>(null);
  // Back from a leader's page, focus returns to their row.
  const returnTo = useRef<string | null>(null);
  const rowsRef = useRef<HTMLOListElement>(null);
  const ranked = rankLeaders(leaders, metric);
  const paintKey = `${metric}|${ranked.map(({ leader, value }) => `${keyOf(leader)}:${value}`).join(",")}`;
  const opened = leaders.find((l) => keyOf(l) === open);

  useEffect(() => {
    if (open || !returnTo.current) return;
    rowsRef.current?.querySelector<HTMLElement>(`[data-leader="${returnTo.current}"]`)?.focus();
    returnTo.current = null;
  }, [open]);

  const nameOf = (leader: LeaderStats) => (leader.slug ? tGame(`leaders.${leader.slug}`) : t("noLeader"));
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
      ) : opened ? (
        <LeaderDetail
          key={keyOf(opened)}
          leader={opened}
          name={nameOf(opened)}
          onBack={() => {
            returnTo.current = keyOf(opened);
            setOpen(null);
          }}
        />
      ) : (
        <div>
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
          {/* A new order, or new numbers (another player count), repaints every bar, top to bottom. */}
          <ol ref={rowsRef} key={paintKey} className="flex flex-col gap-[5px] notebook:gap-[7px]">
            {ranked.map(({ leader, value, bar }, i) => {
              const style = leader.slug ? ARNAK_LEADER_STYLES[leader.slug] : null;
              return (
                <li key={keyOf(leader)}>
                  {/* The whole row (frame, name and bar) opens the leader's own numbers. */}
                  <button
                    type="button"
                    data-leader={keyOf(leader)}
                    aria-label={t("openLeader", { name: nameOf(leader) })}
                    onClick={() => setOpen(keyOf(leader))}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-sm py-1 text-left outline-none hover:bg-ink-body/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze notebook:gap-3.5"
                  >
                    {/* The portrait frame from the design, with the leader's emoji (a dash without one). */}
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-paper text-xl text-ink-muted shadow-portrait notebook:size-[46px] notebook:text-2xl"
                    >
                      {style ? style.emoji : "–"}
                    </span>
                    <span className="block min-w-0 flex-1">
                      <span className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[15px]">
                          <b className="font-semibold">{nameOf(leader)}</b>{" "}
                          <span className="text-ink-muted">· {t("games", { count: leader.games })}</span>
                        </span>
                        <span className="shrink-0 text-[17px] font-bold">{display(value)}</span>
                      </span>
                      {/* Zero (e.g. no wins with a leader) draws a hairline, not a stroke. */}
                      <BrushBar value={bar} tone={style?.tone ?? "ink-muted"} index={i} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

/** One leader's numbers: their record, then the lowest, average and highest points of the total and each category. */
function LeaderDetail({ leader, name, onBack }: { leader: LeaderStats; name: string; onBack: () => void }) {
  const t = useTranslations("Stats");
  const tGame = useTranslations("Games.arnak");
  const format = useFormatter();
  const back = useRef<HTMLButtonElement>(null);
  const style = leader.slug ? ARNAK_LEADER_STYLES[leader.slug] : null;

  // Opening it moves focus here, so keyboard and screen reader users land on the new content.
  useEffect(() => back.current?.focus(), []);

  const number = (value: number, digits: number) => format.number(value, { maximumFractionDigits: digits });

  return (
    <div>
      <p className="mt-2.5 mb-3 notebook:mt-4">
        <Button ref={back} type="button" variant="link" onClick={onBack}>
          ← {t("allLeaders")}
        </Button>
      </p>
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-[52px] shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-paper text-[28px] text-ink-muted shadow-portrait"
        >
          {style ? style.emoji : "–"}
        </span>
        <div className="min-w-0">
          <h3 className="type-entry-title m-0 truncate">{name}</h3>
          <p className="type-caption m-0 text-ink-muted">
            {t("leaderSummary", {
              games: t("games", { count: leader.games }),
              rate: format.number(leader.wins / leader.games, { style: "percent", maximumFractionDigits: 0 }),
              place: number(leader.avg_place, 2),
            })}
          </p>
        </div>
      </div>
      <table className="mt-4.5 w-full border-collapse text-[15px]">
        <thead>
          <tr>
            <th scope="col" className="border-b-[1.5px] border-ink-body/40 px-1 pb-2 text-left font-normal text-ink-muted">
              {t("columns.measure")}
            </th>
            {COLUMNS.map((stat) => (
              <th key={stat} scope="col" className="w-[19%] border-b-[1.5px] border-ink-body/40 px-1 pb-2 text-right font-semibold">
                {t(`columns.${stat}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {POINT_MEASURES.map((measure) => {
            const points = pointsOf(leader, measure);
            const total = measure === "total";
            return (
              <tr key={measure} className={total ? "font-semibold" : undefined}>
                <th
                  scope="row"
                  className={cn("border-b border-ink-body/14 px-1 py-[9px] text-left", total ? "font-semibold" : "font-normal")}
                >
                  <span className="flex items-center gap-2">
                    {!total && (
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: `var(--${ARNAK_CATEGORY_TONES[measure]})` }}
                      />
                    )}
                    {total ? t("metricGroups.total") : tGame(`scoreCategories.${measure}`)}
                  </span>
                </th>
                {COLUMNS.map((stat) => (
                  <td key={stat} className="border-b border-ink-body/14 px-1 py-[9px] text-right tabular-nums">
                    {points ? number(points[stat], stat === "average" ? 1 : 0) : "–"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
