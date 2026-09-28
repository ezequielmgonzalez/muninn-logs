import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { LoginForm } from "@/features/auth/login-form";
import { Link, redirect } from "@/i18n/navigation";
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
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">Muninn Logs</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-11 sm:justify-center">
        <div className="flex flex-col gap-5">
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          <p className="text-ink-muted">{t("description")}</p>
        </div>
        <LoginForm
          googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true"}
          oauthError={error === "oauth"}
        />
      </main>
    </>
  );
}
