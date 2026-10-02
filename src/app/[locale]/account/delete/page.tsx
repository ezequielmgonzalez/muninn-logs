import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { NotebookShell } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { DeleteAccountForm } from "@/features/account/delete-account-form";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const previewSchema = z.object({
  matches_deleted: z.number(),
  matches_transferred: z.number(),
  places_anonymized: z.number(),
  guests_transferred: z.number(),
  guests_deleted: z.number(),
});

export default async function DeleteAccountPage() {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("DeleteAccount"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("account_deletion_preview");
  if (error) throw error;
  const preview = previewSchema.parse(data);

  // Only the consequences that apply to this account.
  const consequences = [
    t("account"),
    preview.matches_deleted > 0 && t("matchesDeleted", { count: preview.matches_deleted }),
    preview.matches_transferred > 0 && t("matchesTransferred", { count: preview.matches_transferred }),
    preview.places_anonymized > 0 && t("placesAnonymized", { count: preview.places_anonymized }),
    preview.guests_transferred > 0 && t("guestsTransferred", { count: preview.guests_transferred }),
    preview.guests_deleted > 0 && t("guestsDeleted", { count: preview.guests_deleted }),
  ].filter((line): line is string => Boolean(line));

  return (
    <NotebookShell
      left={
        <>
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          <p className="mt-5.5 text-ink-body">{t("intro")}</p>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-ink-body marker:text-bronze">
            {consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="type-body-strong mt-5.5 mb-5.5 text-destructive">{t("irreversible")}</p>
          <DeleteAccountForm username={profile.username} />
          <p className="mt-8.5 flex justify-center">
            <Button asChild variant="link">
              <Link href="/profile/edit">{t("back")}</Link>
            </Button>
          </p>
        </>
      }
    />
  );
}
