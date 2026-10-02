"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "@/i18n/navigation";
import { logUnexpected } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

import {
  codeSchema,
  displayNameSchema,
  emailSchema,
  localeSchema,
  usernameSchema,
} from "./schemas";
import { signInMethods } from "./sign-in-methods";

// Actions return error codes; the forms translate them (Auth.errors.*).
// Errors echo the submitted values back because React resets a form's fields
// after its action runs; the forms use them as defaultValue.
export type SignInState =
  | { status: "idle" }
  | { status: "code-sent"; email: string }
  | {
      status: "error";
      error: "invalidEmail" | "invalidCode" | "rateLimited" | "emailDisabled" | "generic";
      email: string;
    };

export type ProfileState =
  | { status: "idle" }
  | {
      status: "error";
      error: "invalidUsername" | "invalidDisplayName" | "usernameTaken" | "generic";
      username: string;
      displayName: string;
    };

export async function sendCode(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const submittedEmail = String(formData.get("email") ?? "");
  // Production signs in with Google only: refuse here too, not just in the form.
  if (!signInMethods().email) return { status: "error", error: "emailDisabled", email: submittedEmail };
  const email = emailSchema.safeParse(submittedEmail);
  if (!email.success) return { status: "error", error: "invalidEmail", email: submittedEmail };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true },
  });
  if (error) {
    if (error.code !== "over_email_send_rate_limit") logUnexpected("sendCode", error);
    return {
      status: "error",
      error: error.code === "over_email_send_rate_limit" ? "rateLimited" : "generic",
      email: email.data,
    };
  }
  return { status: "code-sent", email: email.data };
}

export async function verifyCode(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!signInMethods().email) {
    return { status: "error", error: "emailDisabled", email: String(formData.get("email") ?? "") };
  }
  const email = emailSchema.safeParse(formData.get("email"));
  const code = codeSchema.safeParse(formData.get("code"));
  const locale = localeSchema.parse(formData.get("locale"));
  if (!email.success) {
    return { status: "error", error: "invalidEmail", email: String(formData.get("email") ?? "") };
  }
  if (!code.success) return { status: "error", error: "invalidCode", email: email.data };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type: "email",
  });
  if (error) {
    // Supabase reports wrong and expired codes the same way (otp_expired).
    if (error.code !== "otp_expired") logUnexpected("verifyCode", error);
    return {
      status: "error",
      error: error.code === "otp_expired" ? "invalidCode" : "generic",
      email: email.data,
    };
  }

  // Home sends users without a username on to onboarding.
  return redirect({ href: "/", locale });
}

/** Sets the username and display name: first during onboarding, later from "Editar perfil". */
export async function saveProfile(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const submitted = {
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
  };
  const username = usernameSchema.safeParse(submitted.username);
  const displayName = displayNameSchema.safeParse(submitted.displayName);
  const locale = localeSchema.parse(formData.get("locale"));
  if (!username.success) return { status: "error", error: "invalidUsername", ...submitted };
  if (!displayName.success) return { status: "error", error: "invalidDisplayName", ...submitted };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return redirect({ href: "/login", locale });

  const { error } = await supabase
    .from("profiles")
    .update({ username: username.data, display_name: displayName.data })
    .eq("id", userId);
  if (error) {
    // 23505 = unique_violation on profiles.username.
    if (error.code !== "23505") logUnexpected("saveProfile", error);
    return {
      status: "error",
      error: error.code === "23505" ? "usernameTaken" : "generic",
      ...submitted,
    };
  }

  // The notebook around every screen outlives navigation: refresh the diary's name.
  revalidatePath("/", "layout");
  // After an edit, home confirms it; after onboarding, home is simply the next step.
  return formData.get("mode") === "edit"
    ? redirect({ href: { pathname: "/", query: { profileSaved: "1" } }, locale })
    : redirect({ href: "/", locale });
}

export async function signOut(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect({ href: "/", locale });
}
