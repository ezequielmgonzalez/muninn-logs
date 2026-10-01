import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { ProfileForm } from "@/features/auth/profile-form";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function EditProfilePage() {
  const [profile, locale, t, tHome, tDelete] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("EditProfile"),
    getTranslations("HomePage"),
    getTranslations("DeleteAccount"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-11">
        <div className="flex flex-col gap-5">
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          <p className="text-ink-muted">{t("description")}</p>
        </div>
        <ProfileForm
          mode="edit"
          defaultDisplayName={profile.display_name}
          defaultUsername={profile.username}
          submitLabel={t("submit")}
        />
        <Link
          href="/account/delete"
          className="mt-6 self-center text-sm text-destructive underline-offset-4 hover:underline"
        >
          {tDelete("link")}
        </Link>
      </main>
    </>
  );
}
