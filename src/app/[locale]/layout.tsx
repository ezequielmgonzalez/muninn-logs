import type { Metadata, Viewport } from "next";
import { Cinzel, Spectral } from "next/font/google";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Paper } from "@/components/paper";
import { SiteFooter } from "@/components/site-footer";
import { routing } from "@/i18n/routing";

import "../globals.css";

// Display face: only for text on a painted band. globals.css reads these variables.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Body face: everything else, numbers included.
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  // The paper's color, for the browser chrome on phones.
  themeColor: "#eae0c8",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: "Muninn Logs",
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${cinzel.variable} ${spectral.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Paper />
        {/* Painted bands bleed up to 30px past their box; clip it here, not on
            <body>, whose overflow browsers hand to the viewport instead. */}
        <div className="flex flex-1 flex-col overflow-x-clip">
          <NextIntlClientProvider>
            {children}
            <SiteFooter />
          </NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}
