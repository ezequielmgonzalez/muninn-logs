"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { localeSchema } from "@/features/auth/schemas";
import { redirect } from "@/i18n/navigation";
import { logUnexpected } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

import { logDuelSchema, toLogDuelArgs } from "./duel-schema";
import { logMatchSchema, toLogMatchArgs } from "./schema";

// Codes map to LogMatch.errors.* in the messages. The form's fields are
// controlled React state, so nothing needs echoing back.
export type SaveMatchState =
  | { status: "idle" }
  | { status: "error"; error: "invalid" | "notAllowed" | "duplicate" | "generic" };

/** Logs a new Arnak match, or replaces one when the form carries its matchId. */
export async function saveMatch(state: SaveMatchState, formData: FormData): Promise<SaveMatchState> {
  return save(formData, (payload) => {
    const input = logMatchSchema.safeParse(payload);
    return input.success ? toLogMatchArgs(input.data) : null;
  });
}

/** The same for a LOTR duel. */
export async function saveDuel(state: SaveMatchState, formData: FormData): Promise<SaveMatchState> {
  return save(formData, (payload) => {
    const input = logDuelSchema.safeParse(payload);
    return input.success ? toLogDuelArgs(input.data) : null;
  });
}

type LogMatchArgs = ReturnType<typeof toLogMatchArgs> | ReturnType<typeof toLogDuelArgs>;

/** Validates the form's payload into log_match()'s arguments, then logs or updates the match. */
async function save(formData: FormData, toArgs: (payload: unknown) => LogMatchArgs | null): Promise<SaveMatchState> {
  const locale = localeSchema.parse(formData.get("locale"));
  const existingId = formData.get("matchId") ? z.uuid().safeParse(formData.get("matchId")) : null;
  if (existingId && !existingId.success) return { status: "error", error: "invalid" };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { status: "error", error: "invalid" };
  }
  const input = toArgs(payload);
  if (!input) return { status: "error", error: "invalid" };

  const supabase = await createClient();
  const { played_on, ...rest } = input;
  // played_on may be null (undated game), which the functions accept; the
  // generated types mark every argument without a default as non-null.
  const args = { ...rest, played_on: played_on as string };
  const { data: matchId, error } = existingId
    ? await supabase.rpc("update_match", {
        match_id: existingId.data,
        played_on: args.played_on,
        players: args.players,
        duration_minutes: args.duration_minutes,
        setup: args.setup,
        turn_order_known: args.turn_order_known,
      })
    : await supabase.rpc("log_match", args);
  if (error) {
    // 42501: RLS refused a player (e.g. no longer a friend), or the match
    // isn't the user's to edit. 23505: a player
    // or leader twice. Anything else was caught by the schema already.
    const code = error.code === "42501" ? "notAllowed" : error.code === "23505" ? "duplicate" : "generic";
    if (code === "generic") logUnexpected("saveMatch", error);
    return { status: "error", error: code };
  }

  // The notebook around every screen outlives navigation: refresh its "N expediciones".
  revalidatePath("/", "layout");
  return redirect({ href: { pathname: `/matches/${matchId}`, query: { saved: "1" } }, locale });
}

/** Deletes a match the user logged; players and scores go with it (cascade). */
export async function deleteMatch(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale"));
  const matchId = z.uuid().parse(formData.get("matchId"));

  const supabase = await createClient();
  // RLS only lets the creator delete; for anyone else this deletes nothing.
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) throw error;

  // The notebook around every screen outlives navigation: refresh its "N expediciones".
  revalidatePath("/", "layout");
  return redirect({ href: "/matches", locale });
}
