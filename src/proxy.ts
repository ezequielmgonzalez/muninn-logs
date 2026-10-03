import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import {
  PLAYER_COUNTS_COOKIE,
  PLAYER_COUNTS_PARAM,
  parsePlayerCounts,
  serializePlayerCounts,
} from "@/features/player-count/options";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

/**
 * Spanish unless the user chose otherwise. The browser's language doesn't
 * pick one (the group plays in Spanish, often on English-language browsers),
 * but a language chosen with the switcher is remembered (next-intl's cookie).
 */
function withoutBrowserLanguage(request: NextRequest) {
  if (!request.headers.has("accept-language")) return request;
  const headers = new Headers(request.headers);
  headers.delete("accept-language");
  return new NextRequest(request, { headers });
}

/**
 * ?jugadores=3,4 becomes the "Jugadores" filter's cookie, on this very request
 * too (the Cookie header is rewritten, so Server Components read it), so a link
 * carrying it shows the same games. Returns the value to store: a string, null
 * to clear it (every size), or undefined when the URL doesn't say.
 */
function playerCountsFromUrl(request: NextRequest): string | null | undefined {
  const param = request.nextUrl.searchParams.get(PLAYER_COUNTS_PARAM);
  if (param === null) return undefined;
  const value = serializePlayerCounts(parsePlayerCounts(param));
  if (value) request.cookies.set(PLAYER_COUNTS_COOKIE, value);
  else request.cookies.delete(PLAYER_COUNTS_COOKIE);
  return value;
}

export async function proxy(request: NextRequest) {
  const playerCounts = playerCountsFromUrl(request);
  const response = await updateSession(request, (req) => handleI18nRouting(withoutBrowserLanguage(req)));
  if (playerCounts) {
    response.cookies.set(PLAYER_COUNTS_COOKIE, playerCounts, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else if (playerCounts === null) {
    response.cookies.delete(PLAYER_COUNTS_COOKIE);
  }
  return response;
}

export const config = {
  // Every path except API routes, Next.js/Vercel internals and files with an
  // extension (favicon.ico, images...).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
