// The notebook's bronze hardware, as inline SVG (design/components/NotebookShell.md).
// Purely decorative.

const SHADOW = "rgba(0,0,0,0.45)";
const BASE = "#3e2d1b";

/** Desktop: 9 rings across the spine, every 98px, with a punch hole in each page. */
export function SpineRings() {
  return (
    <svg
      width={84}
      height={908}
      viewBox="0 0 84 908"
      aria-hidden
      fill="none"
      className="pointer-events-none absolute top-[46px] left-[722px] z-6 overflow-visible"
    >
      {Array.from({ length: 9 }, (_, i) => {
        const y = 62 + i * 98;
        return (
          <g key={i}>
            <ellipse cx={13} cy={y} rx={4.2} ry={5.4} fill="#120e0b" />
            <ellipse cx={71} cy={y} rx={4.2} ry={5.4} fill="#120e0b" />
            <path d={`M13 ${y + 5} C 30 ${y - 7}, 54 ${y - 7}, 71 ${y + 5}`} stroke={SHADOW} strokeWidth={7} strokeLinecap="round" />
            <path d={`M13 ${y} C 30 ${y - 13}, 54 ${y - 13}, 71 ${y}`} stroke={BASE} strokeWidth={7.5} strokeLinecap="round" />
            <path d={`M13 ${y} C 30 ${y - 13}, 54 ${y - 13}, 71 ${y}`} stroke="var(--bronze)" strokeWidth={4.8} strokeLinecap="round" />
            <path
              d={`M16 ${y - 2.6} C 31 ${y - 14}, 53 ${y - 14}, 68 ${y - 2.6}`}
              stroke="var(--bronze-light)"
              strokeWidth={1.3}
              strokeLinecap="round"
              opacity={0.75}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** One spiral of the phone notebook, bound at the top. */
function Spiral() {
  return (
    <svg width={24} height={40} viewBox="0 0 24 40" aria-hidden fill="none" className="overflow-visible">
      <ellipse cx={12} cy={15} rx={4.6} ry={3.8} fill="#120e0b" />
      <path
        d="M12.5 18 C 9.5 5, 10.5 -11, 16.5 -11 C 21.5 -11, 21.5 -4, 19.5 2"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={5.5}
        strokeLinecap="round"
        transform="translate(2.5 3)"
      />
      <path d="M10.5 15 C 7.5 2, 8.5 -14, 14.5 -14 C 19.5 -14, 19.5 -6, 17.5 -1" stroke={BASE} strokeWidth={6} strokeLinecap="round" />
      <path
        d="M10.5 15 C 7.5 2, 8.5 -14, 14.5 -14 C 19.5 -14, 19.5 -6, 17.5 -1"
        stroke="var(--bronze)"
        strokeWidth={3.8}
        strokeLinecap="round"
      />
      <path d="M9.5 10 C 7.5 0, 8 -12.5, 14 -12.5" stroke="var(--bronze-light)" strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
    </svg>
  );
}

/** Phone: 8 spirals along the top edge of the page, spread across its width. */
export function TopSpirals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-[20px] top-0 z-6 flex justify-between">
      {Array.from({ length: 8 }, (_, i) => (
        <Spiral key={i} />
      ))}
    </div>
  );
}
