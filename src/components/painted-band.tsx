import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The system's signature: two layers of the same ink, each broken by an SVG
 * displacement filter (defined once in <Paper />), instead of a rectangle.
 * See design/brand.md and design/components/painted-band.html.
 *
 * Rules: never add border-radius to a band (its shape comes from the filter);
 * both layers always share one color; content sits above the sharp layer.
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

function PaintLayers({ tone }: { tone: PaintTone }) {
  const background = `var(--${tone})`;
  return (
    <>
      {/* Diffuse, larger, faint pass: pigment bleeding into the paper. */}
      <span
        aria-hidden
        data-paint-layer="bleed"
        className="pointer-events-none absolute -inset-x-[30px] -inset-y-[14px] opacity-26 [filter:url(#paint-rough-blur)]"
        style={{ background }}
      />
      {/* Sharp pass. */}
      <span
        aria-hidden
        data-paint-layer="stroke"
        className="pointer-events-none absolute -inset-x-[9px] -inset-y-[3px] [filter:url(#paint-rough)]"
        style={{ background }}
      />
    </>
  );
}

type PaintedBandProps = {
  children: ReactNode;
  /** "page": edge-to-edge masthead. "section": a section title, as wide as its column. */
  size?: "page" | "section";
  /** Secondary text at the far end of the band, e.g. "28 expediciones registradas". */
  trailing?: ReactNode;
  as?: ElementType;
  className?: string;
};

export function PaintedBand({
  children,
  size = "section",
  trailing,
  as: Tag = "h2",
  className,
}: PaintedBandProps) {
  return (
    <div
      data-painted-band={size}
      className={cn(
        "relative text-band-text",
        size === "page" ? "px-6 py-5 sm:px-14" : "px-[26px] py-[13px]",
        className,
      )}
    >
      <PaintLayers tone="ink" />
      {/* Always above the sharp layer, never on the faint one: keeps text contrast.
          When title and trailing don't fit side by side (phones), the trailing
          part wraps below instead of squeezing the title onto several lines. */}
      <div className="relative z-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <Tag
          className={cn(
            size === "page"
              ? // band-lg, scaled down on phones so a name fits on one line.
                "font-display text-[20px] leading-[26px] font-bold tracking-[0.14em] uppercase sm:text-[26px] sm:leading-[30px]"
              : "type-band-md",
            "m-0",
          )}
        >
          {children}
        </Tag>
        {trailing && (
          <span className="type-band-sm shrink-0 text-band-text-muted">{trailing}</span>
        )}
      </div>
    </div>
  );
}

type PaintedBarProps = {
  /** Share of the full width, from 0 to 1. Values outside are clamped. */
  value: number;
  /** A categorical color, or ink-muted for data without its own color. */
  tone: Exclude<PaintTone, "ink">;
  className?: string;
};

/**
 * A ranking bar: the same brush stroke in a categorical color, cut where the
 * value ends. Decorative: always show the name and value as text next to it.
 */
export function PaintedBar({ value, tone, className }: PaintedBarProps) {
  const percent = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div
      aria-hidden
      data-painted-bar={tone}
      className={cn(
        "relative h-6 after:absolute after:inset-x-0 after:bottom-[3px] after:h-px after:bg-hairline/30",
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0" style={{ width: `${percent}%` }}>
        <PaintLayers tone={tone} />
      </div>
    </div>
  );
}
