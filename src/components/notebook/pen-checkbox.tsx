import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One of several that can be ticked at once: a real checkbox, drawn in pen
 * (what you press is drawn, not painted). Where only one can be picked, the
 * pick is circled instead (PenCircle).
 * The input lies see-through over the whole label, so every tap lands on it.
 * `label` names it for screen readers when what shows is shorter ("3" for
 * "3 jugadores").
 */
export function PenCheck({
  checked,
  onChange,
  label,
  className,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-1.5 text-[15px] text-ink-body", className)}>
      <input
        type="checkbox"
        className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
      <PenCheckbox />
      <span aria-hidden={label ? true : undefined}>{children}</span>
    </label>
  );
}

/**
 * A box drawn in pen, with a pen tick when its checkbox (the input right
 * before it, a peer) is checked. The tick runs a little past the box, as a
 * quick one does. Focus shows on the box.
 */
function PenCheckbox() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-[18px] shrink-0 overflow-visible text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bronze [&_[data-tick]]:hidden peer-checked:[&_[data-tick]]:inline"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path strokeWidth={1.6} d="M2.4 3.4C7.2 2.7 12.4 3.1 17.4 2.5M16.8 1.9C17.2 7.2 16.9 12.6 17.3 17.6M17.8 16.9C12.4 17.4 7.4 17 2.1 17.5M2.9 18.2C2.4 13 2.8 7.8 2.2 2.4" />
      <path data-tick strokeWidth={2} d="M5 10.2C6.4 11.6 7.5 13 8.6 14.8C10.6 9.8 13.9 5.4 18.6 1.6" />
    </svg>
  );
}
