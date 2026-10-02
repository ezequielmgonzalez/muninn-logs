import type { CSSProperties } from "react";

/** The bronze progress ring (design/screens/estadisticas-*.html): the win rate inside. */
export function WinRateRing({ rate, label, caption }: { rate: number; label: string; caption: string }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 176 176" className="size-[150px] notebook:size-40" role="img" aria-label={`${label} ${caption}`}>
      <circle cx="88" cy="88" r={radius} fill="none" stroke="rgba(43,32,20,0.14)" strokeWidth="13" />
      <circle
        cx="88"
        cy="88"
        r={radius}
        fill="none"
        stroke="var(--bronze)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - rate)}
        transform="rotate(-90 88 88)"
        // Fills from empty when the screen appears.
        className="ring-fill"
        style={{ "--ring-from": circumference } as CSSProperties}
      />
      <text x="88" y="86" textAnchor="middle" className="type-stat-hero fill-ink-body">
        {label}
      </text>
      <text x="88" y="108" textAnchor="middle" className="fill-ink-muted text-[13px] italic">
        {caption}
      </text>
    </svg>
  );
}
