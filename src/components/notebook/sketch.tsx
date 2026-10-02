import { cn } from "@/lib/utils";

// What a screen looks like while its data arrives: its content sketched in
// faint, gently pulsing ink (the `sketch` utility in globals.css), where the
// titles will be painted and the lines written. Decorative: a loading screen
// says "Cargando…" once, as a status.

/** A faint line where text will be written. */
export function SketchLine({ width, className }: { width: string; className?: string }) {
  return <span aria-hidden className={cn("sketch block h-3", className)} style={{ width }} />;
}

/** A faint stroke where a title band will be painted. */
export function SketchBand({ variant = 1 }: { variant?: 1 | 2 }) {
  return (
    <div aria-hidden className="relative min-h-[46px] notebook:min-h-[50px]">
      <span
        className={cn(
          "ink sketch -inset-x-[18px] -inset-y-[11px] notebook:-inset-x-[26px] notebook:-inset-y-[12px]",
          variant === 1 ? "ink--band1" : "ink--band2",
        )}
      />
    </div>
  );
}

/** A page's blocks: a title band, then a few lines of different lengths. */
export function PageSketch({ blocks }: { blocks: string[][] }) {
  return (
    <>
      {blocks.map((lines, i) => (
        <div key={i} className={i > 0 ? "mt-11" : undefined}>
          <SketchBand variant={i % 2 === 0 ? 1 : 2} />
          <div className="mt-6 flex flex-col gap-4">
            {lines.map((width, j) => (
              <SketchLine key={j} width={width} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** The insert's "Diario de / Name / N expediciones", sketched. */
export function IdentitySketch({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-2.5", className)}>
      <SketchLine width="5.5rem" className="h-2.5" />
      <SketchLine width="9.5rem" className="h-6" />
      <SketchLine width="8rem" className="h-2.5" />
    </div>
  );
}
