import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { ChevronDownIcon } from "./icons";

/**
 * A native <select> written on the notebook line, like the text fields
 * (design/components/FormFields.md): no box, an underline that turns bronze on
 * focus, and the chevron at the right end of the line. Native, so phones show
 * their own picker. `className` styles the wrapper (width, flex).
 */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <span data-slot="native-select" className={cn("relative block", className)}>
      <select
        className="min-h-[42px] w-full cursor-pointer appearance-none rounded-none border-0 border-b-[1.5px] border-input bg-transparent pt-2 pr-7 pb-1.5 pl-0.5 text-base text-ink-body outline-none focus-visible:border-b-2 focus-visible:border-bronze disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-ink-muted" />
    </span>
  );
}
