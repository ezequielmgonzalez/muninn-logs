"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type AdminLinkState, adminLinkGuest } from "./actions";

const idle: AdminLinkState = { status: "idle" };

type Guest = { id: string; name: string; owner_name: string; matches: number };

/** Find the account by username, then confirm what moves before linking. */
export function AdminLinkForm({ guest }: { guest: Guest }) {
  // "Cancelar" remounts the steps, which resets the action's state back to
  // the search. (A key on the <form> alone wouldn't: the state lives here.)
  const [attempt, setAttempt] = useState(0);
  return <AdminLinkSteps key={attempt} guest={guest} onCancel={() => setAttempt((n) => n + 1)} />;
}

function AdminLinkSteps({ guest, onCancel }: { guest: Guest; onCancel: () => void }) {
  const t = useTranslations("AdminGuests");
  const locale = useLocale();
  const [state, action, pending] = useActionState(adminLinkGuest, idle);
  const inputId = `admin-link-${guest.id}`;

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="guestId" value={guest.id} />
      {state.status === "confirm" ? (
        <>
          <input type="hidden" name="username" value={state.username} />
          <input type="hidden" name="confirmUserId" value={state.userId} />
          <p role="alert" className="text-ink-body">
            {t("confirm", {
              guest: guest.name,
              owner: t("owner", { owner: guest.owner_name }),
              user: state.userName,
              username: state.username.replace(/^@/, ""),
              count: guest.matches,
            })}
          </p>
          <div className="flex gap-2">
            <Button type="submit" className="h-10 flex-1" disabled={pending}>
              {t("confirmYes")}
            </Button>
            <Button type="button" variant="outline" className="h-10 flex-1" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <label htmlFor={inputId} className="text-sm text-ink-muted">
            {t("usernameLabel", { name: guest.name })}
          </label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              name="username"
              className="h-10"
              autoCapitalize="none"
              autoComplete="off"
              defaultValue={state.status === "error" ? state.username : undefined}
              required
            />
            <Button type="submit" variant="outline" className="h-10" disabled={pending}>
              {t("find")}
            </Button>
          </div>
          {state.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {t(`errors.${state.error}`)}
            </p>
          )}
        </>
      )}
    </form>
  );
}
