import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { AdminLinkForm } from "@/features/guests/admin-link-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminGuestsPage({ searchParams }: PageProps<"/[locale]/admin/guests">) {
  const [profile, locale, admin, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    isAdmin(),
    getTranslations("AdminGuests"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  // For everyone else, this page doesn't exist (the database refuses anyway).
  if (!admin) notFound();

  const supabase = await createClient();
  const [{ data: guests, error }, { linked }] = await Promise.all([
    supabase.rpc("admin_list_guests"),
    searchParams,
  ]);
  if (error) throw error;

  return (
    <NotebookPages
      left={
        <>
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          <p className="mt-5.5 text-ink-body">{t("description")}</p>
          {typeof linked === "string" && (
            <p role="status" className="type-body-strong mt-4 text-ink-body">
              {t("linked", { count: Number(linked) })}
            </p>
          )}
          {guests.length === 0 ? (
            <p className="type-caption mt-5.5 text-ink-muted">{t("empty")}</p>
          ) : (
            <ul className="mt-4 flex flex-col">
              {guests.map((guest) => (
                <li key={guest.id} className="flex flex-col gap-2 border-b border-ink-body/14 py-4 last:border-b-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-base">
                      <b className="font-semibold">{guest.name}</b>{" "}
                      <span className="text-ink-muted">· {t("owner", { owner: guest.owner_name })}</span>
                    </span>
                    <span className="shrink-0 text-sm text-ink-muted">{guest.matches}</span>
                  </span>
                  <AdminLinkForm guest={guest} />
                </li>
              ))}
            </ul>
          )}
        </>
      }
    />
  );
}
