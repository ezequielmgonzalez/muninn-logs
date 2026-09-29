"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { usernameSchema } from "@/features/auth/schemas";
import { logUnexpected } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

// Codes map to Friends.errors.* in the messages. Errors echo the submitted
// username back because React resets the form after the action runs.
export type AddFriendState =
  | { status: "idle" }
  | { status: "sent" | "accepted"; name: string }
  | {
      status: "error";
      error: "invalidUsername" | "notFound" | "self" | "alreadyFriends" | "alreadyRequested" | "generic";
      username: string;
    };

const userIdSchema = z.uuid();

/** A filter matching the friendship row between two users, in either direction. */
function pairFilter(a: string, b: string) {
  return `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`;
}

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub;
}

export async function addFriend(_state: AddFriendState, formData: FormData): Promise<AddFriendState> {
  const submitted = String(formData.get("username") ?? "");
  const fail = (error: Extract<AddFriendState, { status: "error" }>["error"]): AddFriendState => ({
    status: "error",
    error,
    username: submitted,
  });

  const username = usernameSchema.safeParse(submitted.replace(/^@/, ""));
  if (!username.success) return fail("invalidUsername");

  const supabase = await createClient();
  const me = await currentUserId(supabase);
  if (!me) return fail("generic");

  const { data: found } = await supabase.rpc("find_profile_by_username", {
    search_username: username.data,
  });
  const target = found?.[0];
  if (!target) return fail("notFound");
  if (target.id === me) return fail("self");

  const { data: existing } = await supabase
    .from("friendships")
    .select("requester_id, status")
    .or(pairFilter(me, target.id))
    .maybeSingle();

  if (existing?.status === "accepted") return fail("alreadyFriends");
  if (existing?.requester_id === me) return fail("alreadyRequested");

  if (existing) {
    // They had already asked me: adding them back accepts their request.
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester_id", target.id)
      .eq("addressee_id", me);
    if (error) {
      logUnexpected("addFriend.accept", error);
      return fail("generic");
    }
    refresh();
    return { status: "accepted", name: target.display_name };
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: me, addressee_id: target.id });
  if (error) {
    // 23505: a request appeared in between (e.g. sent from another tab).
    if (error.code === "23505") return fail("alreadyRequested");
    logUnexpected("addFriend.insert", error);
    return fail("generic");
  }
  refresh();
  return { status: "sent", name: target.display_name };
}

export async function acceptFriendRequest(formData: FormData) {
  const requesterId = userIdSchema.parse(formData.get("userId"));
  const supabase = await createClient();
  const me = await currentUserId(supabase);
  if (!me) return;

  // RLS only lets the addressee accept, and only a pending request.
  await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester_id", requesterId)
    .eq("addressee_id", me);
  refresh();
}

/** Declines a received request, cancels a sent one, or removes a friend. */
export async function removeFriendship(formData: FormData) {
  const otherId = userIdSchema.parse(formData.get("userId"));
  const supabase = await createClient();
  const me = await currentUserId(supabase);
  if (!me) return;

  await supabase.from("friendships").delete().or(pairFilter(me, otherId));
  refresh();
}
