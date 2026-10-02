import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { PlusIcon } from "./icons";
import { TurnLink } from "./page-turn";

// The ink button: a screen's main action, a box drawn in pen around its label
// with a faint wash of ink inside (design/components/InkButton.md). Brush
// strokes are for titles and the navigation; what you press is drawn in pen.
// The box is a ::before with a pen mask and the wash an ::after, both behind
// the content, so the button can also render a link (asChild) without an
// extra element. Never border-radius or shadow on them.

export const inkButtonVariants = cva(
  [
    "relative isolate inline-flex cursor-pointer items-center justify-center gap-2.5 text-ink select-none",
    "before:ink before:ink--pen-box before:-inset-x-1 before:-inset-y-1 before:-z-1 before:bg-ink",
    "after:absolute after:inset-0.5 after:-z-1 after:bg-ink/7 after:transition-colors hover:after:bg-ink/12",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-5 focus-visible:outline-bronze",
    // Disabled: the whole button fades. Always say why next to it.
    "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** A screen's main action: full column width. */
        // Drawn in with its screen's strokes.
        primary: "type-ink-button h-[52px] w-full before:paint-in",
        /** "Cargar partida" on the desktop insert: part of the notebook, so it isn't drawn again on every screen. */
        insert: "type-ink-button h-12 w-full text-[13px]",
      },
      tone: {
        ink: "",
        /** Irreversible actions (deleting a game, the account): red ink. */
        danger: "text-destructive before:bg-destructive after:bg-destructive/7 hover:after:bg-destructive/12",
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
    <TurnLink
      href="/matches/new"
      direction="forward"
      aria-label={label}
      className="relative -mt-10 flex cursor-pointer flex-col items-center gap-0.5 text-[11px] leading-[14px] font-semibold text-ink-body outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze"
    >
      <span className="relative flex size-[62px] items-center justify-center">
        <span aria-hidden className="ink ink--blot -inset-1 bg-ink" />
        <PlusIcon size={24} className="relative z-2 text-band-text" />
      </span>
      <span aria-hidden>{shortLabel}</span>
    </TurnLink>
  );
}
