"use client";

import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { CloseIcon } from "@/components/notebook/icons";
import { InkButton } from "@/components/notebook/ink-button";
import { PaintedBand } from "@/components/notebook/painted-band";
import { PenCheck } from "@/components/notebook/pen-checkbox";
import { PenCircle } from "@/components/notebook/pen-circle";
import { Button } from "@/components/ui/button";
import { ARNAK_LEADER_STYLES, ARNAK_LEADERS, type ArnakLeader } from "@/games/arnak";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import {
  DEFAULT_FILTERS,
  isDefaultFilters,
  RANKING_GROUPS,
  RANKING_SEATS,
  RANKING_TEMPLES,
  type RankingFilters,
  type RankingGroup,
  rankingSearchParams,
  UNSPECIFIED,
} from "./filters";

// The Rankings "Consulta": which leader, which temple, who's in. On desktop
// it's the left page and every pick applies at once; on phones it folds into
// a card whose sheet applies with "Ver ranking". Picks are circled in pen;
// who's in, where several go at once, is ticked.

const filtersKey = (filters: RankingFilters) => JSON.stringify(rankingSearchParams(filters));

/**
 * Applies a Consulta: the URL changes in place (keeping the Jugadores filter)
 * and the screen reloads, fading back meanwhile, so it never flashes the
 * loading sketch. It's reloading until the server's Consulta is the one asked
 * for: router.refresh() fetches after it returns, outside any transition.
 */
function useApplyFilters(current: RankingFilters) {
  const router = useRouter();
  const [awaiting, setAwaiting] = useState<string | null>(null);
  const pending = awaiting !== null && awaiting !== filtersKey(current);
  useEffect(() => {
    if (!pending) return;
    document.documentElement.setAttribute("data-refreshing", "");
    const giveUp = setTimeout(() => setAwaiting(null), 20_000);
    return () => {
      clearTimeout(giveUp);
      document.documentElement.removeAttribute("data-refreshing");
    };
  }, [pending]);

  function apply(filters: RankingFilters) {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["lider", "templo", "turno", "quienes"]) params.delete(key);
    for (const [key, value] of Object.entries(rankingSearchParams(filters))) params.set(key, value);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    setAwaiting(filtersKey(filters));
    router.refresh();
  }
  return apply;
}

/** One pick among a few, circled in pen when it's the one (or one of them): the circle hugs its label, not its cell. */
function Pick({
  pressed,
  onClick,
  className,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "relative flex min-h-11 w-fit cursor-pointer items-center gap-3 px-3 text-left text-[15px] text-ink-body outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze aria-pressed:font-semibold aria-pressed:text-ink",
        className,
      )}
    >
      {pressed && <PenCircle className="-inset-x-1 -inset-y-0.5" />}
      {children}
    </button>
  );
}

/** The leader's emoji in its bronze frame, as everywhere leaders appear (a dash without one). */
export function LeaderFrame({ leader, className }: { leader: ArnakLeader | typeof UNSPECIFIED; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-sm border-2 border-bronze bg-paper text-base shadow-portrait",
        className,
      )}
    >
      {leader === UNSPECIFIED ? "–" : ARNAK_LEADER_STYLES[leader].emoji}
    </span>
  );
}

/** The three groups of picks, for the page and for the phone's sheet alike. */
function Controls({ filters, onChange }: { filters: RankingFilters; onChange: (filters: RankingFilters) => void }) {
  const t = useTranslations("Rankings");
  const tLeaders = useTranslations("Games.arnak.leaders");
  const locale = useLocale();
  // On the page and in the phone's sheet at once: ids of their own.
  const id = useId();
  // Todos first, then the leaders by name.
  const leaders = [...ARNAK_LEADERS].sort((a, b) => tLeaders(a).localeCompare(tLeaders(b), locale));
  const toggleGroup = (group: RankingGroup) =>
    onChange({
      ...filters,
      groups: filters.groups.includes(group)
        ? filters.groups.filter((g) => g !== group)
        : RANKING_GROUPS.filter((g) => g === group || filters.groups.includes(g)),
    });

  return (
    <div className="flex flex-col gap-5.5">
      <div role="group" aria-labelledby={`${id}-leader`}>
        <h3 id={`${id}-leader`} className="type-label m-0">
          {t("leader")}
        </h3>
        <p className="type-caption m-0 mt-1 text-ink-muted">{t("leaderHint")}</p>
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Pick pressed={filters.leader === null} onClick={() => onChange({ ...filters, leader: null })}>
            {t("allLeaders")}
          </Pick>
          {leaders.map((leader) => (
            <Pick key={leader} pressed={filters.leader === leader} onClick={() => onChange({ ...filters, leader })}>
              <LeaderFrame leader={leader} />
              {tLeaders(leader)}
            </Pick>
          ))}
          <Pick pressed={filters.leader === UNSPECIFIED} onClick={() => onChange({ ...filters, leader: UNSPECIFIED })}>
            <LeaderFrame leader={UNSPECIFIED} />
            {t("unspecified")}
          </Pick>
        </div>
      </div>

      <div role="group" aria-labelledby={`${id}-temple`}>
        <h3 id={`${id}-temple`} className="type-label m-0">
          {t("temple")}
        </h3>
        {/* Tight, so the eight fit in two rows on the desktop page. */}
        <div className="mt-2 flex flex-wrap gap-x-1">
          <Pick pressed={filters.temple === null} onClick={() => onChange({ ...filters, temple: null })}>
            {t("anyTemple")}
          </Pick>
          {RANKING_TEMPLES.map((temple) => (
            <Pick key={temple} pressed={filters.temple === temple} onClick={() => onChange({ ...filters, temple })}>
              {t(`temples.${temple}`)}
            </Pick>
          ))}
          <Pick pressed={filters.temple === UNSPECIFIED} onClick={() => onChange({ ...filters, temple: UNSPECIFIED })}>
            {t("unspecified")}
          </Pick>
        </div>
      </div>

      <div role="group" aria-labelledby={`${id}-seat`}>
        <h3 id={`${id}-seat`} className="type-label m-0">
          {t("seat")}
        </h3>
        <p className="type-caption m-0 mt-1 text-ink-muted">{t("seatHint")}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <Pick pressed={filters.seat === null} onClick={() => onChange({ ...filters, seat: null })}>
            {t("anySeat")}
          </Pick>
          {RANKING_SEATS.map((seat) => (
            <Pick key={seat} pressed={filters.seat === seat} onClick={() => onChange({ ...filters, seat })}>
              {t(`seats.${seat}`)}
            </Pick>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby={`${id}-who`}>
        <h3 id={`${id}-who`} className="type-label m-0">
          {t("who")}
        </h3>
        {/* Several at once: ticked, not circled. */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {RANKING_GROUPS.map((group) => (
            <PenCheck key={group} checked={filters.groups.includes(group)} onChange={() => toggleGroup(group)}>
              {t(`groups.${group}`)}
            </PenCheck>
          ))}
        </div>
        <p className="type-caption m-0 mt-2 text-ink-muted">{t("whoHint")}</p>
      </div>
    </div>
  );
}

/** Desktop: the left page. Every pick applies at once. */
export function RankingQuery({ filters }: { filters: RankingFilters }) {
  const t = useTranslations("Rankings");
  const apply = useApplyFilters(filters);
  // Circled at once, while the ranking reloads; the server's next value wins.
  const [picked, setPicked] = useState(filters);
  const serverKey = filtersKey(filters);
  const [fromServer, setFromServer] = useState(serverKey);
  if (fromServer !== serverKey) {
    setFromServer(serverKey);
    setPicked(filters);
  }
  const change = (next: RankingFilters) => {
    setPicked(next);
    apply(next);
  };

  return (
    <section>
      <PaintedBand>{t("consulta")}</PaintedBand>
      <div className="mt-5.5">
        <Controls filters={picked} onChange={change} />
      </div>
      {!isDefaultFilters(picked) && (
        <p className="mt-5.5 flex justify-end">
          <Button variant="link" onClick={() => change(DEFAULT_FILTERS)}>
            {t("clear")}
          </Button>
        </p>
      )}
    </section>
  );
}

/** "Limpiar filtros", where the ranking is empty. */
export function ClearRankingFilters({ filters }: { filters: RankingFilters }) {
  const t = useTranslations("Rankings");
  const apply = useApplyFilters(filters);
  return (
    <Button variant="link" onClick={() => apply(DEFAULT_FILTERS)}>
      {t("clear")}
    </Button>
  );
}

/**
 * Phones: the Consulta folded into a card ("Profesor · templo de la
 * Serpiente / Amigos e invitados · mesas de 3 y 4") whose "Cambiar filtros"
 * opens a bottom sheet with the same picks. The sheet is a modal <dialog>:
 * focus stays in it, Esc or a tap on the scrim closes it, and nothing applies
 * until "Ver ranking".
 */
export function RankingFiltersCard({ filters, lines }: { filters: RankingFilters; lines: [string, string] }) {
  const t = useTranslations("Rankings");
  const apply = useApplyFilters(filters);
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);

  const open = () => {
    setDraft(filters);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  return (
    <div className="relative px-4 py-3.5 before:ink before:ink--pen-box before:-inset-1 before:bg-ink">
      <div className="flex items-start gap-3">
        {filters.leader && <LeaderFrame leader={filters.leader} className="size-10 text-xl" />}
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[15px] text-ink-body">{lines[0]}</p>
          <p className="type-caption m-0 mt-0.5 text-ink-muted">{lines[1]}</p>
        </div>
      </div>
      <p className="m-0 mt-2 flex justify-end">
        <Button variant="link" onClick={open} aria-haspopup="dialog">
          {t("change")}
        </Button>
      </p>

      <dialog
        ref={dialog}
        aria-modal="true"
        aria-labelledby="ranking-sheet-title"
        // A tap outside the sheet (on the scrim) closes it.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none overflow-visible bg-transparent p-0 text-ink-body backdrop:bg-[rgba(20,14,8,0.55)]"
      >
        <div className="max-h-[88dvh] overflow-y-auto">
          {/* The paper grows with what's on it: the tab bar's strip for the torn
              top edge, at its own proportions, then the page's paper below. */}
          <div className="relative px-[26px] pt-14 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 aspect-[812/192] bg-[url(/paper/tabbar.webp)] bg-size-[100%_100%] bg-no-repeat drop-shadow-[0_-6px_12px_rgba(48,30,12,0.4)]"
            />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-12 bottom-0 bg-[url(/paper/page-mobile.webp)] bg-cover bg-top" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <h2 id="ranking-sheet-title" className="type-band-sm m-0 text-ink">
                  {t("consulta")}
                </h2>
                <div className="flex items-center gap-1">
                  <Button variant="link" onClick={() => setDraft(DEFAULT_FILTERS)}>
                    {t("clear")}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={close} aria-label={t("close")}>
                    <CloseIcon />
                  </Button>
                </div>
              </div>
              <div className="mt-5">
                <Controls filters={draft} onChange={setDraft} />
              </div>
              <InkButton
                type="button"
                className="mt-8"
                onClick={() => {
                  close();
                  apply(draft);
                }}
              >
                {t("apply")}
              </InkButton>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
