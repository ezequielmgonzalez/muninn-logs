"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { InkButton } from "@/components/notebook/ink-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type DeleteAccountState, deleteAccount } from "./actions";

const idle: DeleteAccountState = { status: "idle" };

/** Type your username to confirm; the button stays off until it matches. */
export function DeleteAccountForm({ username }: { username: string }) {
  const t = useTranslations("DeleteAccount");
  const locale = useLocale();
  const [state, action, pending] = useActionState(deleteAccount, idle);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase().replace(/^@/, "") === username;

  return (
    <form action={action} className="flex flex-col gap-5.5">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <Label htmlFor="confirm-username">{t("confirmLabel", { username })}</Label>
        <Input
          id="confirm-username"
          name="username"
          autoCapitalize="none"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          required
        />
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <InkButton type="submit" tone="danger" className="mt-2" disabled={!matches || pending}>
        {t("submit")}
      </InkButton>
    </form>
  );
}
