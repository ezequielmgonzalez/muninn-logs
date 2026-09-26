import { hasLocale } from "next-intl";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here with a one-time code, exchanged for a session.
export async function GET(request: NextRequest, ctx: RouteContext<"/[locale]/auth/callback">) {
  const { locale: param } = await ctx.params;
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Home sends users without a username on to onboarding.
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=oauth`, request.url));
}
