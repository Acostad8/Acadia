import { useId } from "react";

type Variant = "icon" | "full" | "wordmark";
type Size = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<Size, { icon: number; text: string; gap: string }> = {
  sm: { icon: 24, text: "text-sm", gap: "gap-2" },
  md: { icon: 32, text: "text-base", gap: "gap-2.5" },
  lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
  xl: { icon: 64, text: "text-4xl", gap: "gap-4" },
};

export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId();
  const bgId = `acadia-bg-${uid}`;
  const fgId = `acadia-fg-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient
          id={fgId}
          x1="16"
          y1="12"
          x2="48"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="16" fill={`url(#${bgId})`} />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="16"
        fill={`url(#${fgId})`}
        opacity="0.08"
      />
      <path
        d="M17 46 L32 15 L47 46"
        stroke={`url(#${fgId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M23 36 L41 36"
        stroke={`url(#${fgId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="50" cy="16" r="3.2" fill="#fef3c7" />
      <circle cx="50" cy="16" r="6" fill="#fef3c7" opacity="0.35" />
    </svg>
  );
}

export function Logo({
  variant = "full",
  size = "md",
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const s = SIZE_MAP[size];
  if (variant === "icon") {
    return <LogoMark size={s.icon} className={className} />;
  }
  if (variant === "wordmark") {
    return (
      <span
        className={`bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text font-bold tracking-tight text-transparent ${s.text} ${className}`}
      >
        Acadia
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <LogoMark size={s.icon} />
      <span
        className={`bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text font-bold tracking-tight text-transparent ${s.text}`}
      >
        Acadia
      </span>
    </span>
  );
}
