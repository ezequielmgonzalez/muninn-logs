import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/features/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  return { title: `${t("terms.title")} · Muninn Logs` };
}

// Public: linked from Google's sign-in consent screen, readable signed out.
export default function Page() {
  return <LegalPage page="terms" />;
}
