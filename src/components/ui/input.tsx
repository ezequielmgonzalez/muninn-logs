import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Underline-only, like writing on a notebook line (design/components/FormFields.md).
        "min-h-[42px] w-full min-w-0 rounded-none border-0 border-b-[1.5px] border-input bg-transparent px-0.5 pt-2 pb-1.5 text-base text-ink-body transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#8a7d6e] placeholder:italic focus-visible:border-b-2 focus-visible:border-bronze disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
