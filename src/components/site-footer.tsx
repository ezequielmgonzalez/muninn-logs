import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function SiteFooter({ className }: { className?: string }) {
  const t = await getTranslations("Legal.footer");
  return (
    <footer className={cn("flex justify-center gap-4 px-6 pt-4 pb-6 text-sm text-ink-muted", className)}>
      <Link href="/privacy" className="underline-offset-4 hover:underline">
        {t("privacy")}
      </Link>
      <Link href="/terms" className="underline-offset-4 hover:underline">
        {t("terms")}
      </Link>
    </footer>
  );
}
