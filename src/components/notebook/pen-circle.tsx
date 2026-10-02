import { cn } from "@/lib/utils";

/**
 * A loop drawn in pen around a picked option (design/components/FormFields.md):
 * place it inside the option, absolutely, a little larger than its label.
 * Brush strokes are for titles and the navigation; choices are circled.
 */
export function PenCircle({ className }: { className?: string }) {
  return (
    <span aria-hidden data-pen-circle className={cn("pen-draw pointer-events-none absolute", className)}>
      <span className="ink ink--pen-circle inset-0 bg-ink" />
    </span>
  );
}
