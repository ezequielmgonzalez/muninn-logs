import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user's profile, or null when signed out.
 * getClaims() verifies the session's JWT, unlike getSession().
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", userId)
    .single();
  return profile;
}
