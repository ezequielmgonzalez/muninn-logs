import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

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

export async function proxy(request: NextRequest) {
  return updateSession(request, (req) => handleI18nRouting(withoutBrowserLanguage(req)));
}

export const config = {
  // Every path except API routes, Next.js/Vercel internals and files with an
  // extension (favicon.ico, images...).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
