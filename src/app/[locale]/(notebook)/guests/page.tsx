import { getLocale, getTranslations } from "next-intl/server";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { TurnLink } from "@/components/notebook/page-turn";
import { Button } from "@/components/ui/button";
import { getFriendships } from "@/features/friends/queries";
import { removeGuestLinkRequest } from "@/features/guests/actions";
import { LinkGuestForm } from "@/features/guests/link-guest-form";
import { listOwnGuests } from "@/features/guests/queries";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function GuestsPage() {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Guests"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const [guests, { friends }] = await Promise.all([listOwnGuests(profile.id), getFriendships(profile.id)]);

  return (
    <NotebookPages
      left={
        <>
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          <p className="mt-5.5 text-ink-body">{t("description")}</p>
          {guests.length === 0 ? (
            <p className="type-caption mt-5.5 text-ink-muted">{t("empty")}</p>
          ) : (
            <ul className="mt-4 flex flex-col">
              {guests.map((guest) => (
                <li key={guest.id} className="flex flex-col gap-2 border-b border-ink-body/14 py-4 last:border-b-0">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-[34px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-bronze font-display text-sm font-bold text-ink"
                    >
                      {guest.name.charAt(0).toUpperCase()}
                    </span>
                    {/* Their Estadísticas. */}
                    <span className="min-w-0 flex-1 truncate">
                      <TurnLink
                        href={`/guests/${guest.id}`}
                        direction="forward"
                        className="text-base font-semibold text-ink-body underline decoration-ink-body/35 decoration-1 underline-offset-4 hover:decoration-bronze"
                      >
                        {guest.name}
                      </TurnLink>
                    </span>
                    <span className="shrink-0 text-sm text-ink-muted">{t("matches", { count: guest.matches })}</span>
                  </span>
                  {guest.claim ? (
                    <form action={removeGuestLinkRequest} className="flex items-center justify-between gap-2">
                      <input type="hidden" name="claimId" value={guest.claim.id} />
                      <span className="type-caption text-ink-muted">{t("pending", { friend: guest.claim.friendName })}</span>
                      <Button type="submit" variant="ghost" size="sm" aria-label={t("cancelFor", { name: guest.name })}>
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
        </>
      }
    />
  );
}
