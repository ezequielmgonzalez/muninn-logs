import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { PaperSheet } from "@/components/notebook/paper-sheet";
import { LoginForm } from "@/features/auth/login-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Auth"),
  ]);
  if (profile) return redirect({ href: "/", locale });

  // Set by /auth/callback when Google sign-in fails.
  const { error } = await searchParams;

  return (
    <PaperSheet>
      <PaintedBand as="h1">{t("title")}</PaintedBand>
      <p className="mt-5.5 mb-5.5 text-ink-body">{t("description")}</p>
      <LoginForm
        googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true"}
        oauthError={error === "oauth"}
      />
    </PaperSheet>
  );
}
