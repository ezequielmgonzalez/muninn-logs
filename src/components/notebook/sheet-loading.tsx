import { getTranslations } from "next-intl/server";

import { PaperSheet } from "./paper-sheet";
import { PageSketch } from "./sketch";

/** The loading state of the screens before the notebook: their sheet, sketched. */
export async function SheetLoading({ wide = false }: { wide?: boolean }) {
  const t = await getTranslations("Loading");
  return (
    <PaperSheet wide={wide}>
      <p role="status" className="sr-only">
        {t("label")}
      </p>
      <PageSketch blocks={[["88%", "64%", "78%"]]} />
    </PaperSheet>
  );
}
