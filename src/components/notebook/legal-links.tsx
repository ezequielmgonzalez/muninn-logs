import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Privacidad · Términos: public pages (Google's sign-in screen links to them), on every screen. */
export async function LegalLinks({ className }: { className?: string }) {
  const t = await getTranslations("Legal.footer");
  return (
    <div className={cn("flex gap-4 text-xs text-ink-muted", className)}>
      <Link href="/privacy" className="underline-offset-4 hover:underline">
        {t("privacy")}
      </Link>
      <Link href="/terms" className="underline-offset-4 hover:underline">
        {t("terms")}
      </Link>
    </div>
  );
}
