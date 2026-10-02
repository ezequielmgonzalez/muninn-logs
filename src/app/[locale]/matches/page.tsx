import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { InkButton } from "@/components/notebook/ink-button";
import { NotebookShell } from "@/components/notebook/notebook-shell";
import { TurnLink } from "@/components/notebook/page-turn";
import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { groupByMonth, type MonthGroup, spreadOf } from "@/features/matches/group-by-month";
import { MatchList } from "@/features/matches/match-list";
import { listMatches } from "@/features/matches/queries";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

/** Every game the user logged or played, a month per notebook page, newest first. */
export default async function MatchesPage({ searchParams }: PageProps<"/[locale]/matches">) {
  const [profile, locale, t, format, { page }] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Matches"),
    getFormatter(),
    searchParams,
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  // A group's whole history fits in one read; months are paged here.
  const matches = await listMatches(1000);
  const title = <h1 className="sr-only">{t("title")}</h1>;

  if (matches.length === 0) {
    return (
      <NotebookShell
        active="matches"
        left={
          <>
            {title}
            <PaintedBand>{t("title")}</PaintedBand>
            <p className="type-caption mt-5.5 mb-8 text-ink-muted">{t("empty")}</p>
            <InkButton asChild>
              <Link href="/matches/new">{t("logFirst")}</Link>
            </InkButton>
          </>
        }
      />
    );
  }

  const months = groupByMonth(matches);
  const { current, spreads, left, right } = spreadOf(months, Number(page) || 0);

  // "Septiembre 2026": the month capitalized, without "de".
  const monthTitle = (group: MonthGroup) => {
    if (!group.month) return t("undated");
    const date = new Date(`${group.month}-01T00:00:00Z`);
    const month = format.dateTime(date, { month: "long", timeZone: "UTC" });
    return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getUTCFullYear()}`;
  };
  const month = (group: MonthGroup, flip: boolean) => (
    <section>
      <PaintedBand variant={flip ? 2 : 1} flip={flip}>
        {monthTitle(group)}
      </PaintedBand>
      <div className="mt-2.5 notebook:mt-3">
        <MatchList matches={group.matches} />
      </div>
    </section>
  );
  // Older months are further into the diary: the page turns forward to them.
  const pageLink = (to: number, label: string) => (
    <Button asChild variant="link">
      <TurnLink
        href={to === 0 ? "/matches" : { pathname: "/matches", query: { page: String(to) } }}
        direction={to > current ? "forward" : "backward"}
      >
        {label}
      </TurnLink>
    </Button>
  );

  const pager = (
    <div className="mt-5.5 flex items-center justify-between gap-3">
      {current > 0 ? pageLink(current - 1, `← ${t("newer")}`) : <span />}
      <span className="type-caption hidden text-ink-muted notebook:inline">
        {t("pages", { from: current * 2 + 1, to: current * 2 + (right ? 2 : 1), total: months.length })}
      </span>
      {current < spreads - 1 ? pageLink(current + 1, `${t("older")} →`) : <span />}
    </div>
  );

  return (
    <NotebookShell
      active="matches"
      left={
        <>
          {title}
          {left && month(left, false)}
          {!right && pager}
        </>
      }
      right={
        right && (
          <>
            {month(right, true)}
            {pager}
          </>
        )
      }
    />
  );
}
