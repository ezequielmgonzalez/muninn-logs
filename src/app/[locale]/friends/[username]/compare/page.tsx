import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { getFriendByUsername } from "@/features/friends/queries";
import { type ComparisonRow, compareStats } from "@/features/stats/compare";
import { getPlayerStats } from "@/features/stats/queries";
import { ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default async function ComparePage({ params }: PageProps<"/[locale]/friends/[username]/compare">) {
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

  const { username } = await params;
  const friend = await getFriendByUsername(profile.id, decodeURIComponent(username));
  if (!friend) notFound();

  const [mine, theirs] = await Promise.all([getPlayerStats(profile.id), getPlayerStats(friend.id)]);
  const rows = compareStats(mine, theirs);

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

  const cell = (row: ComparisonRow, side: "mine" | "theirs") => {
    const isBetter = row.better === side;
    return (
      <td className={cn("py-3 text-center", isBetter ? "type-stat-lg text-ink-body" : "text-ink-muted")}>
        {display(row.key, row[side])}
        {isBetter && (
          <>
            <span aria-hidden className="ml-1 inline-block size-2 rounded-full bg-bronze align-middle" />
            <span className="sr-only"> ({t("better")})</span>
          </>
        )}
      </td>
    );
  };

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-11">
        <Link
          href={`/friends/${friend.username}`}
          className="text-sm text-ink-muted underline-offset-4 hover:underline"
        >
          ← {tHome("journal", { name: friend.display_name })}
        </Link>
        <PaintedBand as="h1">{t("title", { name: friend.display_name })}</PaintedBand>
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b">
              <th scope="col" className="w-2/5 pb-2 text-left text-sm font-medium text-ink-muted">
                {t("stat")}
              </th>
              <th scope="col" className="pb-2 text-center type-body-strong">
                {t("you")}
              </th>
              <th scope="col" className="truncate pb-2 text-center type-body-strong">
                {friend.display_name}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-b-0">
                <th scope="row" className="py-3 text-left text-sm font-medium">
                  {label(row.key)}
                </th>
                {cell(row, "mine")}
                {cell(row, "theirs")}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="type-caption text-ink-muted">{t("note")}</p>
      </main>
    </>
  );
}
