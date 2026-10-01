import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { ImportForm } from "@/features/import/import-form";
import { ARNAK_LEADERS, type ArnakLeader } from "@/games/arnak";
import { routing } from "@/i18n/routing";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminImportPage({ searchParams }: PageProps<"/[locale]/admin/import">) {
  const [profile, locale, admin, t, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    isAdmin(),
    getTranslations("AdminImport"),
    getTranslations("HomePage"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  // For everyone else, this page doesn't exist (the database refuses anyway).
  if (!admin) notFound();

  const supabase = await createClient();
  const [{ data: addable, error }, { imported }, leaderLabels] = await Promise.all([
    supabase.rpc("list_addable_players"),
    searchParams,
    // A file may name leaders in any language the app speaks.
    Promise.all(
      routing.locales.map(async (l) => {
        const tLeaders = await getTranslations({ locale: l, namespace: "Games.arnak.leaders" });
        return Object.fromEntries(ARNAK_LEADERS.map((slug) => [slug, tLeaders(slug)])) as Record<ArnakLeader, string>;
      }),
    ),
  ]);
  if (error) throw error;

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-11">
        <PaintedBand as="h1">{t("title")}</PaintedBand>
        {typeof imported === "string" && (
          <p role="status" className="type-body-strong text-ink-body">
            {t("imported", { count: Number(imported) })}{" "}
            <Link href="/matches" className="font-normal underline underline-offset-4">
              {t("seeMatches")}
            </Link>
          </p>
        )}
        <p className="text-ink-muted">{t("description")}</p>
        <ImportForm addable={addable} leaderLabels={leaderLabels} />
      </main>
    </>
  );
}
