import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { LogMatchForm } from "@/features/matches/log-match-form";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewMatchPage() {
  const [profile, locale, t, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("LogMatch"),
    getTranslations("HomePage"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const supabase = await createClient();
  const { data: addable, error } = await supabase.rpc("list_addable_players");
  if (error) throw error;

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-11">
        <PaintedBand as="h1">{t("title")}</PaintedBand>
        <LogMatchForm addable={addable} />
      </main>
    </>
  );
}
