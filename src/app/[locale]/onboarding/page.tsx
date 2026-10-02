import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { PaperSheet } from "@/components/notebook/paper-sheet";
import { ProfileForm } from "@/features/auth/profile-form";
import { redirect } from "@/i18n/navigation";
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
    <PaperSheet>
      <PaintedBand as="h1">{t("title")}</PaintedBand>
      <p className="mt-5.5 mb-5.5 text-ink-body">{t("description")}</p>
      <ProfileForm mode="onboarding" defaultDisplayName={profile.display_name} submitLabel={t("submit")} />
    </PaperSheet>
  );
}
