import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type OwnGuest = {
  id: string;
  name: string;
  matches: number;
  /** A pending "are you this guest?" request, if any. */
  claim: { id: string; friendName: string } | null;
};

/** The guests the user created, with their matches and any pending request. */
export async function listOwnGuests(myId: string): Promise<OwnGuest[]> {
  const supabase = await createClient();
  const [{ data: guests, error }, { data: claims, error: claimsError }] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, match_players(count)")
      .eq("owner_id", myId)
      .order("name"),
    supabase
      .from("guest_claims")
      .select("id, guest_id, friend:profiles!guest_claims_user_id_fkey(display_name)")
      .eq("requested_by", myId),
  ]);
  if (error) throw error;
  if (claimsError) throw claimsError;

  return guests.map((g) => {
    const claim = claims.find((c) => c.guest_id === g.id);
    return {
      id: g.id,
      name: g.name ?? "?",
      matches: g.match_players[0]?.count ?? 0,
      claim: claim ? { id: claim.id, friendName: claim.friend?.display_name ?? "?" } : null,
    };
  });
}

/**
 * A guest the user can see (theirs, or one they've played with: RLS decides),
 * or null for anyone else, a user, or an id that isn't one.
 */
export async function getGuest(id: string, myId: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("id, name, owner_id")
    .eq("id", id)
    .is("user_id", null)
    .maybeSingle();
  return data ? { id: data.id, name: data.name ?? "?", isMine: data.owner_id === myId } : null;
}

/** Requests others sent the user: "are you this guest?". */
export async function listReceivedClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_received_guest_claims");
  if (error) throw error;
  return data;
}
