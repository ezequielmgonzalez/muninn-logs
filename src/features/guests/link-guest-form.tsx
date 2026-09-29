"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { type RequestLinkState, requestGuestLink } from "./actions";

const idle: RequestLinkState = { status: "idle" };

/** "Who is Jessi?": pick the friend to ask. */
export function LinkGuestForm({
  guest,
  friends,
}: {
  guest: { id: string; name: string };
  friends: { id: string; display_name: string }[];
}) {
  const t = useTranslations("Guests");
  const [state, action, pending] = useActionState(requestGuestLink, idle);

  if (friends.length === 0) return <p className="type-caption text-ink-muted">{t("noFriends")}</p>;

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="guestId" value={guest.id} />
      <div className="flex gap-2">
        <select
          name="friendId"
          aria-label={t("whoIs", { name: guest.name })}
          defaultValue=""
          required
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            {t("chooseFriend")}
          </option>
          {friends.map((f) => (
            <option key={f.id} value={f.id}>
              {f.display_name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" className="h-10" disabled={pending}>
          {t("send")}
        </Button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
