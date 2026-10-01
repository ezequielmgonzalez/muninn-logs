import type { SVGProps } from "react";

// The notebook's own stroke icons (design/README.md, "Iconografía"): inline,
// currentColor, 1.4–1.6px strokes. Decorative: the text next to them names
// the action. No third-party icon sets or emoji in notebook screens.

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ size, viewBox, children, ...props }: IconProps & { size: number; viewBox: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} aria-hidden fill="none" {...props}>
      {children}
    </svg>
  );
}

/** Marks each item of the insert's navigation. */
export function DiamondIcon(props: IconProps) {
  return (
    <Icon size={15} viewBox="0 0 16 16" {...props}>
      <path d="M8 1 L15 8 L8 15 L1 8 Z" stroke="currentColor" strokeWidth={1.4} />
      <path d="M8 5 L11 8 L8 11 L5 8 Z" fill="currentColor" />
    </Icon>
  );
}

/** Inicio: an open book. */
export function BookIcon(props: IconProps) {
  return (
    <Icon size={22} viewBox="0 0 22 22" {...props}>
      <path
        d="M11 6.5 C9 4.8 6 4.5 3 5.5 V18 C6 17 9 17.3 11 19 C13 17.3 16 17 19 18 V5.5 C16 4.5 13 4.8 11 6.5 Z M11 6.5 V19"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/** Partidas: a ruled sheet. */
export function SheetIcon(props: IconProps) {
  return (
    <Icon size={22} viewBox="0 0 22 22" {...props}>
      <rect x="4.5" y="3" width="13" height="17" rx="1.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M7.5 8 H14.5 M7.5 11.5 H14.5 M7.5 15 H11.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </Icon>
  );
}

/** Estadísticas: bars. */
export function BarsIcon(props: IconProps) {
  return (
    <Icon size={22} viewBox="0 0 22 22" {...props}>
      <path d="M5 19 V12 M11 19 V6 M17 19 V14" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M2.5 20.5 H19.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </Icon>
  );
}

/** Amigos: two people. */
export function PeopleIcon(props: IconProps) {
  return (
    <Icon size={22} viewBox="0 0 22 22" {...props}>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth={1.6} />
      <path d="M2.5 19.5 C2.5 15.5 5 13.5 8 13.5 C11 13.5 13.5 15.5 13.5 19.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="15.5" cy="9" r="2.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M14.5 13.7 C17.5 13.7 19.5 15.6 19.5 19.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </Icon>
  );
}

export function PlusIcon({ size = 16, ...props }: IconProps & { size?: number }) {
  return (
    <Icon size={size} viewBox="0 0 16 16" {...props}>
      <path d="M8 2.5 V13.5 M2.5 8 H13.5" stroke="currentColor" strokeWidth={size > 16 ? 1.6 : 1.8} strokeLinecap="round" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon size={16} viewBox="0 0 16 16" {...props}>
      <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </Icon>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Icon size={16} viewBox="0 0 16 16" {...props}>
      <path d="M8 13 V3 M4 7 L8 3 L12 7" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon size={16} viewBox="0 0 16 16" {...props}>
      <path d="M8 3 V13 M4 9 L8 13 L12 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon size={14} viewBox="0 0 14 14" {...props}>
      <path d="M3 5 L7 9 L11 5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon size={18} viewBox="0 0 18 18" {...props}>
      <rect x="2.5" y="3.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth={1.4} />
      <path d="M2.5 7.5 H15.5 M6 2 V5 M12 2 V5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon size={18} viewBox="0 0 18 18" {...props}>
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth={1.5} />
      <path d="M12 12 L16 16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </Icon>
  );
}

/** The winner's crown, in gold. */
export function CrownIcon(props: IconProps) {
  return (
    <svg width={18} height={16} viewBox="0 0 18 16" aria-hidden fill="none" {...props}>
      <path
        d="M2 12.5 L3.2 4.5 L6.8 8 L9 2.8 L11.2 8 L14.8 4.5 L16 12.5 Z"
        fill="var(--gold)"
        stroke="#6e5022"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path d="M2.5 14.5 H15.5" stroke="#6e5022" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

/** The faint compass rose on the insert, under the navigation. */
export function CompassRose(props: IconProps) {
  const ticks = Array.from({ length: 32 }, (_, i) => {
    const angle = (i * Math.PI) / 16;
    // Every 45° a long tick; short ones between.
    const inner = i % 4 === 0 ? 52 : 58;
    const at = (r: number) => [70 + r * Math.cos(angle), 70 + r * Math.sin(angle)].map((n) => n.toFixed(1));
    const [x1, y1] = at(inner);
    const [x2, y2] = at(62);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth={1} />;
  });
  return (
    <svg width={120} height={120} viewBox="0 0 140 140" aria-hidden fill="none" {...props}>
      <circle cx="70" cy="70" r="66" stroke="var(--ink)" strokeWidth={1.2} />
      <circle cx="70" cy="70" r="62" stroke="var(--ink)" strokeWidth={0.8} />
      {ticks}
      <polygon
        points="98.3,41.7 79.0,70.0 98.3,98.3 70.0,79.0 41.7,98.3 61.0,70.0 41.7,41.7 70.0,61.0"
        stroke="var(--ink)"
        strokeWidth={1}
      />
      <polygon
        points="70.0,14.0 77.1,62.9 126.0,70.0 77.1,77.1 70.0,126.0 62.9,77.1 14.0,70.0 62.9,62.9"
        fill="var(--ink)"
        stroke="var(--ink)"
        strokeWidth={1}
      />
      <circle cx="70" cy="70" r="4" fill="var(--paper-insert)" stroke="var(--ink)" strokeWidth={1} />
    </svg>
  );
}
