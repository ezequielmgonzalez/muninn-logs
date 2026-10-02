"use client";

import { useTranslations } from "next-intl";
import { type ComponentType, type SVGProps, useEffect } from "react";

import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { BarsIcon, BookIcon, DiamondIcon, PeopleIcon, PlusIcon, SheetIcon } from "./icons";
import { InkButton, LoadMatchFab } from "./ink-button";
import { TurnLink } from "./page-turn";
import { hasSaveBar, sectionOf } from "./sections";
import { type NotebookSection, sectionTurn } from "./turn-direction";

// The main navigation (design/components/Navigation.md): the insert's list on
// desktop, the tab bar on phones. It's part of the notebook's frame, which
// stays put between screens, so it reads the current section from the path
// (sections.ts). The current section is painted and marked with aria-current.
// Moving between sections turns the diary's page: forward to a later one,
// backward to an earlier one.

export type { NotebookSection };

const SECTIONS: { key: NotebookSection; href: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: "home", href: "/", Icon: BookIcon },
  { key: "matches", href: "/matches", Icon: SheetIcon },
  { key: "stats", href: "/profile", Icon: BarsIcon },
  { key: "friends", href: "/friends", Icon: PeopleIcon },
];

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze";

/**
 * The current section, from the path. A section clicked before its screen
 * arrived (TurnLink marks it pending) is current once the path changes, so
 * the pending marks go then; a stroke still painting in finishes first.
 */
function useActiveSection() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.removeAttribute("data-pending-section");
    for (const el of document.querySelectorAll<HTMLElement>("[data-pending]")) {
      const painting = el.getAnimations?.({ subtree: true }) ?? [];
      void Promise.allSettled(painting.map((a) => a.finished)).then(() => el.removeAttribute("data-pending"));
    }
  }, [pathname]);
  return { pathname, active: sectionOf(pathname) };
}

/** Desktop: the list on the insert, then the "Cargar partida" ink button. */
export function SideNav() {
  const t = useTranslations("Nav");
  const { active } = useActiveSection();
  return (
    <>
      <nav aria-label={t("sections")} className="flex flex-col gap-1.5">
        {SECTIONS.map(({ key, href }) => (
          <TurnLink
            key={key}
            href={href}
            section={key}
            data-nav-item
            direction={sectionTurn(active, key)}
            aria-current={key === active ? "page" : undefined}
            className={cn(
              "type-nav relative flex h-[52px] w-full items-center gap-3 pl-[38px] text-ink-body aria-[current=page]:text-band-text",
              FOCUS,
            )}
          >
            {/* Shown on the current section, and on a clicked one at once (globals.css). */}
            <span aria-hidden data-nav-stroke className="ink ink--sweep top-[-12px] right-[34px] bottom-[-12px] left-3 bg-ink" />
            <DiamondIcon className="relative z-2" />
            <span className="relative z-2">{t(key)}</span>
          </TurnLink>
        ))}
      </nav>
      <div className="mt-[34px] mr-[70px] ml-11">
        <InkButton variant="insert" asChild>
          <TurnLink href="/matches/new" direction="forward">
            <PlusIcon />
            {t("logMatch")}
          </TurnLink>
        </InkButton>
      </div>
    </>
  );
}

/** Phones: a strip of the insert's paper along the bottom, five positions. The match form has its save bar instead. */
export function TabBar() {
  const t = useTranslations("Nav");
  const { pathname, active } = useActiveSection();
  if (hasSaveBar(pathname)) return null;

  const tab = ({ key, href, Icon }: (typeof SECTIONS)[number]) => (
    <TurnLink
      key={key}
      href={href}
      section={key}
      data-nav-item
      direction={sectionTurn(active, key)}
      aria-current={key === active ? "page" : undefined}
      className={cn(
        "type-tab-label relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-[3px] text-ink-body aria-[current=page]:text-band-text",
        FOCUS,
      )}
    >
      <span aria-hidden data-nav-stroke className="ink ink--tab inset-x-[-2px] inset-y-0.5 bg-ink" />
      <Icon className="relative z-2" />
      <span className="relative z-2 max-w-full truncate">{t(key)}</span>
    </TurnLink>
  );
  return (
    <nav
      aria-label={t("sections")}
      className="fixed inset-x-0 bottom-0 z-10 h-[calc(96px+env(safe-area-inset-bottom))] notebook:hidden"
    >
      <div
        aria-hidden
        className="absolute inset-x-[-8px] top-1.5 bottom-[-6px] bg-[url(/paper/tabbar.webp)] bg-size-[100%_100%] bg-no-repeat drop-shadow-[0_-6px_12px_rgba(48,30,12,0.4)]"
      />
      <div className="relative z-2 grid h-24 grid-cols-5 items-center px-1.5 pt-[18px] pb-3.5">
        {SECTIONS.slice(0, 2).map(tab)}
        <LoadMatchFab label={t("logMatch")} shortLabel={t("logShort")} />
        {SECTIONS.slice(2).map(tab)}
      </div>
    </nav>
  );
}
