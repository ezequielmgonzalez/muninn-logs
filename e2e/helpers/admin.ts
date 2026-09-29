import { execSync } from "node:child_process";

import type { APIRequestContext } from "@playwright/test";

/**
 * The local Supabase stack's API URL and secret key: from the environment in
 * CI, otherwise asked from `supabase status`. They only ever exist locally.
 */
function localSupabase() {
  if (process.env.SUPABASE_SECRET_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { url: process.env.NEXT_PUBLIC_SUPABASE_URL, secretKey: process.env.SUPABASE_SECRET_KEY };
  }
  const status = execSync("pnpm -s supabase status -o env", { encoding: "utf8" });
  const read = (name: string) => status.match(new RegExp(`^${name}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";
  return { url: read("API_URL"), secretKey: read("SECRET_KEY") };
}

/** Gives an account the admin role. It reaches their session on the next sign-in. */
export async function grantAdmin(request: APIRequestContext, email: string) {
  const { url, secretKey } = localSupabase();
  const headers = { apikey: secretKey };
  const list = await request.get(`${url}/auth/v1/admin/users?per_page=1000`, { headers });
  const { users } = (await list.json()) as { users: { id: string; email: string }[] };
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`No local user ${email}`);
  const update = await request.put(`${url}/auth/v1/admin/users/${user.id}`, {
    headers,
    data: { app_metadata: { role: "admin" } },
  });
  if (!update.ok()) throw new Error(`Granting admin failed: ${update.status()}`);
}
