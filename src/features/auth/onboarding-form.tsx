"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { completeOnboarding, type OnboardingState } from "./actions";

const idle: OnboardingState = { status: "idle" };

export function OnboardingForm({ defaultDisplayName }: { defaultDisplayName: string }) {
  const t = useTranslations("Onboarding");
  const locale = useLocale();
  const [state, action, pending] = useActionState(completeOnboarding, idle);
  const submitted = state.status === "error" ? state : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">{t("usernameLabel")}</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          pattern="[a-zA-Z0-9_]{3,20}"
          defaultValue={submitted?.username}
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
      <Button type="submit" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
