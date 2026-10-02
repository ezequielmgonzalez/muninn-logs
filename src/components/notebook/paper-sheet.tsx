import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LegalLinks } from "./legal-links";

const SHEET = "pointer-events-none absolute bg-[url(/paper/page-mobile.webp)] bg-size-[100%_100%] bg-no-repeat";

/**
 * The screens before the notebook (landing, sign-in, onboarding, legal pages,
 * not found): one loose sheet of the notebook's paper on the map, with no
 * navigation. It grows with its content; the language and legal links close it.
 */
export function PaperSheet({
  children,
  wide = false,
  brand = true,
}: {
  children: ReactNode;
  /** For reading: legal pages. */
  wide?: boolean;
  /** "Muninn Logs" at the top, linking home. The landing writes its own. */
  brand?: boolean;
}) {
  return (
    <div
      // Like the notebook, it carries its own footer: the layout's stays hidden.
      data-notebook
      className="flex min-h-dvh flex-col items-center bg-backdrop bg-[url(/paper/backdrop.webp)] bg-cover bg-position-[50%_40%] px-2.5 py-6 sm:justify-center sm:py-12"
    >
      <div className={cn("relative w-full", wide ? "max-w-[680px]" : "max-w-[460px]")}>
        {/* The sheet and its thickness: two darker copies offset below. */}
        <div aria-hidden>
          <div className={cn(SHEET, "inset-[6px_-4px_-6px_4px] brightness-[0.68]")} />
          <div className={cn(SHEET, "inset-[3px_-2px_-3px_2px] brightness-[0.84]")} />
          <div className={cn(SHEET, "inset-0 drop-shadow-[0_10px_16px_rgba(48,30,12,0.45)]")} />
        </div>
        <main className="enter-stagger relative z-5 flex flex-col px-[26px] pt-11 pb-8 sm:px-[46px] sm:pt-[54px] sm:pb-10">
          {brand && (
            <p className="mb-8.5 text-center">
              <Link href="/" className="type-diary-name text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze">
                Muninn Logs
              </Link>
            </p>
          )}
          {children}
          <footer className="mt-11 flex flex-col items-center gap-3">
            <LocaleSwitcher />
            <LegalLinks />
          </footer>
        </main>
      </div>
    </div>
  );
}
