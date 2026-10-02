import { getLocale, getTranslations } from "next-intl/server";

import { CloseIcon } from "@/components/notebook/icons";
import { NotebookShell } from "@/components/notebook/notebook-shell";
import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { TurnLink } from "@/components/notebook/page-turn";
import { acceptFriendRequest, removeFriendship } from "@/features/friends/actions";
import { AddFriendForm } from "@/features/friends/add-friend-form";
import { FriendList } from "@/features/friends/friend-list";
import { getFriendships } from "@/features/friends/queries";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function FriendsPage() {
  const [profile, locale, t, tGuests, tCompare] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("Friends"),
    getTranslations("Guests"),
    getTranslations("Compare"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { friends, incoming, outgoing } = await getFriendships(profile.id);

  // One small form per action: works without JavaScript, and the Server
  // Action refreshes the page with the new lists.
  const actionButton = (
    action: (formData: FormData) => Promise<void>,
    userId: string,
    ariaLabel: string,
    content: React.ReactNode,
    props: React.ComponentProps<typeof Button>,
  ) => (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" aria-label={ariaLabel} {...props}>
        {content}
      </Button>
    </form>
  );
  const seeMore = (href: string, label: string) => (
    <p className="mt-4.5 flex justify-end">
      <Button asChild variant="link">
        <TurnLink href={href} direction="forward">
          {label} →
        </TurnLink>
      </Button>
    </p>
  );

  const left = (
    <>
      <h1 className="sr-only">{t("title")}</h1>
      <section>
        <PaintedBand>{t("addTitle")}</PaintedBand>
        <div className="mt-5.5">
          <AddFriendForm />
        </div>
      </section>

      {outgoing.length > 0 && (
        <section className="mt-11">
          <PaintedBand variant={2}>{t("outgoing")}</PaintedBand>
          <div className="mt-2">
            <FriendList
              people={outgoing}
              actions={(person) =>
                actionButton(removeFriendship, person.id, t("cancelName", { name: person.display_name }), t("cancel"), {
                  variant: "ghost",
                  size: "sm",
                })
              }
            />
          </div>
        </section>
      )}

      <section className="mt-11">
        <PaintedBand variant={2} flip>
          {t("guestsTitle")}
        </PaintedBand>
        <p className="mt-5.5 text-ink-body">{t("guestsText")}</p>
        {seeMore("/guests", tGuests("link"))}
      </section>
    </>
  );

  const right = (
    <>
      {incoming.length > 0 && (
        <section className="mb-11">
          <PaintedBand variant={2} flip>
            {t("incoming")}
          </PaintedBand>
          <div className="mt-2">
            <FriendList
              people={incoming}
              actions={(person) => (
                <>
                  {actionButton(acceptFriendRequest, person.id, t("acceptName", { name: person.display_name }), t("accept"), {
                    size: "sm",
                    className: "type-ink-button h-9 px-3 text-xs",
                  })}
                  {actionButton(removeFriendship, person.id, t("declineName", { name: person.display_name }), t("decline"), {
                    variant: "ghost",
                    size: "sm",
                  })}
                </>
              )}
            />
          </div>
        </section>
      )}

      <section>
        <PaintedBand>{t("friends")}</PaintedBand>
        {friends.length > 0 ? (
          <>
            <div className="mt-2">
              <FriendList
                people={friends}
                linkToProfile
                actions={(person) => (
                  <>
                    {person.username && (
                      <Button asChild variant="link">
                        <TurnLink
                          href={{ pathname: "/compare", query: { with: person.username } }}
                          direction="forward"
                          aria-label={t("compareWith", { name: person.display_name })}
                        >
                          {t("compare")}
                        </TurnLink>
                      </Button>
                    )}
                    {actionButton(
                      removeFriendship,
                      person.id,
                      t("removeName", { name: person.display_name }),
                      <CloseIcon />,
                      { variant: "ghost", size: "icon", title: t("remove") },
                    )}
                  </>
                )}
              />
            </div>
            {seeMore("/compare", tCompare("link"))}
          </>
        ) : (
          <p className="type-caption mt-5.5 text-ink-muted">{t("empty")}</p>
        )}
      </section>
    </>
  );

  // On phones your friends come first, then adding one.
  return <NotebookShell active="friends" left={left} right={right} mobileOrder="right-first" />;
}
