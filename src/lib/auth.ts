import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user's profile, or null when signed out.
 * getClaims() verifies the session's JWT, unlike getSession().
 * Cached per request: the notebook shell and the page both ask for it.
 */
export const getCurrentProfile = cache(async () => {
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
});

/**
 * Whether the signed-in user has the admin role (app_metadata, which users
 * can't edit). For showing admin screens only: the database checks it again.
 */
export async function isAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const appMetadata = data?.claims.app_metadata as { role?: string } | undefined;
  return appMetadata?.role === "admin";
}
