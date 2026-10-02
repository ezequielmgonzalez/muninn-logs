import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { NotebookPages } from "@/components/notebook/notebook-shell";
import { SheetLoading } from "@/components/notebook/sheet-loading";
import { PageSketch } from "@/components/notebook/sketch";

/**
 * While a notebook screen's data arrives: its pages sketched in faint ink,
 * inside the notebook (the layout), which stays as it was. It shows at once
 * on navigating (so a slow connection never looks frozen), and a turning page
 * lands on it. "/" is also the signed-out landing, a paper sheet: without a
 * session cookie, sketch that.
 */
export default async function Loading() {
  const signedIn = (await cookies()).getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!signedIn) return <SheetLoading />;

  const t = await getTranslations("Loading");
  return (
    <NotebookPages
      left={
        <>
          <p role="status" className="sr-only">
            {t("label")}
          </p>
          <PageSketch blocks={[["92%", "70%", "84%"], ["64%", "88%", "52%", "76%"]]} />
        </>
      }
      right={<PageSketch blocks={[["86%", "58%", "90%", "66%"], ["72%", "48%"]]} />}
    />
  );
}
