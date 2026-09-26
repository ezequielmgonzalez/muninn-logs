import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv } from "./env";

/**
 * Refreshes the auth session, then lets `handleRequest` build the response
 * (e.g. next-intl's routing) and attaches the refreshed cookies to it.
 *
 * The refresh runs first on purpose: updating request.cookies rewrites the
 * request's Cookie header, which next-intl forwards to the page, so Server
 * Components render with the new session on this same request.
 */
export async function updateSession(
  request: NextRequest,
  handleRequest: (request: NextRequest) => NextResponse,
) {
  const { url, publishableKey } = getSupabaseEnv();
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] =
    [];
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies, headers) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.push(...cookies);
        Object.assign(cacheHeaders, headers);
      },
    },
  });

  // Don't put code between createServerClient and getClaims(): this call is
  // what triggers the token refresh and the setAll() above.
  await supabase.auth.getClaims();

  const response = handleRequest(request);
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  // Cache-Control headers so a CDN never caches a response carrying auth cookies.
  Object.entries(cacheHeaders).forEach(([key, value]) =>
    response.headers.set(key, value),
  );
  return response;
}
