import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { getFriendByUsername, getFriendships } from "@/features/friends/queries";
import { type ComparisonRow, compareStats } from "@/features/stats/compare";
import { getPlayerStats } from "@/features/stats/queries";
import { ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** You plus up to this many friends, so the table still fits a phone. */
const MAX_FRIENDS = 4;

export default async function ComparePage({ searchParams }: PageProps<"/[locale]/compare">) {
  const [profile, locale, t, tHome, tGame, format] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Compare"),
    getTranslations("HomePage"),
    getTranslations("Games.arnak"),
    getFormatter(),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  // ?with=beto&with=carla (the picker's checkboxes). Only accepted friends count.
  const { with: withParam } = await searchParams;
  const requested = [...new Set([withParam ?? []].flat())].slice(0, MAX_FRIENDS);
  const [{ friends }, ...found] = await Promise.all([
    getFriendships(profile.id),
    ...requested.map((username) => getFriendByUsername(profile.id, username)),
  ]);
  const chosen = found.filter((f) => f !== null);

  const stats = await Promise.all([profile, ...chosen].map((p) => getPlayerStats(p.id)));
  const rows = chosen.length > 0 ? compareStats(stats) : [];

  const label = (key: ComparisonRow["key"]) =>
    (ARNAK_SCORE_CATEGORIES as readonly string[]).includes(key)
      ? tGame(`scoreCategories.${key as (typeof ARNAK_SCORE_CATEGORIES)[number]}`)
      : t(`rows.${key as "games" | "winRate" | "avgPlace" | "avgPoints"}`);

  const display = (key: ComparisonRow["key"], value: number | null) => {
    if (value === null) return "–";
    if (key === "winRate") return format.number(value, { style: "percent", maximumFractionDigits: 0 });
    if (key === "games") return String(value);
    return format.number(value, { maximumFractionDigits: key === "avgPlace" ? 2 : 1 });
  };

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-11">
        <PaintedBand as="h1">
          {chosen.length > 0 ? t("title", { names: format.list(chosen.map((f) => f.display_name)) }) : t("pickTitle")}
        </PaintedBand>

        {friends.length === 0 ? (
          <p className="type-caption text-ink-muted">{t("noFriends")}</p>
        ) : (
          // A plain GET form: the selection lives in the URL, so it can be shared or bookmarked.
          <form method="get" className="flex flex-col gap-3">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm text-ink-muted">{t("choose", { max: MAX_FRIENDS })}</legend>
              <div className="flex flex-wrap gap-2">
                {friends
                  .filter((f) => f.username)
                  .map((f) => (
                    <label
                      key={f.id}
                      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground"
                    >
                      <input
                        type="checkbox"
                        name="with"
                        value={f.username!}
                        defaultChecked={chosen.some((c) => c.id === f.id)}
                        className="sr-only"
                      />
                      {f.display_name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <Button type="submit" variant="outline" className="h-11 self-start text-base">
              {t("submit")}
            </Button>
          </form>
        )}

        {chosen.length > 0 && (
          <>
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[20rem] table-fixed border-collapse">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="w-28 pb-2 text-left text-sm font-medium text-ink-muted">
                      {t("stat")}
                    </th>
                    {[t("you"), ...chosen.map((f) => f.display_name)].map((name) => (
                      <th key={name} scope="col" className="truncate px-1 pb-2 text-center type-body-strong">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b last:border-b-0">
                      <th scope="row" className="py-3 text-left text-sm font-medium">
                        {label(row.key)}
                      </th>
                      {row.values.map((value, i) => (
                        <td
                          key={i}
                          className={cn("py-3 text-center", row.best[i] ? "type-stat-lg text-ink-body" : "text-ink-muted")}
                        >
                          {display(row.key, value)}
                          {row.best[i] && (
                            <>
                              <span aria-hidden className="ml-1 inline-block size-2 rounded-full bg-bronze align-middle" />
                              <span className="sr-only"> ({t("better")})</span>
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="type-caption text-ink-muted">{t("note")}</p>
          </>
        )}
      </main>
    </>
  );
}
