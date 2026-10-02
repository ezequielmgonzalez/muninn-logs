import { getLocale, getTranslations } from "next-intl/server";

import { NotebookShell } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { TurnLink } from "@/components/notebook/page-turn";
import { ProfileForm } from "@/features/auth/profile-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function EditProfilePage() {
  const [profile, locale, t, tDelete] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("EditProfile"),
    getTranslations("DeleteAccount"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  return (
    <NotebookShell
      left={
        <>
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          <p className="mt-5.5 mb-5.5 text-ink-body">{t("description")}</p>
          <ProfileForm
            mode="edit"
            defaultDisplayName={profile.display_name}
            defaultUsername={profile.username}
            submitLabel={t("submit")}
          />
          <p className="mt-11 flex justify-center">
            <Button asChild variant="destructive">
              <TurnLink href="/account/delete" direction="forward">
                {tDelete("link")}
              </TurnLink>
            </Button>
          </p>
        </>
      }
    />
  );
}
