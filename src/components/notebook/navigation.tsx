import { getTranslations } from "next-intl/server";
import type { ComponentType, SVGProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { BarsIcon, BookIcon, DiamondIcon, PeopleIcon, PlusIcon, SheetIcon } from "./icons";
import { InkButton, LoadMatchFab } from "./ink-button";

// The main navigation (design/components/Navigation.md): the insert's list on
// desktop, the tab bar on phones. The current section is painted and marked
// with aria-current. Compare and guests aren't sections: they live under
// friends, and mark it as current.

export type NotebookSection = "home" | "matches" | "stats" | "friends";

const SECTIONS: { key: NotebookSection; href: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: "home", href: "/", Icon: BookIcon },
  { key: "matches", href: "/matches", Icon: SheetIcon },
  { key: "stats", href: "/profile", Icon: BarsIcon },
  { key: "friends", href: "/friends", Icon: PeopleIcon },
];

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze";

/** Desktop: the list on the insert, then the "Cargar partida" ink button. */
export async function SideNav({ active }: { active?: NotebookSection }) {
  const t = await getTranslations("Nav");
  return (
    <>
      <nav aria-label={t("sections")} className="flex flex-col gap-1.5">
        {SECTIONS.map(({ key, href }) => (
          <Link
            key={key}
            href={href}
            aria-current={key === active ? "page" : undefined}
            className={cn(
              "type-nav relative flex h-[52px] w-full items-center gap-3 pl-[38px] text-ink-body aria-[current=page]:text-band-text",
              FOCUS,
            )}
          >
            {key === active && <span aria-hidden className="ink ink--sweep paint-in top-[-12px] right-[34px] bottom-[-12px] left-3 bg-ink" />}
            <DiamondIcon className="relative z-2" />
            <span className="relative z-2">{t(key)}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-[34px] mr-[70px] ml-11">
        <InkButton variant="insert" asChild>
          <Link href="/matches/new">
            <PlusIcon />
            {t("logMatch")}
          </Link>
        </InkButton>
      </div>
    </>
  );
}

/** Phones: a strip of the insert's paper along the bottom, five positions. */
export async function TabBar({ active }: { active?: NotebookSection }) {
  const t = await getTranslations("Nav");
  const tab = ({ key, href, Icon }: (typeof SECTIONS)[number]) => (
    <Link
      key={key}
      href={href}
      aria-current={key === active ? "page" : undefined}
      className={cn(
        "type-tab-label relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-[3px] text-ink-body aria-[current=page]:text-band-text",
        FOCUS,
      )}
    >
      {key === active && <span aria-hidden className="ink ink--tab paint-in inset-x-[-2px] inset-y-0.5 bg-ink" />}
      <Icon className="relative z-2" />
      <span className="relative z-2 max-w-full truncate">{t(key)}</span>
    </Link>
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
