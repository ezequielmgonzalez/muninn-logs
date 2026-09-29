import { getTranslations } from "next-intl/server";

import { PaintedBand } from "@/components/painted-band";
import { Link } from "@/i18n/navigation";

type Section = { heading: string; body: string };

/** A plain-language legal page (privacy policy or terms), from Legal.<page> in the messages. */
export async function LegalPage({ page }: { page: "privacy" | "terms" }) {
  const t = await getTranslations("Legal");
  const sections = t.raw(`${page}.sections`) as Section[];

  return (
    <>
      <PaintedBand as="p" size="page">
        <Link href="/">Muninn Logs</Link>
      </PaintedBand>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-11">
        <div className="flex flex-col gap-3">
          <PaintedBand as="h1">{t(`${page}.title`)}</PaintedBand>
          <p className="type-caption text-ink-muted">{t("updated")}</p>
        </div>
        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="type-body-strong text-lg">{section.heading}</h2>
            <p className="leading-relaxed text-ink-body">{section.body}</p>
          </section>
        ))}
      </main>
    </>
  );
}
