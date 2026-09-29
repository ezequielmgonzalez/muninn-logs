import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { PaintedBand } from "@/components/painted-band";
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
  const [profile, locale, t, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("DeleteAccount"),
    getTranslations("HomePage"),
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
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-11">
        <PaintedBand as="h1">{t("title")}</PaintedBand>
        <p className="text-ink-body">{t("intro")}</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-ink-body">
          {consequences.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="type-body-strong text-destructive">{t("irreversible")}</p>
        <DeleteAccountForm username={profile.username} />
        <Link href="/profile/edit" className="self-center text-sm text-ink-muted underline-offset-4 hover:underline">
          {t("back")}
        </Link>
      </main>
    </>
  );
}
