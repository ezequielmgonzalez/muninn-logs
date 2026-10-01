import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One page of the notebook: on desktop the left or right page of the open
 * notebook (462×908, scrolling inside if a screen overflows); on phones a
 * stretch of the single page. NotebookShell renders these for `left` and
 * `right`; a screen whose state spans both pages (e.g. one form) renders
 * them itself as the shell's children. `order` sets the phone's stacking.
 */
export function NotebookPage({
  side,
  order,
  className,
  children,
}: {
  side: "left" | "right";
  order?: 1 | 2;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-page={side}
      className={cn(
        "notebook:order-none notebook:h-full notebook:w-[462px] notebook:shrink-0 notebook:overflow-y-auto notebook:pt-[54px] notebook:pb-6",
        side === "left" ? "notebook:pr-[50px] notebook:pl-[46px]" : "notebook:pr-[46px] notebook:pl-[50px]",
        order === 1 && "order-1",
        order === 2 && "order-2",
        className,
      )}
    >
      {children}
    </section>
  );
}
