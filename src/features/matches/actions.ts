"use server";

import { redirect } from "@/i18n/navigation";
import { localeSchema } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/server";

import { logMatchSchema, toLogMatchArgs } from "./schema";

// Codes map to LogMatch.errors.* in the messages. The form's fields are
// controlled React state, so nothing needs echoing back.
export type LogMatchState =
  | { status: "idle" }
  | { status: "error"; error: "invalid" | "notAllowed" | "duplicate" | "generic" };

export async function logMatch(_state: LogMatchState, formData: FormData): Promise<LogMatchState> {
  const locale = localeSchema.parse(formData.get("locale"));

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { status: "error", error: "invalid" };
  }
  const input = logMatchSchema.safeParse(payload);
  if (!input.success) return { status: "error", error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("log_match", toLogMatchArgs(input.data));
  if (error) {
    // 42501: RLS refused a player (e.g. no longer a friend). 23505: a player
    // or leader twice. Anything else was caught by the schema already.
    const code = error.code === "42501" ? "notAllowed" : error.code === "23505" ? "duplicate" : "generic";
    return { status: "error", error: code };
  }

  return redirect({ href: { pathname: "/", query: { saved: "1" } }, locale });
}
