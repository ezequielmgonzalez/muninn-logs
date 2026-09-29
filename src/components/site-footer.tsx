import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Legal.footer");
  return (
    <footer className="flex justify-center gap-4 px-6 pt-4 pb-6 text-sm text-ink-muted">
      <Link href="/privacy" className="underline-offset-4 hover:underline">
        {t("privacy")}
      </Link>
      <Link href="/terms" className="underline-offset-4 hover:underline">
        {t("terms")}
      </Link>
    </footer>
  );
}
