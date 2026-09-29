"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteMatch } from "./actions";

/** A two-step delete: the first tap only asks for confirmation. */
export function DeleteMatch({ matchId }: { matchId: string }) {
  const t = useTranslations("Matches");
  const locale = useLocale();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={() => setConfirming(true)}>
        {t("delete")}
      </Button>
    );
  }

  return (
    <form action={deleteMatch} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="matchId" value={matchId} />
      <p role="alert" className="text-ink-body">
        {t("deleteConfirm")}
      </p>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1 bg-destructive text-base text-primary-foreground hover:bg-destructive/90">
          {t("deleteYes")}
        </Button>
        <Button type="button" variant="outline" className="h-11 flex-1 text-base" onClick={() => setConfirming(false)}>
          {t("deleteNo")}
        </Button>
      </div>
    </form>
  );
}
