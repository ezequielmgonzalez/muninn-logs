/** The bronze progress ring from the profile mockup. */
export function WinRateRing({ rate, label, caption }: { rate: number; label: string; caption: string }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 168 168" className="size-42" role="img" aria-label={`${label} ${caption}`}>
      <circle cx="84" cy="84" r={radius} fill="none" stroke="rgba(43,32,20,0.16)" strokeWidth="13" />
      <circle
        cx="84"
        cy="84"
        r={radius}
        fill="none"
        stroke="var(--bronze)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - rate)}
        transform="rotate(-90 84 84)"
      />
      <text x="84" y="84" textAnchor="middle" className="type-stat-hero fill-ink-body">
        {label}
      </text>
      <text x="84" y="106" textAnchor="middle" className="fill-ink-muted text-[12px] italic">
        {caption}
      </text>
    </svg>
  );
}
