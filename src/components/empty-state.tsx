import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "default" | "success" | "warning";

export function EmptyState({
  title,
  description,
  icon,
  action,
  variant = "default",
  compact = false,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; href: string };
  variant?: Variant;
  compact?: boolean;
}) {
  const tone =
    variant === "success"
      ? "from-emerald-500/10 to-transparent border-emerald-500/20"
      : variant === "warning"
        ? "from-amber-500/10 to-transparent border-amber-500/20"
        : "from-indigo-500/[0.08] to-transparent border-white/10";

  const iconBg =
    variant === "success"
      ? "bg-emerald-500/15 text-emerald-300"
      : variant === "warning"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-indigo-500/15 text-indigo-300";

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${tone} p-6 text-center ${compact ? "" : "sm:p-10"}`}
    >
      {icon !== undefined && (
        <div
          className={`mx-auto mb-4 flex ${compact ? "h-10 w-10" : "h-14 w-14"} items-center justify-center rounded-2xl ${iconBg}`}
        >
          {icon}
        </div>
      )}
      <h3
        className={`font-semibold text-white ${compact ? "text-sm" : "text-base"}`}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`mx-auto mt-1.5 max-w-md text-zinc-500 ${compact ? "text-xs" : "text-sm"}`}
        >
          {description}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
        >
          {action.label}
          <span>→</span>
        </Link>
      )}
    </div>
  );
}

export function EmptyIcon({
  path,
}: {
  path: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
