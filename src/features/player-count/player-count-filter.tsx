"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useTransition } from "react";

import { NativeSelect } from "@/components/notebook/native-select";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { PLAYER_COUNT_COOKIE, PLAYER_COUNTS, type PlayerCount } from "./options";

/**
 * "Jugadores: Todas / 2 / 3 / 4": filters every stat and list on the screen,
 * and on the next ones (the choice is a cookie). Changing it reloads the
 * screen's data from the server.
 */
export function PlayerCountFilter({ value, className }: { value: PlayerCount | null; className?: string }) {
  const t = useTranslations("PlayerCount");
  const tLoading = useTranslations("Loading");
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // While the screen reloads, its pages fade back (globals.css), so it never looks frozen.
  useEffect(() => {
    if (!pending) return;
    document.documentElement.setAttribute("data-refreshing", "");
    return () => document.documentElement.removeAttribute("data-refreshing");
  }, [pending]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className="type-caption text-ink-muted">
        {t("label")}
      </label>
      <NativeSelect
        id={id}
        size="sm"
        className="w-[130px]"
        value={value ?? "all"}
        aria-busy={pending}
        onChange={(e) => {
          const chosen = e.target.value;
          document.cookie =
            chosen === "all"
              ? `${PLAYER_COUNT_COOKIE}=; path=/; max-age=0; samesite=lax`
              : `${PLAYER_COUNT_COOKIE}=${chosen}; path=/; max-age=31536000; samesite=lax`;
          startTransition(() => router.refresh());
        }}
      >
        <option value="all">{t("all")}</option>
        {PLAYER_COUNTS.map((count) => (
          <option key={count} value={count}>
            {t("count", { count })}
          </option>
        ))}
      </NativeSelect>
      {pending && (
        <span role="status" className="type-caption animate-pulse text-ink-muted motion-reduce:animate-none">
          {tLoading("label")}
        </span>
      )}
    </div>
  );
}
