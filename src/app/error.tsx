"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[route-error]", error.message, error.digest ?? "", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-red-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 9v4m0 4h.01" strokeLinecap="round" />
          <path
            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">
        Algo se rompió por aquí.
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        Registramos el problema. Puedes reintentar o volver al dashboard.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-zinc-600">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          Ir al dashboard
        </Link>
      </div>
    </main>
  );
}
