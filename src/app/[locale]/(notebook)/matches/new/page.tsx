import { getLocale, getTranslations } from "next-intl/server";

import { LogMatchForm } from "@/features/matches/log-match-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewMatchPage() {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("LogMatch"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const supabase = await createClient();
  const { data: addable, error } = await supabase.rpc("list_addable_players");
  if (error) throw error;

  // The form brings its own save bar on phones, in place of the tab bar (sections.ts).
  return <LogMatchForm title={t("title")} addable={addable} />;
}
