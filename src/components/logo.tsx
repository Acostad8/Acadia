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
  return (
    <img
      src="/logo-mark.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      className={`shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    />
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
