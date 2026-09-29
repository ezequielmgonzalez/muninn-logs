"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { type AcceptLinkState, acceptGuestLink, removeGuestLinkRequest } from "./actions";

type Claim = { id: string; guest_name: string; requested_by_name: string; matches: number };

const idle: AcceptLinkState = { status: "idle" };

/** "Ana says you're Jessi in 12 games. Is that you?", one card per request. */
export function ReceivedClaims({ claims }: { claims: Claim[] }) {
  return (
    <div className="flex flex-col gap-3">
      {claims.map((claim) => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </div>
  );
}

function ClaimCard({ claim }: { claim: Claim }) {
  const t = useTranslations("Guests");
  const locale = useLocale();
  const [state, accept, pending] = useActionState(acceptGuestLink, idle);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-bronze/60 bg-card/70 p-4">
      <p className="text-ink-body">
        {t("received", { requester: claim.requested_by_name, guest: claim.guest_name, count: claim.matches })}
      </p>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`acceptErrors.${state.error}`)}
        </p>
      )}
      <div className="flex gap-2">
        <form action={accept} className="flex-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="claimId" value={claim.id} />
          <Button type="submit" className="h-10 w-full" disabled={pending}>
            {t("yes")}
          </Button>
        </form>
        <form action={removeGuestLinkRequest} className="flex-1">
          <input type="hidden" name="claimId" value={claim.id} />
          <Button type="submit" variant="outline" className="h-10 w-full">
            {t("no")}
          </Button>
        </form>
      </div>
    </div>
  );
}
