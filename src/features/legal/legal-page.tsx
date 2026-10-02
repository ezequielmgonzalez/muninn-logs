import { getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/notebook/painted-band";
import { PaperSheet } from "@/components/notebook/paper-sheet";

type Section = { heading: string; body: string };

/** A plain-language legal page (privacy policy or terms), from Legal.<page> in the messages. */
export async function LegalPage({ page }: { page: "privacy" | "terms" }) {
  const t = await getTranslations("Legal");
  const sections = t.raw(`${page}.sections`) as Section[];

  return (
    <PaperSheet wide>
      <PaintedBand as="h1">{t(`${page}.title`)}</PaintedBand>
      <p className="type-caption mt-3 text-center text-ink-muted">{t("updated")}</p>
      <div className="mt-8.5 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="m-0 mb-2 text-lg font-semibold text-ink-body">{section.heading}</h2>
            <p className="m-0 leading-relaxed text-ink-body">{section.body}</p>
          </section>
        ))}
      </div>
    </PaperSheet>
  );
}
