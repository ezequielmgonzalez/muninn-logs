import { getFormatter, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { ARNAK_CATEGORY_TONES } from "@/games/arnak";

import { LeaderRanking } from "./leader-ranking";
import type { PlayerStats } from "./queries";
import { WinRateRing } from "./win-rate-ring";

/** A player's stats as laid out in design/mockups/profile.html. Needs games > 0. */
export async function StatsView({ stats }: { stats: PlayerStats }) {
  const [t, tGame, format] = await Promise.all([
    getTranslations("Stats"),
    getTranslations("Games.arnak"),
    getFormatter(),
  ]);
  const decimals = (value: number | null, digits: number) =>
    value === null ? "–" : format.number(value, { maximumFractionDigits: digits });

  return (
    <div className="grid gap-11 md:grid-cols-[minmax(0,22.5rem)_1fr]">
      <div className="flex flex-col gap-11">
        <section className="flex flex-col gap-5">
          <PaintedBand>{t("winRate")}</PaintedBand>
          <div className="flex justify-center">
            <WinRateRing
              rate={stats.wins / stats.games}
              label={format.number(stats.wins / stats.games, { style: "percent", maximumFractionDigits: 0 })}
              caption={t("ofGames", { count: stats.games })}
            />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              [t("wins"), String(stats.wins)],
              [t("avgPlace"), decimals(stats.avg_place, 2)],
              [t("avgPoints"), decimals(stats.avg_points, 1)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse gap-1">
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="type-stat-lg">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-5">
          <PaintedBand>{t("byCategory")}</PaintedBand>
          <ul className="flex flex-col px-1.5">
            {stats.categories.map((category) => (
              <li key={category.slug} className="flex items-center gap-2.5 border-b py-2.5 last:border-b-0">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: `var(--${ARNAK_CATEGORY_TONES[category.slug]})` }}
                />
                <span className="flex-1 text-[15px]">{tGame(`scoreCategories.${category.slug}`)}</span>
                <span className="text-[15px] font-semibold">{decimals(category.average, 1)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <LeaderRanking leaders={stats.leaders} />
    </div>
  );
}
