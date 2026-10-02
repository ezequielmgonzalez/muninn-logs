"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { InkButton } from "@/components/notebook/ink-button";
import { Button } from "@/components/ui/button";

import { deleteMatch } from "./actions";

/** A two-step delete: the first tap only asks for confirmation. */
export function DeleteMatch({ matchId }: { matchId: string }) {
  const t = useTranslations("Matches");
  const locale = useLocale();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" className="h-11" onClick={() => setConfirming(true)}>
        {t("delete")}
      </Button>
    );
  }

  return (
    <form action={deleteMatch} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="matchId" value={matchId} />
      <p role="alert" className="text-ink-body">
        {t("deleteConfirm")}
      </p>
      <div className="flex items-center gap-6">
        <InkButton type="submit" tone="danger" className="flex-1">
          {t("deleteYes")}
        </InkButton>
        <Button type="button" variant="ghost" className="h-11" onClick={() => setConfirming(false)}>
          {t("deleteNo")}
        </Button>
      </div>
    </form>
  );
}
