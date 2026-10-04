"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import {
  checkedCounts,
  PLAYER_COUNTS,
  PLAYER_COUNTS_COOKIE,
  PLAYER_COUNTS_PARAM,
  type PlayerCount,
  playerCountsKey,
  type PlayerCounts,
  serializePlayerCounts,
  togglePlayerCount,
} from "./options";

/**
 * "Jugadores ☐2 ☑3 ☑4": which table sizes every stat and list on the screen
 * counts, and on the next ones (the choice is a cookie, and ?jugadores= in the
 * URL). Real checkboxes, drawn in pen: what you press is drawn, not painted.
 * At least one stays ticked. Changing it reloads the screen's data.
 */
export function PlayerCountFilter({ value, className }: { value: PlayerCounts; className?: string }) {
  const t = useTranslations("PlayerCount");
  const tLoading = useTranslations("Loading");
  const router = useRouter();
  // The latest choice, ticked at once while the screen reloads with it. It
  // holds until the server sends a different value, so quick changes build on
  // each other instead of on a value still on its way.
  const [counts, setCounts] = useState(value);
  const [fromServer, setFromServer] = useState(playerCountsKey(value));
  if (fromServer !== playerCountsKey(value)) {
    setFromServer(playerCountsKey(value));
    setCounts(value);
  }
  const [notice, setNotice] = useState("");

  // Reloading until the server's value is the one asked for. router.refresh()
  // fetches after it returns, outside any transition, so a transition's
  // pending state can't tell; the server's answer can.
  const [awaiting, setAwaiting] = useState<string | null>(null);
  const pending = awaiting !== null && awaiting !== playerCountsKey(value);

  // While the screen reloads, its pages fade back (globals.css), so it never
  // looks frozen; a reload that never answers stops counting after a while.
  useEffect(() => {
    if (!pending) return;
    document.documentElement.setAttribute("data-refreshing", "");
    const giveUp = setTimeout(() => setAwaiting(null), 20_000);
    return () => {
      clearTimeout(giveUp);
      document.documentElement.removeAttribute("data-refreshing");
    };
  }, [pending]);

  function toggle(size: PlayerCount) {
    const next = togglePlayerCount(counts, size);
    if (next === undefined) {
      // The last one ticked stays; say why (a changed string is announced again).
      setNotice((current) => (current === t("atLeastOne") ? `${t("atLeastOne")}\u00a0` : t("atLeastOne")));
      return;
    }
    setNotice("");
    setCounts(next);
    const stored = serializePlayerCounts(next);
    remember(stored);
    // The URL says it too (none when every size counts), so the screen can be shared as it is.
    const params = new URLSearchParams(window.location.search);
    if (stored) params.set(PLAYER_COUNTS_PARAM, stored);
    else params.delete(PLAYER_COUNTS_PARAM);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    setAwaiting(playerCountsKey(next));
    router.refresh();
  }

  const checked = checkedCounts(counts);
  return (
    <fieldset className={cn("m-0 flex min-w-0 items-center gap-0.5 border-0 p-0", className)} aria-busy={pending}>
      <legend className="type-caption float-left mr-1.5 text-ink-muted">{t("label")}</legend>
      {PLAYER_COUNTS.map((size) => (
        <label key={size} className="relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-1.5 text-[15px] text-ink-body">
          {/* The real checkbox, see-through over the whole label: every tap lands on it. */}
          <input
            type="checkbox"
            className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0"
            checked={checked.includes(size)}
            onChange={() => toggle(size)}
            aria-label={t("count", { count: size })}
          />
          <PenCheckbox />
          <span aria-hidden>{size}</span>
        </label>
      ))}
      <span aria-live="polite" className="sr-only">
        {notice}
      </span>
      {/* Its place is kept, so the checkboxes don't move when it turns up. */}
      <span className="ml-1 inline-flex size-4 text-ink-muted">
        {pending && (
          <span role="status" className="inline-flex">
            <PenSpinner />
            <span className="sr-only">{tLoading("label")}</span>
          </span>
        )}
      </span>
    </fieldset>
  );
}

/** A loop drawn in pen, turning while the screen reloads (still, under reduced motion). */
function PenSpinner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-4 animate-spin [animation-duration:900ms] motion-reduce:animate-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      {/* Most of a circle, the pen lifting before it closes, with a slight wobble. */}
      <path d="M10 2.2C14.6 2.1 17.9 5.6 17.8 10.1C17.7 14.6 14.2 17.9 9.8 17.8C5.6 17.7 2.3 14.5 2.2 10.3C2.15 7.6 3.4 5.3 5.4 3.9" />
    </svg>
  );
}

/** The choice follows the user to the next screens (none stored when every size counts). */
function remember(stored: string | null) {
  document.cookie = stored
    ? `${PLAYER_COUNTS_COOKIE}=${stored}; path=/; max-age=31536000; samesite=lax`
    : `${PLAYER_COUNTS_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * A box drawn in pen, with a pen tick when its checkbox (the input right
 * before it, a peer) is checked. The tick runs a little past the box, as a
 * quick one does. Focus shows on the box.
 */
function PenCheckbox() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-[18px] shrink-0 overflow-visible text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bronze [&_[data-tick]]:hidden peer-checked:[&_[data-tick]]:inline"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path strokeWidth={1.6} d="M2.4 3.4C7.2 2.7 12.4 3.1 17.4 2.5M16.8 1.9C17.2 7.2 16.9 12.6 17.3 17.6M17.8 16.9C12.4 17.4 7.4 17 2.1 17.5M2.9 18.2C2.4 13 2.8 7.8 2.2 2.4" />
      <path data-tick strokeWidth={2} d="M5 10.2C6.4 11.6 7.5 13 8.6 14.8C10.6 9.8 13.9 5.4 18.6 1.6" />
    </svg>
  );
}
