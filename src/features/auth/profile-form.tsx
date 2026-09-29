"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type ProfileState, saveProfile } from "./actions";

const idle: ProfileState = { status: "idle" };

type ProfileFormProps = {
  /** "onboarding": first username choice. "edit": changing it later. */
  mode: "onboarding" | "edit";
  defaultDisplayName: string;
  defaultUsername?: string;
  submitLabel: string;
};

export function ProfileForm({ mode, defaultDisplayName, defaultUsername, submitLabel }: ProfileFormProps) {
  const t = useTranslations("Onboarding");
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveProfile, idle);
  const submitted = state.status === "error" ? state : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="mode" value={mode} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">{t("usernameLabel")}</Label>
        <Input
          className="h-11"
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          pattern="[a-zA-Z0-9_]{3,20}"
          defaultValue={submitted?.username ?? defaultUsername}
          aria-describedby="username-hint"
          required
          autoFocus
        />
        <p id="username-hint" className="text-sm text-muted-foreground">
          {t("usernameHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">{t("displayNameLabel")}</Label>
        <Input
          className="h-11"
          id="displayName"
          name="displayName"
          defaultValue={submitted?.displayName ?? defaultDisplayName}
          maxLength={50}
          aria-describedby="display-name-hint"
          required
        />
        <p id="display-name-hint" className="text-sm text-muted-foreground">
          {t("displayNameHint")}
        </p>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" className="h-11 text-base" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
