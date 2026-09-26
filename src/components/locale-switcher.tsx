"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex gap-3 text-sm">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === currentLocale ? "true" : undefined}
          className="text-muted-foreground aria-[current]:font-medium aria-[current]:text-foreground"
        >
          {t(locale)}
        </Link>
      ))}
    </nav>
  );
}
