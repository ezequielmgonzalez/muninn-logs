"use server";

import { z } from "zod";

import { localeSchema } from "@/features/auth/schemas";
import { logMatchSchema, toLogMatchArgs } from "@/features/matches/schema";
import { redirect } from "@/i18n/navigation";
import { logUnexpected } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

import { MAX_IMPORT_GAMES } from "./parse-import";

// Codes map to AdminImport.errors.* in the messages. The form keeps the parsed
// file in state, so nothing needs echoing back.
export type ImportMatchesState =
  | { status: "idle" }
  | { status: "error"; error: "invalid" | "notAllowed" | "generic" };

/** Saves every game of an admin's import, all or nothing. */
export async function importMatches(_state: ImportMatchesState, formData: FormData): Promise<ImportMatchesState> {
  const locale = localeSchema.parse(formData.get("locale"));

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { status: "error", error: "invalid" };
  }
  // Each game passes the same checks as one logged by hand.
  const input = z.array(logMatchSchema).min(1).max(MAX_IMPORT_GAMES).safeParse(payload);
  if (!input.success) return { status: "error", error: "invalid" };

  const supabase = await createClient();
  const { data: count, error } = await supabase.rpc("import_matches", {
    // JSON drops the undefined durations, as the function expects.
    games: JSON.parse(JSON.stringify(input.data.map(toLogMatchArgs))),
  });
  if (error) {
    // 42501: not an admin, or RLS refused a player (e.g. no longer a friend).
    if (error.code === "42501") return { status: "error", error: "notAllowed" };
    logUnexpected("importMatches", error);
    return { status: "error", error: "generic" };
  }

  return redirect({ href: { pathname: "/admin/import", query: { imported: String(count) } }, locale });
}
