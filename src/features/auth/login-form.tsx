"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { InkButton } from "@/components/notebook/ink-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

import { sendCode, type SignInState, verifyCode } from "./actions";

const idle: SignInState = { status: "idle" };

type LoginFormProps = {
  googleEnabled: boolean;
  /** An emailed code (everywhere but production; see signInMethods). */
  emailEnabled: boolean;
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
  emailEnabled,
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
      <form action={verifyAction} className="flex flex-col gap-5.5">
        <p className="text-ink-body">
          {t("codeSentTo", { email: sendState.email })}
        </p>
        <input type="hidden" name="email" value={sendState.email} />
        <input type="hidden" name="locale" value={locale} />
        <div>
          <Label htmlFor="code">{t("codeLabel")}</Label>
          <Input
            className="text-center text-xl tracking-[0.4em]"
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
        <InkButton type="submit" className="mt-2" disabled={verifying}>
          {t("verify")}
        </InkButton>
        <p className="flex justify-center">
          <Button type="button" variant="link" onClick={onReset}>
            {t("useDifferentEmail")}
          </Button>
        </p>
      </form>
    );
  }

  const error = oauthError || googleError ? "oauth" : sendState.status === "error" ? sendState.error : null;

  // Production: Google is the one way in, so it's the sheet's main action.
  if (!emailEnabled) {
    return (
      <div className="flex flex-col gap-5.5">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t(`errors.${error}`)}
          </p>
        )}
        <InkButton type="button" className="mt-2" onClick={signInWithGoogle}>
          {t("continueWithGoogle")}
        </InkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5.5">
      <form action={sendAction} className="flex flex-col gap-5.5">
        <div>
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
        <InkButton type="submit" className="mt-2" disabled={sending}>
          {t("sendCode")}
        </InkButton>
      </form>
      {googleEnabled && (
        <>
          <p className="type-caption text-center text-ink-muted">{t("or")}</p>
          <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle}>
            {t("continueWithGoogle")}
          </Button>
        </>
      )}
    </div>
  );
}
