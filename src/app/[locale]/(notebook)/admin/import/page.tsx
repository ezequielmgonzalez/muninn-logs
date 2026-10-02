import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { TurnLink } from "@/components/notebook/page-turn";
import { ImportForm } from "@/features/import/import-form";
import { ARNAK_LEADERS, type ArnakLeader } from "@/games/arnak";
import { routing } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminImportPage({ searchParams }: PageProps<"/[locale]/admin/import">) {
  const [profile, locale, admin, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    isAdmin(),
    getTranslations("AdminImport"),
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
    <NotebookPages
      left={
        <>
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          {typeof imported === "string" && (
            <p role="status" className="type-body-strong mt-4 text-ink-body">
              {t("imported", { count: Number(imported) })}{" "}
              <TurnLink href="/matches" direction="forward" section="matches" className="font-normal underline underline-offset-4">
                {t("seeMatches")}
              </TurnLink>
            </p>
          )}
          <p className="mt-5.5 mb-11 text-ink-body">{t("description")}</p>
          <ImportForm addable={addable} leaderLabels={leaderLabels} />
        </>
      }
    />
  );
}
