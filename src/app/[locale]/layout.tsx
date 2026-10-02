import type { Metadata, Viewport } from "next";
import { Cinzel, Spectral } from "next/font/google";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { PageTurnProvider } from "@/components/notebook/page-turn";
import { sceneScaleScript } from "@/components/notebook/scene-scale";
import { SceneScale } from "@/components/notebook/scene-scale-sync";
import { routing } from "@/i18n/routing";

import "../globals.css";

// Display face: text on a brush stroke and small labels. globals.css reads these variables.
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
  themeColor: "#ece6d8",
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
      // The scene-scale script sets a style on <html> before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Before the first paint: how big the desktop notebook is (scene-scale.ts). */}
        <script dangerouslySetInnerHTML={{ __html: sceneScaleScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* Brush strokes bleed up to 26px past their box; clip it here, not on
            <body>, whose overflow browsers hand to the viewport instead. */}
        <div className="flex flex-1 flex-col overflow-x-clip">
          {/* Every screen (notebook or paper sheet) carries the legal links itself. */}
          <NextIntlClientProvider>
            {/* Outlives each screen, so a turning page can cover the navigation between them. */}
            <PageTurnProvider>{children}</PageTurnProvider>
            <SceneScale />
          </NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}
