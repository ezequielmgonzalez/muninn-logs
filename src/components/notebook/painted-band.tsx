import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The system's signature: a dry-brush stroke of ink behind a title. The stroke
 * is a div with a background color and a PNG mask (public/brush/), so the same
 * shape works in ink for a title and in a leader's color for a bar.
 * See design/README.md ("Las pinceladas") and design/components/PaintedBand.md.
 *
 * Rules: never border-radius, box-shadow or filter on the ink layer (its shape
 * is the mask); text always sits above the ink, on its solid part.
 */

export type PaintTone =
  | "ink"
  /** Neutral data without its own color (e.g. a player with no leader). */
  | "ink-muted"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6"
  | "chart-7"
  | "chart-8";

type PaintedBandProps = {
  children: ReactNode;
  /** "page": a page's title. "section": a section title, as wide as its column. */
  size?: "page" | "section";
  /** Secondary text, e.g. "28 expediciones registradas", or a control on the band. */
  trailing?: ReactNode;
  /** Which of the two band strokes; alternate them between sections of a page. */
  variant?: 1 | 2;
  /** Mirrors the stroke (never the text), so two titles in a row differ. */
  flip?: boolean;
  as?: ElementType;
  className?: string;
};

export function PaintedBand({
  children,
  size = "section",
  trailing,
  variant = 1,
  flip = false,
  as: Tag = "h2",
  className,
}: PaintedBandProps) {
  return (
    <div data-painted-band={size} className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex min-h-[46px] items-center gap-x-4 text-band-text notebook:min-h-[50px]",
          // A page title hugs its text (no edge-to-edge header); a section title fills its column.
          size === "page" ? "mt-6 px-10" : "w-full px-2",
          trailing && size === "section" ? "justify-between" : "justify-center",
        )}
      >
        <div
          aria-hidden
          data-paint-layer="stroke"
          className={cn(
            "ink -inset-x-[18px] -inset-y-[11px] bg-ink notebook:-inset-x-[26px] notebook:-inset-y-[12px]",
            variant === 1 ? "ink--band1" : "ink--band2",
            flip && "-scale-x-100",
          )}
        />
        <Tag className={cn("relative z-2 m-0 text-center", size === "page" ? "type-ink-button" : "type-band-md")}>
          {children}
        </Tag>
        {/* On a section band, a control (e.g. a sort order) sits at its far end. */}
        {trailing && size === "section" && <div className="relative z-2 shrink-0">{trailing}</div>}
      </div>
      {/* A page title's secondary text reads below the stroke, on the paper. */}
      {trailing && size === "page" && <p className="type-caption m-0 text-ink-muted">{trailing}</p>}
    </div>
  );
}

const BAR_MASKS = ["ink--bar1", "ink--bar2", "ink--bar3", "ink--bar4"] as const;

/** Colors that tell players apart in a comparison: you, then up to four friends. */
export const PLAYER_TONES = ["player-you", "player-2", "player-3", "player-4", "player-5"] as const;
export type PlayerTone = (typeof PLAYER_TONES)[number];

type BrushBarProps = {
  /** Share of the full width, from 0 to 1. Values outside are clamped. */
  value: number;
  /** A leader's or category's color, a player's color, or ink-muted for data without one. */
  tone: Exclude<PaintTone, "ink"> | PlayerTone;
  /** The bar's position in its list: bars alternate the four strokes (i % 4). */
  index?: number;
  /** "thin": 9px, for grouped bars (one per player in a category). */
  size?: "default" | "thin";
  className?: string;
};

/**
 * A value bar: a brush stroke in a categorical color, as wide as the value.
 * Zero gets a hairline instead of a stroke. Decorative: always show the name
 * and value as text next to it.
 */
export function BrushBar({ value, tone, index = 0, size = "default", className }: BrushBarProps) {
  const percent = Math.min(Math.max(value, 0), 1) * 100;
  const thin = size === "thin";
  return (
    <div
      aria-hidden
      data-brush-bar={tone}
      className={cn("relative", thin ? "h-[9px]" : "h-[15px] notebook:h-[18px]", className)}
    >
      {percent === 0 ? (
        <div data-paint-layer="hairline" className="absolute inset-x-0 top-1/2 h-px bg-hairline/18" />
      ) : (
        <div className="absolute inset-y-0 left-0" style={{ width: `${percent}%` }}>
          <div
            data-paint-layer="stroke"
            className={cn(
              "ink inset-x-0",
              thin ? "-inset-y-[3px]" : "-inset-y-[5px] notebook:-inset-y-[6px]",
              BAR_MASKS[index % 4],
            )}
            style={{ background: `var(--${tone})` }}
          />
        </div>
      )}
    </div>
  );
}
