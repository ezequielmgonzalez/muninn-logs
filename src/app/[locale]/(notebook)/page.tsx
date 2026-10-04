import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { CompassRose } from "@/components/notebook/icons";
import { InkButton } from "@/components/notebook/ink-button";
import { DiaryIdentity, NotebookPages } from "@/components/notebook/notebook-shell";
import { BrushBar, PaintedBand } from "@/components/notebook/painted-band";
import { PaperSheet } from "@/components/notebook/paper-sheet";
import { Button } from "@/components/ui/button";
import { TurnLink } from "@/components/notebook/page-turn";
import { signOut } from "@/features/auth/actions";
import { DidYouKnow } from "@/features/facts/did-you-know";
import { countIncomingRequests } from "@/features/friends/queries";
import { listReceivedClaims } from "@/features/guests/queries";
import { ReceivedClaims } from "@/features/guests/received-claims";
import { MatchList } from "@/features/matches/match-list";
import { listMatches } from "@/features/matches/queries";
import { noGamesFor, PlayerCountsNote } from "@/features/player-count/copy";
import { playerCountsKey } from "@/features/player-count/options";
import { getPlayerCounts } from "@/features/player-count/server";
import { getPlayerStats } from "@/features/stats/queries";
import { ARNAK_LEADER_STYLES } from "@/games/arnak";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { isEnabled } from "@/lib/flags";

export default async function Home({ searchParams }: PageProps<"/[locale]">) {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("HomePage"),
  ]);
  if (!profile) return <Landing searchParams={searchParams} />;
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const players = await getPlayerCounts();
  const [tStats, tAuth, tEdit, tGuests, tAdmin, tImport, tLeaders, format, stats, recent, incomingRequests, claims, admin, params] =
    await Promise.all([
      getTranslations("Stats"),
      getTranslations("Auth"),
      getTranslations("EditProfile"),
      getTranslations("Guests"),
      getTranslations("AdminGuests"),
      getTranslations("AdminImport"),
      getTranslations("Games.arnak.leaders"),
      getFormatter(),
      getPlayerStats(profile.id, players),
      listMatches(4, players),
      countIncomingRequests(profile.id),
      listReceivedClaims(),
      isAdmin(),
      // profileSaved: set by "Editar perfil". linked: games moved by accepting a guest link.
      searchParams,
    ]);
  const { profileSaved, linked } = params;
  const percent = (value: number) => format.number(value, { style: "percent", maximumFractionDigits: 0 });

  // "Tus líderes": the three most played, bars scaled to the first.
  const topLeaders = stats.leaders
    .filter((l): l is typeof l & { slug: NonNullable<typeof l.slug> } => l.slug !== null)
    .sort((a, b) => b.games - a.games)
    .slice(0, 3);
  const mostGames = topLeaders[0]?.games ?? 0;

  // A new player count paints the screen again: every block rises, every bar fills.
  const fresh = playerCountsKey(players);
  const left = (
    <Fragment key={fresh}>
      {/* On phones the diary's name opens the page; on desktop it's on the insert. */}
      <DiaryIdentity className="mb-11 text-center notebook:hidden" />
      <h1 className="sr-only">{t("journal", { name: profile.display_name })}</h1>
      {claims.length > 0 && <ReceivedClaims claims={claims} />}
      {typeof linked === "string" && (
        <p role="status" className="type-body-strong mb-8 text-center text-ink-body">
          {tGuests("linked", { count: Number(linked) })}
        </p>
      )}
      {profileSaved === "1" && (
        <p role="status" className="type-body-strong mb-8 text-center text-ink-body">
          {tEdit("saved")}
        </p>
      )}

      <section>
        <PaintedBand>{t("summary")}</PaintedBand>
        <PlayerCountsNote counts={players} />
        {stats.games === 0 ? (
          <p className="type-caption mt-[26px] text-ink-muted">
            {players ? await noGamesFor(players) : t("noMatches")}
          </p>
        ) : (
          <>
            <dl className="mt-[26px] grid grid-cols-3 text-center">
              {[
                [tStats("winRate"), percent(stats.wins / stats.games)],
                [tStats("avgPlace"), format.number(stats.avg_place ?? 0, { maximumFractionDigits: 2 })],
                [t("games"), String(stats.games)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="type-caption text-ink-muted">{label}</dt>
                  <dd className="type-stat-num m-0 text-ink-body">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5.5 flex justify-end">
              <Button asChild variant="link">
                <TurnLink href="/profile" direction="forward" section="stats">
                  {t("seeStats")} →
                </TurnLink>
              </Button>
            </p>
          </>
        )}
      </section>

      {topLeaders.length > 0 && (
        <section className="mt-11">
          <PaintedBand variant={2} flip>
            {t("leaders")}
          </PaintedBand>
          <ol className="mt-[26px] flex flex-col gap-[13px] notebook:gap-[15px]">
            {topLeaders.map((leader, i) => {
              const style = ARNAK_LEADER_STYLES[leader.slug];
              return (
                <li key={leader.slug} className="flex items-center gap-3 notebook:gap-3.5">
                  {/* The portrait frame from the design, with the leader's emoji. */}
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-paper text-xl shadow-portrait notebook:size-[46px] notebook:text-2xl"
                  >
                    {style.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px]">
                        <b className="font-semibold">{tLeaders(leader.slug)}</b>{" "}
                        <span className="text-ink-muted">· {t("leaderWinRate", { rate: percent(leader.wins / leader.games) })}</span>
                      </span>
                      <span className="shrink-0 text-[17px] font-bold">
                        {leader.games}{" "}
                        <span className="type-caption font-normal text-ink-muted">{t("leaderGames", { count: leader.games })}</span>
                      </span>
                    </div>
                    <BrushBar value={leader.games / mostGames} tone={style.tone} index={i} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="type-caption mt-4 text-ink-muted">{t("leadersHint")}</p>
        </section>
      )}
    </Fragment>
  );

  const right = (
    <Fragment key={fresh}>
      {incomingRequests > 0 && (
        <p className="mb-8 text-center">
          <Button asChild variant="link">
            <TurnLink href="/friends" direction="forward" section="friends">
              {t("pendingRequests", { count: incomingRequests })} →
            </TurnLink>
          </Button>
        </p>
      )}
      {recent.length > 0 && (
        <section>
          <PaintedBand>{t("recent")}</PaintedBand>
          <div className="mt-3.5">
            <MatchList matches={recent} />
          </div>
          <p className="mt-[18px] flex justify-end">
            <Button asChild variant="link">
              <TurnLink href="/matches" direction="forward" section="matches">
                {t("seeAllMatches")} →
              </TurnLink>
            </Button>
          </p>
        </section>
      )}

      {/* Phones: the crow, with a fact about the group's games (on desktop it's on the insert). */}
      {isEnabled("didYouKnow") && <DidYouKnow placement="page" className="mt-11" />}

      {/* The account's own links, quietly at the end of the page. */}
      <nav aria-label={t("account")} className="mt-11 flex flex-col items-center gap-3 text-sm">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Button asChild variant="ghost" size="sm">
            <TurnLink href="/profile/edit" direction="forward">
              {tEdit("link")}
            </TurnLink>
          </Button>
          {admin && (
            <Button asChild variant="ghost" size="sm">
              <TurnLink href="/admin/guests" direction="forward">
                {tAdmin("link")}
              </TurnLink>
            </Button>
          )}
          {admin && (
            <Button asChild variant="ghost" size="sm">
              <TurnLink href="/admin/import" direction="forward">
                {tImport("link")}
              </TurnLink>
            </Button>
          )}
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="ghost" size="sm">
              {tAuth("signOut")}
            </Button>
          </form>
        </div>
        <LocaleSwitcher />
      </nav>
    </Fragment>
  );

  return <NotebookPages left={left} right={right} />;
}

/** The signed-out home: what Muninn Logs is, and a way in. */
async function Landing({ searchParams }: Pick<PageProps<"/[locale]">, "searchParams">) {
  const [t, tDelete, { accountDeleted }] = await Promise.all([
    getTranslations("HomePage"),
    getTranslations("DeleteAccount"),
    searchParams,
  ]);
  return (
    <PaperSheet brand={false}>
      <CompassRose aria-hidden className="mx-auto block opacity-25" />
      <h1 className="type-diary-name mt-5.5 text-center text-[34px] leading-[40px] text-ink notebook:text-[40px] notebook:leading-[48px]">
        Muninn Logs
      </h1>
      <p className="mt-3 text-center text-lg text-ink-muted italic">{t("tagline")}</p>
      {accountDeleted === "1" && (
        <p role="status" className="type-body-strong mt-8.5 text-center text-ink-body">
          {tDelete("deleted")}
        </p>
      )}
      <InkButton asChild className="mt-11">
        <Link href="/login">{t("signIn")}</Link>
      </InkButton>
    </PaperSheet>
  );
}
