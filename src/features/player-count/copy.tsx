import "server-only";

import { getFormatter, getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

import type { PlayerCounts } from "./options";

/** "3 y 4": the picked table sizes, as a list in the user's language. */
async function sizesList(counts: readonly number[]) {
  const format = await getFormatter();
  return format.list(counts.map(String), { type: "conjunction" });
}

/** "No hay partidas de 3 y 4 jugadores.": an empty screen under the filter. */
export async function noGamesFor(counts: NonNullable<PlayerCounts>) {
  const [t, list] = await Promise.all([getTranslations("PlayerCount"), sizesList(counts)]);
  return t("none", { counts: list });
}

/**
 * "Solo mesas de 3 y 4 jugadores", in italics under a screen's first painted
 * title while the filter leaves some table sizes out. Nothing when every game counts.
 */
export async function PlayerCountsNote({ counts, className }: { counts: PlayerCounts; className?: string }) {
  if (!counts) return null;
  const [t, list] = await Promise.all([getTranslations("PlayerCount"), sizesList(counts)]);
  return (
    <p data-player-counts-note className={cn("type-caption m-0 mt-3 text-center text-ink-muted", className)}>
      {t("only", { counts: list })}
    </p>
  );
}
