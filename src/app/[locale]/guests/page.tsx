import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { getFriendships } from "@/features/friends/queries";
import { removeGuestLinkRequest } from "@/features/guests/actions";
import { LinkGuestForm } from "@/features/guests/link-guest-form";
import { listOwnGuests } from "@/features/guests/queries";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function GuestsPage() {
  const [profile, locale, t, tHome] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Guests"),
    getTranslations("HomePage"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const [guests, { friends }] = await Promise.all([listOwnGuests(profile.id), getFriendships(profile.id)]);

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-11">
        <PaintedBand as="h1">{t("title")}</PaintedBand>
        <p className="text-ink-muted">{t("description")}</p>
        {guests.length === 0 ? (
          <p className="type-caption text-ink-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col">
            {guests.map((guest) => (
              <li key={guest.id} className="flex flex-col gap-2 border-b py-4 last:border-b-0">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="type-body-strong">{guest.name}</span>
                  <span className="text-sm text-ink-muted">{t("matches", { count: guest.matches })}</span>
                </span>
                {guest.claim ? (
                  <form action={removeGuestLinkRequest} className="flex items-center justify-between gap-2">
                    <input type="hidden" name="claimId" value={guest.claim.id} />
                    <span className="type-caption text-ink-muted">{t("pending", { friend: guest.claim.friendName })}</span>
                    <Button type="submit" variant="ghost" className="h-10" aria-label={t("cancelFor", { name: guest.name })}>
                      {t("cancel")}
                    </Button>
                  </form>
                ) : (
                  <LinkGuestForm guest={guest} friends={friends} />
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
