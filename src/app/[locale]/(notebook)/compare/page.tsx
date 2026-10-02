import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { InkButton } from "@/components/notebook/ink-button";
import { NotebookPage } from "@/components/notebook/notebook-page";
import { BrushBar, PaintedBand, PLAYER_TONES } from "@/components/notebook/painted-band";
import { getFriendByUsername, getFriendships } from "@/features/friends/queries";
import { categoryBars, type ComparisonRow, compareStats } from "@/features/stats/compare";
import { NativeSelect } from "@/components/notebook/native-select";
import { getPlayerCount } from "@/features/player-count/server";
import { type ComparableStats, getPlayerStats, getSharedStats } from "@/features/stats/queries";
import { ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** You plus up to this many friends, so the table still fits a phone. */
const MAX_FRIENDS = 4;

export default async function ComparePage({ searchParams }: PageProps<"/[locale]/compare">) {
  const [profile, locale, t, tGame, format] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Compare"),
    getTranslations("Games.arnak"),
    getFormatter(),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  // ?with=beto&with=carla (the picker's checkboxes). Only accepted friends count.
  // ?scope=together compares only the games all of them played together.
  const { with: withParam, scope: scopeParam } = await searchParams;
  const scope = scopeParam === "together" ? "together" : "all";
  const requested = [...new Set([withParam ?? []].flat())].slice(0, MAX_FRIENDS);
  const [{ friends }, ...found] = await Promise.all([
    getFriendships(profile.id),
    ...requested.map((username) => getFriendByUsername(profile.id, username)),
  ]);
  const chosen = found.filter((f) => f !== null);

  const players = await getPlayerCount();
  const stats: ComparableStats[] =
    chosen.length === 0
      ? []
      : scope === "together"
        ? await getSharedStats(
            chosen.map((f) => f.id),
            players,
          )
        : await Promise.all([profile, ...chosen].map((p) => getPlayerStats(p.id, players)));
  // Together, everyone has the same games: none means they never all sat at one table.
  const shared = scope === "together" ? (stats[0]?.games ?? 0) : null;
  const comparing = chosen.length > 0 && shared !== 0;
  const rows = comparing ? compareStats(stats) : [];

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

  const names = [t("you"), ...chosen.map((f) => f.display_name)];
  const bars = comparing ? categoryBars(stats) : [];
  const dot = (i: number) => (
    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--${PLAYER_TONES[i]})` }} />
  );

  // Picking friends: a plain GET form, so the selection lives in the URL and
  // can be shared or bookmarked. Chips are checkboxes, painted when checked.
  const picker =
    friends.length === 0 ? (
      <p className="type-caption mt-5 text-ink-muted">{t("noFriends")}</p>
    ) : (
      <form method="get">
        <fieldset className="mt-5">
          <legend className="type-caption text-sm text-ink-muted">{t("choose", { max: MAX_FRIENDS })}</legend>
          <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-2.5">
            {friends
              .filter((f) => f.username)
              .map((f) => (
                <label
                  key={f.id}
                  className="group relative inline-flex h-10 cursor-pointer items-center border-b-[1.5px] border-ink-body/30 px-4 text-[15px] text-ink-body has-checked:border-transparent has-checked:text-band-text has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-bronze"
                >
                  <input
                    type="checkbox"
                    name="with"
                    value={f.username!}
                    defaultChecked={chosen.some((c) => c.id === f.id)}
                    className="peer sr-only"
                  />
                  <span aria-hidden className="ink ink--tab paint-in -inset-x-1.5 -inset-y-1 hidden bg-ink peer-checked:block" />
                  <span className="relative z-2">{f.display_name}</span>
                </label>
              ))}
          </div>
        </fieldset>
        <div className="mt-5.5">
          <label htmlFor="compare-scope" className="type-label">
            {t("scopeLabel")}
          </label>
          <NativeSelect id="compare-scope" name="scope" defaultValue={scope}>
            <option value="all">{t("scopes.all")}</option>
            <option value="together">{t("scopes.together")}</option>
          </NativeSelect>
        </div>
        <InkButton type="submit" className="mt-5.5 notebook:mt-[26px]">
          {t("submit")}
        </InkButton>
      </form>
    );

  const chart = (
    <section className="order-3">
      <PaintedBand variant={2} flip>
        {t("chartTitle")}
      </PaintedBand>
      <p aria-hidden className="mt-4.5 mb-3.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {names.map((name, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {dot(i)}
            {name}
          </span>
        ))}
      </p>
      <ul>
        {bars.map((category) => (
          <li key={category.slug} className="mb-3.5">
            <p className="m-0 mb-0.5 text-sm">{tGame(`scoreCategories.${category.slug}`)}</p>
            <ul>
              {category.players.map((player, i) => (
                <li key={i} className="mt-1">
                  <span className="sr-only">
                    {t("chartValue", { name: names[i], value: display(category.slug, player.value) })}
                  </span>
                  <BrushBar
                    value={player.bar}
                    tone={PLAYER_TONES[i]}
                    size="thin"
                    index={i + bars.indexOf(category)}
                    // Top to bottom, at half the usual step: up to 25 bars.
                    order={(bars.indexOf(category) * category.players.length + i) / 2}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );

  const table = (
    <>
      <PaintedBand as="h1">{t("title", { names: format.list(chosen.map((f) => f.display_name)) })}</PaintedBand>
      <div className="mt-3.5 overflow-x-auto notebook:mt-4.5">
        <table className="w-full border-collapse text-sm notebook:text-[15px]">
          <thead>
            <tr>
              <th scope="col" className="w-[34%] border-b-[1.5px] border-ink-body/40 px-1 pt-2 pb-2.5 text-left font-normal text-ink-muted notebook:w-[38%]">
                {t("stat")}
              </th>
              {names.map((name, i) => (
                <th key={i} scope="col" className="border-b-[1.5px] border-ink-body/40 px-1 pt-2 pb-2.5 text-center font-semibold">
                  <span className="inline-flex max-w-full items-center gap-1.5">
                    {dot(i)}
                    <span className="truncate">{name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="border-b border-ink-body/14 px-1 py-[9px] text-left font-normal text-ink-body">
                  {label(row.key)}
                </th>
                {row.values.map((value, i) => (
                  <td
                    key={i}
                    className={cn(
                      "border-b border-ink-body/14 px-1 py-[9px] text-center",
                      row.best[i] ? "font-bold text-ink-body" : "text-ink-muted",
                    )}
                  >
                    {display(row.key, value)}
                    {row.best[i] && (
                      <>
                        <span aria-hidden className="ml-[5px] inline-block size-[7px] rounded-full bg-bronze align-[2px]" />
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
      <p className="type-caption mt-3 text-ink-muted">
        <span aria-hidden className="mr-1.5 inline-block size-[7px] rounded-full bg-bronze align-[2px]" />
        {t("bestNote")}
      </p>
      <p className="type-caption mt-2 text-ink-muted">
        {shared === null ? t("note") : t("noteTogether", { count: shared })}
      </p>
    </>
  );

  return (
    // Amigos stays current (sections.ts): comparing is reached from there.
    <>
      {/* On phones the left page dissolves so the table can sit between the chips and the chart. */}
      <NotebookPage side="left" className={comparing ? "max-notebook:contents" : undefined}>
        <section className="order-1">
          <PaintedBand as={comparing ? "h2" : "h1"}>{t("pickTitle")}</PaintedBand>
          {picker}
        </section>
        {/* A new player count paints the chart and the table again. */}
        {comparing && (
          <div key={players ?? "all"} className="mt-11 max-notebook:mt-0 max-notebook:contents">
            {chart}
          </div>
        )}
        {chosen.length > 0 && !comparing && (
          <p role="status" className="type-body-strong mt-8.5 text-ink-body">
            {t("noShared")}
          </p>
        )}
      </NotebookPage>
      {comparing && (
        <NotebookPage side="right" order={2}>
          <Fragment key={players ?? "all"}>{table}</Fragment>
        </NotebookPage>
      )}
    </>
  );
}
