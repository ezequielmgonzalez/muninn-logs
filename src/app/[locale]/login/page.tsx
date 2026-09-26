import { getLocale, getTranslations } from "next-intl/server";

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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <LoginForm
        googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true"}
        oauthError={error === "oauth"}
      />
    </main>
  );
}
