import { getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { countIncomingRequests } from "@/features/friends/queries";
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
  const incomingRequests = profile ? await countIncomingRequests(profile.id) : 0;

  return (
    <>
      <PaintedBand as="h1" size="page">
        {profile ? t("journal", { name: profile.display_name }) : "Muninn Logs"}
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-11 text-center">
        {profile ? (
          <>
            <Button asChild className="h-11 w-full text-base">
              <Link href="/matches/new">{t("logGame")}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full text-base">
              <Link href="/matches">{t("matches")}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full text-base">
              <Link href="/profile">{t("stats")}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full text-base">
              <Link href="/friends">
                {incomingRequests > 0
                  ? t("friendsWithRequests", { count: incomingRequests })
                  : t("friends")}
              </Link>
            </Button>
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
