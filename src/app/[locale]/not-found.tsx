import { getTranslations } from "next-intl/server";

import { InkButton } from "@/components/notebook/ink-button";
import { PaintedBand } from "@/components/notebook/painted-band";
import { PaperSheet } from "@/components/notebook/paper-sheet";
import { Link } from "@/i18n/navigation";

/** Shown when a page calls notFound(): what doesn't exist and what you can't see look the same. */
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <PaperSheet>
      <PaintedBand as="h1">{t("title")}</PaintedBand>
      <p className="mt-5.5 mb-8.5 text-center text-ink-body">{t("description")}</p>
      <InkButton asChild>
        <Link href="/">{t("home")}</Link>
      </InkButton>
    </PaperSheet>
  );
}
