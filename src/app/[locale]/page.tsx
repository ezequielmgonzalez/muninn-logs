import { getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
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
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Muninn Logs</h1>
      {profile ? (
        <>
          <p className="text-muted-foreground">
            {t("greeting", { name: profile.display_name })}
          </p>
          <Button>{t("logGame")}</Button>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="ghost">
              {tAuth("signOut")}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">{t("tagline")}</p>
          <Button asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        </>
      )}
      <LocaleSwitcher />
    </main>
  );
}
