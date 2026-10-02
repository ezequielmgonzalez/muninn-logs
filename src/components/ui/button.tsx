import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

import { inkButtonVariants } from "@/components/notebook/ink-button"

// Restyled for the v3 notebook (design/components/InkButton.md): the default
// variant is the ink button, a box drawn in pen; there are no grey buttons, so outline,
// secondary and ghost are a line or plain text, and link is underlined.
const buttonVariants = cva(
  "group/button relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-none border-0 bg-transparent text-[15px] whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze disabled:cursor-not-allowed aria-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: inkButtonVariants({ variant: "primary" }) + " w-auto",
        outline:
          "border-b-[1.5px] border-ink-body/30 text-ink-body hover:border-bronze disabled:opacity-50 aria-expanded:border-bronze",
        secondary:
          "border-b-[1.5px] border-ink-body/30 text-ink-body hover:border-bronze disabled:opacity-50",
        ghost: "text-ink-body underline-offset-4 hover:underline disabled:opacity-50",
        destructive: "text-destructive underline-offset-4 hover:underline disabled:opacity-50",
        link: "h-auto border-b border-ink-body/35 px-0 pb-px text-sm text-ink-body hover:border-bronze",
      },
      size: {
        default: "h-11 px-3",
        xs: "h-6 px-1.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 px-2 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[52px] px-4",
        /** Icon buttons: 34px, muted, no box (turn order, remove). */
        icon: "size-[34px] text-ink-muted hover:text-ink-body",
        "icon-xs": "size-6 text-ink-muted hover:text-ink-body [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 text-ink-muted hover:text-ink-body",
        "icon-lg": "size-11 text-ink-muted hover:text-ink-body",
      },
    },
    // A link reads as text: its underline hugs the words, whatever the size.
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
