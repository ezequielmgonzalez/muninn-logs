import "server-only";

import { createClient } from "@/lib/supabase/server";

import { type FriendshipRow, groupFriendships } from "./group-friendships";

/** The current user's friends and pending requests. RLS limits rows to their own. */
export async function getFriendships(myId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `status,
       requester:profiles!friendships_requester_id_fkey(id, username, display_name),
       addressee:profiles!friendships_addressee_id_fkey(id, username, display_name)`,
    );
  if (error) throw error;
  return groupFriendships(data as FriendshipRow[], myId);
}

/** Pending requests waiting for the current user, for the badge on home. */
export async function countIncomingRequests(myId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("addressee_id", myId)
    .eq("status", "pending");
  return count ?? 0;
}
