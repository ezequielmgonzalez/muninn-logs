import { getLocale, getTranslations } from "next-intl/server";

import { OnboardingForm } from "@/features/auth/onboarding-form";
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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <OnboardingForm defaultDisplayName={profile.display_name} />
    </main>
  );
}
