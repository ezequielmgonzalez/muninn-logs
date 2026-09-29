"use server";

import { localeSchema } from "@/features/auth/schemas";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { logUnexpected } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountState = { status: "idle" } | { status: "error"; error: "mismatch" | "generic" };

/** Deletes the signed-in account once they've typed their username. */
export async function deleteAccount(_state: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const profile = await getCurrentProfile();
  if (!profile) return redirect({ href: "/login", locale });

  // Checked here too, not only in the form: this can't be undone.
  const typed = String(formData.get("username") ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!profile.username || typed !== profile.username) return { status: "error", error: "mismatch" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    logUnexpected("deleteAccount", error);
    return { status: "error", error: "generic" };
  }

  // The account is gone; clear the session cookies it left behind.
  await supabase.auth.signOut();
  return redirect({ href: { pathname: "/", query: { accountDeleted: "1" } }, locale });
}
