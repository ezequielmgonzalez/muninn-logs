"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

import { sendCode, type SignInState, verifyCode } from "./actions";

const idle: SignInState = { status: "idle" };

type LoginFormProps = {
  googleEnabled: boolean;
  oauthError: boolean;
};

export function LoginForm(props: LoginFormProps) {
  // Changing the key remounts the steps, resetting both actions' state.
  const [attempt, setAttempt] = useState(0);
  return (
    <LoginSteps
      key={attempt}
      {...props}
      onReset={() => setAttempt((n) => n + 1)}
    />
  );
}

function LoginSteps({
  googleEnabled,
  oauthError,
  onReset,
}: LoginFormProps & { onReset: () => void }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [sendState, sendAction, sending] = useActionState(sendCode, idle);
  const [verifyState, verifyAction, verifying] = useActionState(verifyCode, idle);
  const [googleError, setGoogleError] = useState(false);

  async function signInWithGoogle() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/${locale}/auth/callback` },
    });
    if (error) setGoogleError(true);
  }

  if (sendState.status === "code-sent") {
    return (
      <form action={verifyAction} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t("codeSentTo", { email: sendState.email })}
        </p>
        <input type="hidden" name="email" value={sendState.email} />
        <input type="hidden" name="locale" value={locale} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{t("codeLabel")}</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
          />
        </div>
        {verifyState.status === "error" && (
          <p role="alert" className="text-sm text-destructive">
            {t(`errors.${verifyState.error}`)}
          </p>
        )}
        <Button type="submit" disabled={verifying}>
          {t("verify")}
        </Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          {t("useDifferentEmail")}
        </Button>
      </form>
    );
  }

  const error = oauthError || googleError ? "oauth" : sendState.status === "error" ? sendState.error : null;

  return (
    <div className="flex flex-col gap-4">
      <form action={sendAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={sendState.status === "error" ? sendState.email : undefined}
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t(`errors.${error}`)}
          </p>
        )}
        <Button type="submit" disabled={sending}>
          {t("sendCode")}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <p className="text-center text-sm text-muted-foreground">{t("or")}</p>
          <Button type="button" variant="outline" onClick={signInWithGoogle}>
            {t("continueWithGoogle")}
          </Button>
        </>
      )}
    </div>
  );
}
