import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { AdminLinkForm } from "@/features/guests/admin-link-form";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminGuestsPage({ searchParams }: PageProps<"/[locale]/admin/guests">) {
  const [profile, locale, admin, t, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    isAdmin(),
    getTranslations("AdminGuests"),
    getTranslations("HomePage"),
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
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-11">
        <PaintedBand as="h1">{t("title")}</PaintedBand>
        <p className="text-ink-muted">{t("description")}</p>
        {typeof linked === "string" && (
          <p role="status" className="type-body-strong text-ink-body">
            {t("linked", { count: Number(linked) })}
          </p>
        )}
        {guests.length === 0 ? (
          <p className="type-caption text-ink-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col">
            {guests.map((guest) => (
              <li key={guest.id} className="flex flex-col gap-2 border-b py-4 last:border-b-0">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="type-body-strong">
                    {guest.name} <span className="font-normal text-ink-muted">· {t("owner", { owner: guest.owner_name })}</span>
                  </span>
                  <span className="shrink-0 text-sm text-ink-muted">{guest.matches}</span>
                </span>
                <AdminLinkForm guest={guest} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
