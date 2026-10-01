"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { InkButton } from "@/components/notebook/ink-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type AddFriendState, addFriend } from "./actions";

const idle: AddFriendState = { status: "idle" };

export function AddFriendForm() {
  const t = useTranslations("Friends");
  const [state, action, pending] = useActionState(addFriend, idle);

  return (
    <form action={action} className="flex flex-col gap-5.5">
      <div>
        <Label htmlFor="friend-username">{t("usernameLabel")}</Label>
        <Input
          id="friend-username"
          placeholder={t("usernamePlaceholder")}
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          defaultValue={state.status === "error" ? state.username : undefined}
          aria-describedby="friend-username-hint"
          required
        />
        <p id="friend-username-hint" className="type-caption mt-1.5 text-ink-muted">
          {t("usernameHint")}
        </p>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
      {(state.status === "sent" || state.status === "accepted") && (
        <p role="status" className="text-sm text-ink-body">
          {t(state.status, { name: state.name })}
        </p>
      )}
      <InkButton type="submit" disabled={pending}>
        {t("send")}
      </InkButton>
    </form>
  );
}
