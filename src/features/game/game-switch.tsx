"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { PenCircle } from "@/components/notebook/pen-circle";
import { PLAYER_COUNTS_PARAM } from "@/features/player-count/options";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { GAME_COOKIE, GAME_PARAM, type Game, gameParam, GAMES } from "./options";

/**
 * "Juego (Arnak) LOTR Duel": which game the notebook is about. Every stat,
 * list and the match form follow it, on this screen and the next ones (a
 * cookie, and ?juego= in the URL). One at a time, so the current one is
 * circled in pen. Changing it reloads the screen, frame included.
 */
export function GameSwitch({ value, className }: { value: Game; className?: string }) {
  const t = useTranslations("Game");
  const tGames = useTranslations("Games");
  const router = useRouter();
  const id = useId();
  // Circled at once, while the screen reloads; the server's next value wins.
  const [picked, setPicked] = useState(value);
  const [fromServer, setFromServer] = useState(value);
  if (fromServer !== value) {
    setFromServer(value);
    setPicked(value);
  }

  // Reloading until the server answers with the game asked for (see PlayerCountFilter).
  const [awaiting, setAwaiting] = useState<Game | null>(null);
  const pending = awaiting !== null && awaiting !== value;
  useEffect(() => {
    if (!pending) return;
    document.documentElement.setAttribute("data-refreshing", "");
    const giveUp = setTimeout(() => setAwaiting(null), 20_000);
    return () => {
      clearTimeout(giveUp);
      document.documentElement.removeAttribute("data-refreshing");
    };
  }, [pending]);

  function choose(game: Game) {
    if (game === picked) return;
    setPicked(game);
    remember(game);
    // The URL says it too. What else it said (a Rankings query, a page of
    // Partidas) was about the other game, so only the table sizes stay.
    const params = new URLSearchParams();
    const sizes = new URLSearchParams(window.location.search).get(PLAYER_COUNTS_PARAM);
    if (sizes !== null) params.set(PLAYER_COUNTS_PARAM, sizes);
    params.set(GAME_PARAM, gameParam(game));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
    setAwaiting(game);
    router.refresh();
  }

  return (
    <div role="group" aria-labelledby={id} aria-busy={pending} className={cn("flex min-w-0 items-center gap-1", className)}>
      <span id={id} className="type-caption mr-1.5 text-ink-muted">
        {t("label")}
      </span>
      {GAMES.map((game) => (
        <button
          key={game}
          type="button"
          aria-pressed={picked === game}
          onClick={() => choose(game)}
          className="relative inline-flex min-h-11 cursor-pointer items-center px-2 text-[15px] whitespace-nowrap text-ink-body outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bronze aria-pressed:font-semibold aria-pressed:text-ink"
        >
          {picked === game && <PenCircle className="-inset-x-0.5 inset-y-1" />}
          {tGames(`${game}.short`)}
        </button>
      ))}
    </div>
  );
}

/** The game follows the user to the next screens. */
function remember(game: Game) {
  document.cookie = `${GAME_COOKIE}=${gameParam(game)}; path=/; max-age=31536000; samesite=lax`;
}
