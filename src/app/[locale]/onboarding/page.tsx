import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { ProfileForm } from "@/features/auth/profile-form";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function OnboardingPage() {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Onboarding"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (profile.username) return redirect({ href: "/", locale });

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
        <ProfileForm mode="onboarding" defaultDisplayName={profile.display_name} submitLabel={t("submit")} />
      </main>
    </>
  );
}
