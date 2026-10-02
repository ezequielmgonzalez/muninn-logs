"use client";

import { PlayerCountFilter } from "@/features/player-count/player-count-filter";
import type { PlayerCount } from "@/features/player-count/options";
import { usePathname } from "@/i18n/navigation";

import { hasPlayerFilter } from "./sections";

/**
 * The frame's "Jugadores" filter, on the screens it filters. On the insert it
 * keeps its place on the others (hidden), so the navigation below it never
 * moves between screens; on phones it opens the page, or isn't there.
 */
export function FramePlayerFilter({ value, placement }: { value: PlayerCount | null; placement: "insert" | "phone" }) {
  const shown = hasPlayerFilter(usePathname());
  if (placement === "phone") {
    return shown ? (
      <div className="order-first -mb-5 flex justify-end notebook:hidden">
        <PlayerCountFilter value={value} />
      </div>
    ) : null;
  }
  return (
    <div className={shown ? "mt-3.5 pl-[38px]" : "invisible mt-3.5 pl-[38px]"} aria-hidden={!shown || undefined} inert={!shown}>
      <PlayerCountFilter value={value} />
    </div>
  );
}
