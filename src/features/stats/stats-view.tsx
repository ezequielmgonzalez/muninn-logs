import { getFormatter, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { ARNAK_CATEGORY_TONES } from "@/games/arnak";

import type { PlayerStats } from "./queries";
import { WinRateRing } from "./win-rate-ring";

// A player's stats (design/screens/estadisticas-*.html), in pieces so the
// notebook can put them on its pages, with LeaderRanking. All need games > 0.

async function getStatsFormat() {
  const [t, tGame, format] = await Promise.all([
    getTranslations("Stats"),
    getTranslations("Games.arnak"),
    getFormatter(),
  ]);
  const decimals = (value: number | null, digits: number) =>
    value === null ? "–" : format.number(value, { maximumFractionDigits: digits });
  return { t, tGame, format, decimals };
}

/** The ring, then wins, average place and average points. */
export async function WinRateSection({ stats, className }: { stats: PlayerStats; className?: string }) {
  const { t, format, decimals } = await getStatsFormat();
  const rate = stats.wins / stats.games;
  return (
    <section className={className}>
      <PaintedBand>{t("winRate")}</PaintedBand>
      <div className="flex justify-center pt-5.5 pb-1">
        <WinRateRing
          rate={rate}
          label={format.number(rate, { style: "percent", maximumFractionDigits: 0 })}
          caption={t("ofGames", { count: stats.games })}
        />
      </div>
      <dl className="mt-2 grid grid-cols-3 text-center notebook:mt-2.5">
        {[
          [t("wins"), String(stats.wins)],
          [t("avgPlace"), decimals(stats.avg_place, 2)],
          [t("avgPoints"), decimals(stats.avg_points, 1)],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="type-caption text-ink-muted">{label}</dt>
            <dd className="type-stat-num m-0 text-ink-body">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Average points per category, adding up to the average total. */
export async function CategoriesSection({ stats, className }: { stats: PlayerStats; className?: string }) {
  const { t, tGame, decimals } = await getStatsFormat();
  return (
    <section className={className}>
      <PaintedBand variant={2} flip>
        {t("byCategory")}
      </PaintedBand>
      <div className="px-1 pt-3">
        <ul>
          {stats.categories.map((category) => (
            <li key={category.slug} className="flex items-center gap-2.5 border-b border-ink-body/14 py-[9px] text-[15px]">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: `var(--${ARNAK_CATEGORY_TONES[category.slug]})` }}
              />
              <span className="flex-1">{tGame(`scoreCategories.${category.slug}`)}</span>
              <b className="font-semibold">{decimals(category.average, 1)}</b>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-[3px] flex items-baseline gap-2.5 border-t border-ink-body/35 pt-[11px]">
          <span className="flex-1 pl-5 text-[15px] italic">{t("avgPoints")}</span>
          <b className="text-lg">{decimals(stats.avg_points, 1)}</b>
        </p>
      </div>
    </section>
  );
}
