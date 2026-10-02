import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { PlusIcon } from "./icons";

// The ink button: a screen's main action, painted with the same stroke as the
// titles (design/components/InkButton.md). The stroke is a ::before with a
// brush mask, behind the content, so the button can also render a link
// (asChild) without an extra element. Never border-radius or shadow on it.

export const inkButtonVariants = cva(
  [
    "relative isolate inline-flex cursor-pointer items-center justify-center gap-2.5 text-band-text select-none",
    "before:ink before:-inset-x-3 before:-inset-y-[9px] before:-z-1 before:bg-ink",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze",
    // Disabled: the ink fades. Always say why next to it.
    "disabled:cursor-not-allowed disabled:before:opacity-42 aria-disabled:pointer-events-none aria-disabled:before:opacity-42",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** A screen's main action: full column width. */
        primary: "type-ink-button h-[52px] w-full before:ink--band1",
        /** "Cargar partida" on the desktop insert. */
        insert: "type-ink-button h-12 w-full text-[13px] before:ink--band2",
      },
      tone: {
        ink: "",
        /** Irreversible actions (deleting a game, the account): red ink. */
        danger: "before:bg-destructive",
      },
    },
    defaultVariants: { variant: "primary", tone: "ink" },
  },
);

export function InkButton({
  variant,
  tone,
  asChild = false,
  className,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof inkButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="ink-button" className={cn(inkButtonVariants({ variant, tone }), className)} {...props} />;
}

/**
 * The phone's main action on the tab bar: a raised ink blot with a plus,
 * labelled "Cargar" underneath. Links to the match form.
 */
export function LoadMatchFab({ label, shortLabel }: { label: string; shortLabel: string }) {
  return (
    <Link
      href="/matches/new"
      aria-label={label}
      className="relative -mt-10 flex cursor-pointer flex-col items-center gap-0.5 text-[11px] leading-[14px] font-semibold text-ink-body outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze"
    >
      <span className="relative flex size-[62px] items-center justify-center">
        <span aria-hidden className="ink ink--blot -inset-1 bg-ink" />
        <PlusIcon size={24} className="relative z-2 text-band-text" />
      </span>
      <span aria-hidden>{shortLabel}</span>
    </Link>
  );
}
