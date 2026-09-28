import { getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function Home() {
  const [profile, locale, t, tAuth] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("HomePage"),
    getTranslations("Auth"),
  ]);
  if (profile && !profile.username) return redirect({ href: "/onboarding", locale });

  return (
    <>
      <PaintedBand as="h1" size="page">
        {profile ? t("journal", { name: profile.display_name }) : "Muninn Logs"}
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-11 text-center">
        {profile ? (
          <>
            <Button className="h-11 w-full text-base">{t("logGame")}</Button>
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="ghost">
                {tAuth("signOut")}
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-lg text-ink-muted italic">{t("tagline")}</p>
            <Button asChild className="h-11 w-full text-base">
              <Link href="/login">{t("signIn")}</Link>
            </Button>
          </>
        )}
        <LocaleSwitcher />
      </main>
    </>
  );
}
