import { getLocale, getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { acceptFriendRequest, removeFriendship } from "@/features/friends/actions";
import { AddFriendForm } from "@/features/friends/add-friend-form";
import { FriendList } from "@/features/friends/friend-list";
import { getFriendships } from "@/features/friends/queries";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function FriendsPage() {
  const [profile, locale, t, tHome, tGuests] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Friends"),
    getTranslations("HomePage"),
    getTranslations("Guests"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { friends, incoming, outgoing } = await getFriendships(profile.id);

  // One small form per action: works without JavaScript, and the Server
  // Action refreshes the page with the new lists.
  const actionButton = (
    action: (formData: FormData) => Promise<void>,
    userId: string,
    label: string,
    ariaLabel: string,
    variant: "default" | "outline" | "ghost",
  ) => (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant={variant} className="h-10" aria-label={ariaLabel}>
        {label}
      </Button>
    </form>
  );

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">{tHome("journal", { name: profile.display_name })}</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-11 px-6 py-11">
        <section className="flex flex-col gap-5">
          <PaintedBand as="h1">{t("title")}</PaintedBand>
          <AddFriendForm />
        </section>

        {incoming.length > 0 && (
          <section className="flex flex-col gap-5">
            <PaintedBand>{t("incoming")}</PaintedBand>
            <FriendList
              people={incoming}
              actions={(person) => (
                <>
                  {actionButton(acceptFriendRequest, person.id, t("accept"), t("acceptName", { name: person.display_name }), "default")}
                  {actionButton(removeFriendship, person.id, t("decline"), t("declineName", { name: person.display_name }), "outline")}
                </>
              )}
            />
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="flex flex-col gap-5">
            <PaintedBand>{t("outgoing")}</PaintedBand>
            <FriendList
              people={outgoing}
              actions={(person) =>
                actionButton(removeFriendship, person.id, t("cancel"), t("cancelName", { name: person.display_name }), "ghost")
              }
            />
          </section>
        )}

        <section className="flex flex-col gap-5">
          <PaintedBand>{t("friends")}</PaintedBand>
          {friends.length > 0 ? (
            <FriendList
              people={friends}
              linkToProfile
              actions={(person) =>
                actionButton(removeFriendship, person.id, t("remove"), t("removeName", { name: person.display_name }), "ghost")
              }
            />
          ) : (
            <p className="type-caption text-ink-muted">{t("empty")}</p>
          )}
        </section>
        <Link href="/guests" className="self-end text-sm text-ink-muted underline-offset-4 hover:underline">
          {tGuests("link")} →
        </Link>
      </main>
    </>
  );
}
