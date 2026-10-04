"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { NativeSelect } from "@/components/notebook/native-select";
import { BrushBar } from "@/components/notebook/painted-band";
import { cn } from "@/lib/utils";

import { RANKING_SORTS, type RankingRow, type RankingSort, rankRows } from "./ranking";

/**
 * The ranking: "Ordenar por", then one row per player, best first: the
 * position, the name and who they are to you, the sorted value with their
 * games, and a bar in the leader's (or side's) color. Your own row is bold,
 * with the bronze dot.
 */
export function RankingList({
  rows,
  tone,
  sorts = RANKING_SORTS,
  paintKey,
}: {
  rows: RankingRow[];
  /** The bars' color: the leader's or side's, bronze for all of them, grey for none recorded. */
  tone: Parameters<typeof BrushBar>[0]["tone"];
  /** What it can be sorted by: a duel has no points or places. */
  sorts?: readonly RankingSort[];
  /** Changes with the Consulta and the player filter: the bars paint again, the sort stays. */
  paintKey: string;
}) {
  const t = useTranslations("Rankings");
  const format = useFormatter();
  const locale = useLocale();
  const [sort, setSort] = useState<RankingSort>("winRate");
  const ranked = rankRows(rows, sort, locale);

  const display = (value: number) => {
    if (sort === "winRate") return format.number(value, { style: "percent", maximumFractionDigits: 0 });
    if (sort === "games" || sort === "maxPoints" || sort === "minPoints") return format.number(value);
    return format.number(value, { maximumFractionDigits: sort === "avgPlace" ? 2 : 1 });
  };
  const who = (row: RankingRow) => {
    if (row.kind === "me") return null;
    if (row.kind === "other_guest") return row.owner_name ? t("kinds.other_guest", { owner: row.owner_name }) : t("kinds.guest");
    return t(`kinds.${row.kind}`);
  };

  return (
    <div>
      <div className="mt-3 mb-3.5 flex items-center justify-end gap-2 notebook:mt-4 notebook:mb-4.5">
        <label htmlFor="ranking-sort" className="type-caption text-ink-muted">
          {t("sortBy")}
        </label>
        <NativeSelect
          id="ranking-sort"
          size="sm"
          className="w-[190px]"
          value={sort}
          onChange={(e) => setSort(e.target.value as RankingSort)}
        >
          {sorts.map((s) => (
            <option key={s} value={s}>
              {t(`sorts.${s}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {/* A new order or a new Consulta repaints every bar, top to bottom. */}
      <ol key={`${sort}|${paintKey}`} className="m-0 flex list-none flex-col p-0">
        {ranked.map(({ row, value, bar, position }, i) => {
          const relation = who(row);
          const me = row.kind === "me";
          return (
            <li key={row.player_id} className="flex items-center gap-4 border-b border-ink-body/14 py-3 last:border-b-0">
              <span aria-hidden className="w-6 shrink-0 text-center font-display text-[26px] leading-none font-bold text-ink-muted">
                {position}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px]">
                    <span className="sr-only">{position}. </span>
                    <span className={cn(me && "font-semibold text-ink")}>{me ? t("you") : row.name}</span>
                    {me && <span aria-hidden className="ml-1.5 inline-block size-[7px] rounded-full bg-bronze align-[2px]" />}
                    {relation && <span className="type-caption text-ink-muted"> · {relation}</span>}
                  </span>
                  <span className="shrink-0 text-[17px] font-bold">
                    {display(value)}
                    <span className="type-caption font-normal text-ink-muted"> · {t("games", { count: row.games })}</span>
                  </span>
                </p>
                {/* Zero (no wins, say) draws a hairline, not a stroke. */}
                <BrushBar value={bar} tone={tone} index={i} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
