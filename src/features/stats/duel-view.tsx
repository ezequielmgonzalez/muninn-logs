import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { BrushBar, PaintedBand } from "@/components/notebook/painted-band";
import { LOTR_SIDE_STYLES, LOTR_SIDES, LOTR_VICTORIES, LOTR_VICTORY_TONES } from "@/games/lotr-duel";

import type { OpponentRecord } from "./duel-records";
import type { DuelStats } from "./queries";
import { WinRateRing } from "./win-rate-ring";

// LOTR Duel stats, in pieces the notebook puts on its pages like Arnak's
// (stats-view.tsx). A duel has no points or places: what it has is wins,
// draws and losses, the side each was played with, and how it was won.

async function getDuelFormat() {
  const [t, tGame, format] = await Promise.all([getTranslations("Stats"), getTranslations("Games.lotr-duel"), getFormatter()]);
  const percent = (value: number) => format.number(value, { style: "percent", maximumFractionDigits: 0 });
  return { t, tGame, percent };
}

/** Three numbers in a row, label under value (Inicio's summary and the stats' wins, draws, losses). */
function Figures({ items, className }: { items: [string, string][]; className?: string }) {
  return (
    <dl className={className ?? "grid grid-cols-3 text-center"}>
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col-reverse">
          <dt className="type-caption text-ink-muted">{label}</dt>
          <dd className="type-stat-num m-0 text-ink-body">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Inicio's "Tu resumen" for duels: win rate, draws and games. */
export async function DuelSummary({ stats }: { stats: DuelStats }) {
  const { t, percent } = await getDuelFormat();
  return (
    <Figures
      className="mt-[26px] grid grid-cols-3 text-center"
      items={[
        [t("winRate"), percent(stats.wins / stats.games)],
        [t("draws"), String(stats.draws)],
        [t("gamesLabel"), String(stats.games)],
      ]}
    />
  );
}

/** The ring, then wins, draws and losses. `note` goes under the title. */
export async function DuelWinRateSection({ stats, className, note }: { stats: DuelStats; className?: string; note?: ReactNode }) {
  const { t, percent } = await getDuelFormat();
  const rate = stats.wins / stats.games;
  return (
    <section className={className}>
      <PaintedBand>{t("winRate")}</PaintedBand>
      {note}
      <div className="flex justify-center pt-5.5 pb-1">
        <WinRateRing rate={rate} label={percent(rate)} caption={t("ofGames", { count: stats.games })} />
      </div>
      <Figures
        className="mt-2 grid grid-cols-3 text-center notebook:mt-2.5"
        items={[
          [t("wins"), String(stats.wins)],
          [t("draws"), String(stats.draws)],
          [t("losses"), String(stats.games - stats.wins - stats.draws)],
        ]}
      />
    </section>
  );
}

/** Per side: how often it won, as a bar in the side's color. Both sides, played or not. */
export async function SidesSection({
  stats,
  title,
  className,
  flip = false,
}: {
  stats: DuelStats;
  title?: string;
  className?: string;
  flip?: boolean;
}) {
  const { t, tGame, percent } = await getDuelFormat();
  return (
    <section className={className}>
      <PaintedBand variant={2} flip={flip}>
        {title ?? t("bySide")}
      </PaintedBand>
      <ol className="mt-[26px] flex flex-col gap-[13px] notebook:gap-[15px]">
        {LOTR_SIDES.map((side, i) => {
          const played = stats.leaders.find((l) => l.slug === side);
          const games = played?.games ?? 0;
          const rate = games > 0 ? played!.wins / games : 0;
          return (
            <li key={side} className="flex items-center gap-3 notebook:gap-3.5">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-paper text-xl shadow-portrait notebook:size-[46px] notebook:text-2xl"
              >
                {LOTR_SIDE_STYLES[side].emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px]">
                    <b className="font-semibold">{tGame(`sidesShort.${side}`)}</b>{" "}
                    {games > 0 && <span className="text-ink-muted">· {t("sideWinRate", { rate: percent(rate) })}</span>}
                  </span>
                  <span className="shrink-0 text-[17px] font-bold">
                    {games} <span className="type-caption font-normal text-ink-muted">{t("gamesWord", { count: games })}</span>
                  </span>
                </div>
                <BrushBar value={rate} tone={LOTR_SIDE_STYLES[side].tone} index={i} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** How the player's duels were won and lost: one bar per victory, scaled to the most common. */
export async function VictoriesSection({ stats, className }: { stats: DuelStats; className?: string }) {
  const { t, tGame } = await getDuelFormat();
  const count = (slug: (typeof LOTR_VICTORIES)[number], key: "wins" | "losses") =>
    stats.victories.find((v) => v.slug === slug)?.[key] ?? 0;
  const most = Math.max(1, ...stats.victories.flatMap((v) => [v.wins, v.losses]));
  const list = (key: "wins" | "losses", title: string, flip: boolean) => (
    <section className={flip ? "mt-8.5" : undefined}>
      <PaintedBand variant={flip ? 2 : 1} flip={flip}>
        {title}
      </PaintedBand>
      <ul className="mt-5 flex flex-col gap-3">
        {LOTR_VICTORIES.map((slug, i) => (
          <li key={slug}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[15px]">
              <span>{tGame(`victories.${slug}`)}</span>
              <b className="font-semibold">{count(slug, key)}</b>
            </div>
            <BrushBar value={count(slug, key) / most} tone={LOTR_VICTORY_TONES[slug]} index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className={className}>
      {list("wins", t("howWon"), false)}
      {list("losses", t("howLost"), true)}
    </div>
  );
}

/** The user's record against each opponent: wins, draws and losses, and a bar of the wins' share. */
export async function OpponentsSection({ records, className }: { records: OpponentRecord[]; className?: string }) {
  const { t, percent } = await getDuelFormat();
  return (
    <section className={className}>
      <PaintedBand>{t("vsOpponents")}</PaintedBand>
      <ul className="mt-5 flex flex-col gap-3">
        {records.map((r, i) => (
          <li key={r.playerId}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[15px]">
              <span className="truncate">
                <b className="font-semibold">{r.name}</b>{" "}
                <span className="text-ink-muted">· {t("record", { wins: r.wins, draws: r.draws, losses: r.losses })}</span>
              </span>
              <b className="shrink-0 font-semibold">{percent(r.wins / r.games)}</b>
            </div>
            <BrushBar value={r.wins / r.games} tone="player-you" index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}
