import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import type { PlayerCount } from "@/features/player-count/options";
import { getPlayerCount } from "@/features/player-count/server";
import { getPlayerStats } from "@/features/stats/queries";
import { getCurrentProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

import { FramePlayerFilter } from "./frame-filter";
import { CrowMark } from "./icons";
import { LegalLinks } from "./legal-links";
import { SideNav, TabBar } from "./navigation";
import { NotebookPage } from "./notebook-page";
import { SpineRings, TopSpirals } from "./rings";

// Every signed-in screen is a notebook (design/components/NotebookShell.md):
// from 1200px an open notebook (insert with the navigation, two pages, rings),
// a 1280×1000 scene scaled down to fit the viewport but never up; below it,
// a field notebook bound at the top, one page, and a tab bar.
//
// The notebook is the (notebook) group's layout, so it stays put between
// screens: the insert, the navigation and the binding never re-render, and
// only the pages change (each screen renders <NotebookPages>). Whatever
// depends on the screen (the current section, the player filter, the tab
// bar) reads the path.
//
// The pages' content renders once: CSS places it on the two desktop pages or
// stacks it on the phone page. Nothing is duplicated, so every form, label
// and link exists once in the document.

const SHEET = "pointer-events-none absolute bg-size-[100%_100%] bg-no-repeat";

/** "Diario de / Ezequiel / 28 expediciones registradas". */
export async function DiaryIdentity({ className }: { className?: string }) {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const [t, tStats, stats] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Stats"),
    getPlayerStats(profile.id),
  ]);
  return (
    <div className={className}>
      <p className="type-caption m-0 text-sm text-ink-muted">{t("diaryOf")}</p>
      <p className="type-diary-name m-0 leading-[1.15] text-ink">{profile.display_name}</p>
      <p className="type-caption m-0 mt-1 text-ink-muted">{tStats("expeditions", { count: stats.games })}</p>
    </div>
  );
}

/** Desktop only: the loose sheet tucked under the left page, with the navigation. */
function Insert({ playerCount }: { playerCount: PlayerCount | null }) {
  return (
    <div className="absolute top-[104px] left-6 z-2 hidden h-[790px] w-[300px] origin-[80%_50%] -rotate-[1.2deg] notebook:block">
      <div aria-hidden className={cn(SHEET, "inset-0 bg-[url(/paper/page-insert.webp)] drop-shadow-[0_10px_16px_rgba(48,30,12,0.45)]")} />
      <div className="relative z-2 flex h-full flex-col pt-[60px] pb-[26px]">
        <DiaryIdentity className="pl-[38px]" />
        <FramePlayerFilter value={playerCount} placement="insert" />
        <div aria-hidden className="mt-[26px] mr-[60px] mb-5 ml-[38px] h-px bg-ink-body/22" />
        <SideNav />
        <div className="mt-auto pl-[70px]">
          {/* Muninn, in the same faint ink the compass had. */}
          <CrowMark className="text-ink opacity-16" />
        </div>
        <LegalLinks className="pt-[22px] pl-[38px]" />
      </div>
    </div>
  );
}

/** The notebook around every signed-in screen: the (notebook) layout. */
export async function NotebookFrame({ children }: { children: ReactNode }) {
  const playerCount = await getPlayerCount();
  return (
    <div
      data-notebook
      className={cn(
        "relative min-h-dvh bg-backdrop bg-[url(/paper/backdrop.webp)] bg-cover bg-position-[50%_40%]",
        // The scene's scale: as large as fits, never above 1:1 (no JS, so no flash).
        "[--scene-scale:min(1,tan(atan2(100vw,1280px)),tan(atan2(100dvh,1000px)))]",
        "notebook:flex notebook:h-dvh notebook:items-center notebook:justify-center notebook:overflow-hidden",
      )}
    >
      <div className="relative notebook:h-[1000px] notebook:w-[1280px] notebook:shrink-0 notebook:scale-(--scene-scale)">
        {/* The leather cover: behind both pages on desktop, a strip above the page on phones. */}
        <div
          aria-hidden
          className={cn(
            "absolute top-3.5 right-1 left-1 z-1 h-20 rounded-[10px] bg-[radial-gradient(ellipse_at_50%_30%,#3b3129_0%,var(--cover)_70%,#1b1613_100%)] shadow-[0_10px_24px_rgba(48,30,12,0.5),inset_0_0_0_1px_rgba(255,240,220,0.06),inset_0_0_18px_rgba(0,0,0,0.5)]",
            "notebook:top-7 notebook:right-auto notebook:left-[270px] notebook:h-[944px] notebook:w-[992px] notebook:rounded-cover notebook:bg-[radial-gradient(ellipse_at_50%_40%,#3b3129_0%,var(--cover)_62%,#1b1613_100%)] notebook:shadow-[var(--shadow-cover),inset_0_0_0_1px_rgba(255,240,220,0.06),inset_0_0_44px_rgba(0,0,0,0.5)]",
          )}
        />

        <Insert playerCount={playerCount} />

        {/* Desktop pages, with their thickness: two darker copies offset 3px and 6px. */}
        <div aria-hidden className="hidden notebook:block">
          <div className={cn(SHEET, "top-[52px] left-[284px] z-3 h-[908px] w-[462px] bg-[url(/paper/page-left.webp)] brightness-[0.68]")} />
          <div className={cn(SHEET, "top-[49px] left-[287px] z-3 h-[908px] w-[462px] bg-[url(/paper/page-left.webp)] brightness-[0.84]")} />
          <div className={cn(SHEET, "top-[52px] left-[782px] z-3 h-[908px] w-[462px] bg-[url(/paper/page-right.webp)] brightness-[0.68]")} />
          <div className={cn(SHEET, "top-[49px] left-[779px] z-3 h-[908px] w-[462px] bg-[url(/paper/page-right.webp)] brightness-[0.84]")} />
          {/* data-sheet: where a turning page starts (PageTurnProvider). */}
          <div data-sheet="left" className={cn(SHEET, "top-[46px] left-[290px] z-4 h-[908px] w-[462px] bg-[url(/paper/page-left.webp)]")} />
          <div data-sheet="right" className={cn(SHEET, "top-[46px] left-[776px] z-4 h-[908px] w-[462px] bg-[url(/paper/page-right.webp)]")} />
          <SpineRings />
        </div>

        {/* The phone page grows with its content; on desktop this box steps aside. */}
        <div
          data-sheet="mobile"
          className="relative z-2 mx-2.5 mt-[34px] min-h-[calc(100dvh-34px)] notebook:static notebook:m-0 notebook:min-h-0"
        >
          <div aria-hidden className="notebook:hidden">
            <div className={cn(SHEET, "inset-[6px_-4px_-6px_4px] bg-[url(/paper/page-mobile.webp)] brightness-[0.68]")} />
            <div className={cn(SHEET, "inset-[3px_-2px_-3px_2px] bg-[url(/paper/page-mobile.webp)] brightness-[0.84]")} />
            <div className={cn(SHEET, "inset-0 bg-[url(/paper/page-mobile.webp)]")} />
            <TopSpirals />
          </div>

          <main
            className={cn(
              "relative z-5 flex flex-col gap-11 px-[26px] pt-[46px] pb-[calc(130px+env(safe-area-inset-bottom))]",
              "notebook:absolute notebook:top-[46px] notebook:left-[290px] notebook:h-[908px] notebook:w-[948px] notebook:flex-row notebook:gap-6 notebook:p-0",
            )}
          >
            {/* Phones: the player filter opens the page. */}
            <FramePlayerFilter value={playerCount} placement="phone" />
            {children}
            <LegalLinks className="order-3 justify-center notebook:hidden" />
          </main>
        </div>
      </div>

      <TabBar />
    </div>
  );
}

/**
 * A screen's two pages, inside the frame. A screen whose state spans both
 * pages (e.g. one form) renders its <NotebookPage>s itself instead.
 */
export function NotebookPages({
  left,
  right,
  mobileOrder = "left-first",
}: {
  left: ReactNode;
  right?: ReactNode;
  /** On phones the pages stack left, then right, unless the screen says otherwise. */
  mobileOrder?: "left-first" | "right-first";
}) {
  return (
    <>
      <NotebookPage side="left" order={mobileOrder === "right-first" ? 2 : undefined}>
        {left}
      </NotebookPage>
      {right && (
        <NotebookPage side="right" order={mobileOrder === "right-first" ? 1 : undefined}>
          {right}
        </NotebookPage>
      )}
    </>
  );
}
