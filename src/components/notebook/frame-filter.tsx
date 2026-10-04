"use client";

import { GameSwitch } from "@/features/game/game-switch";
import { type Game, hasTableSizes } from "@/features/game/options";
import { PlayerCountFilter } from "@/features/player-count/player-count-filter";
import type { PlayerCounts } from "@/features/player-count/options";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { hasGameSwitch, hasPlayerFilter } from "./sections";

/**
 * The frame's "Juego" switch and "Jugadores" filter, on the screens they
 * apply to (Jugadores only for a game with table sizes). On the insert each
 * keeps its place on the other screens (hidden), so the navigation below
 * never moves; on phones they open the page, or aren't there.
 */
export function FrameControls({
  game,
  playerCounts,
  placement,
}: {
  game: Game;
  playerCounts: PlayerCounts;
  placement: "insert" | "phone";
}) {
  const path = usePathname();
  const showGame = hasGameSwitch(path);
  const showCounts = hasPlayerFilter(path) && hasTableSizes(game);

  if (placement === "phone") {
    return showGame || showCounts ? (
      <div className="order-first -mb-5 flex flex-col items-end notebook:hidden">
        {showGame && <GameSwitch value={game} />}
        {showCounts && <PlayerCountFilter value={playerCounts} />}
      </div>
    ) : null;
  }
  const kept = (shown: boolean) => ({
    className: cn("pl-[38px]", !shown && "invisible"),
    "aria-hidden": !shown || undefined,
    inert: !shown,
  });
  return (
    <div className="mt-2.5">
      <div {...kept(showGame)}>
        <GameSwitch value={game} />
      </div>
      <div {...kept(showCounts)}>
        <PlayerCountFilter value={playerCounts} />
      </div>
    </div>
  );
}
