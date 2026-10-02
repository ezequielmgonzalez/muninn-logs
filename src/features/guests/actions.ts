"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";

import { localeSchema, usernameSchema } from "@/features/auth/schemas";
import { redirect } from "@/i18n/navigation";
import { logUnexpected } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

// ---------------------------------------------------------------------------
// Between friends
// ---------------------------------------------------------------------------

export type RequestLinkState =
  | { status: "idle" }
  | { status: "error"; error: "alreadyRequested" | "notAllowed" | "generic" };

/** A guest's owner asks a friend "are you this guest?". */
export async function requestGuestLink(_state: RequestLinkState, formData: FormData): Promise<RequestLinkState> {
  const guestId = idSchema.parse(formData.get("guestId"));
  const friendId = idSchema.safeParse(formData.get("friendId"));
  if (!friendId.success) return { status: "error", error: "notAllowed" };

  const supabase = await createClient();
  const { error } = await supabase.from("guest_claims").insert({ guest_id: guestId, user_id: friendId.data });
  if (error) {
    // 23505: this guest already has a pending request. 42501: RLS (not your
    // guest, or not a friend anymore).
    if (error.code === "23505") return { status: "error", error: "alreadyRequested" };
    if (error.code === "42501") return { status: "error", error: "notAllowed" };
    logUnexpected("requestGuestLink", error);
    return { status: "error", error: "generic" };
  }
  refresh();
  return { status: "idle" };
}

/** Cancels a request (its sender) or declines it (its recipient). */
export async function removeGuestLinkRequest(formData: FormData) {
  const claimId = idSchema.parse(formData.get("claimId"));
  const supabase = await createClient();
  const { error } = await supabase.from("guest_claims").delete().eq("id", claimId);
  if (error) logUnexpected("removeGuestLinkRequest", error);
  refresh();
}

export type AcceptLinkState = { status: "idle" } | { status: "error"; error: "conflict" | "generic" };

/** "Yes, that's me": the guest's matches move to the user's account. */
export async function acceptGuestLink(_state: AcceptLinkState, formData: FormData): Promise<AcceptLinkState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const claimId = idSchema.parse(formData.get("claimId"));

  const supabase = await createClient();
  const { data: moved, error } = await supabase.rpc("accept_guest_claim", { claim_id: claimId });
  if (error) {
    // 23505: the guest and the user already played the same match.
    if (error.code === "23505") return { status: "error", error: "conflict" };
    logUnexpected("acceptGuestLink", error);
    return { status: "error", error: "generic" };
  }
  // The notebook around every screen outlives navigation: refresh its "N expediciones".
  revalidatePath("/", "layout");
  return redirect({ href: { pathname: "/", query: { linked: String(moved) } }, locale });
}

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------

export type AdminLinkState =
  | { status: "idle" }
  | { status: "confirm"; username: string; userId: string; userName: string }
  | { status: "error"; error: "invalidUsername" | "notFound" | "conflict" | "notAllowed" | "generic"; username: string };

/**
 * Two steps: first find the account by username and ask for confirmation,
 * then link. The database checks the admin role on every link.
 */
export async function adminLinkGuest(_state: AdminLinkState, formData: FormData): Promise<AdminLinkState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const guestId = idSchema.parse(formData.get("guestId"));
  const submitted = String(formData.get("username") ?? "");
  const fail = (error: Extract<AdminLinkState, { status: "error" }>["error"]): AdminLinkState => ({
    status: "error",
    error,
    username: submitted,
  });

  const supabase = await createClient();

  const confirmedUserId = formData.get("confirmUserId");
  if (!confirmedUserId) {
    const username = usernameSchema.safeParse(submitted.replace(/^@/, ""));
    if (!username.success) return fail("invalidUsername");
    const { data: found } = await supabase.rpc("find_profile_by_username", { search_username: username.data });
    const user = found?.[0];
    if (!user) return fail("notFound");
    return { status: "confirm", username: submitted, userId: user.id, userName: user.display_name };
  }

  const userId = idSchema.parse(confirmedUserId);
  const { data: moved, error } = await supabase.rpc("admin_link_guest", { guest_id: guestId, user_id: userId });
  if (error) {
    if (error.code === "23505") return fail("conflict");
    if (error.code === "42501") return fail("notAllowed");
    logUnexpected("adminLinkGuest", error);
    return fail("generic");
  }
  // The notebook around every screen outlives navigation: refresh its "N expediciones".
  revalidatePath("/", "layout");
  return redirect({ href: { pathname: "/admin/guests", query: { linked: String(moved) } }, locale });
}
