export function ProgressRing({
  value,
  max = 5,
  size = 56,
  stroke = 5,
  color = "#818cf8",
  trackColor = "rgba(255,255,255,0.08)",
  label,
  hint,
}: {
  value: number | null;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  hint?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  const dashoffset = circumference * (1 - pct);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-label={
          label
            ? `${label}: ${value === null ? "sin datos" : value.toFixed(2)} de ${max}`
            : undefined
        }
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums text-white"
          style={{ fontSize: size * 0.28 }}
        >
          {value === null ? "—" : value.toFixed(1)}
        </span>
        {hint && (
          <span
            className="text-zinc-500"
            style={{ fontSize: size * 0.14 }}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
