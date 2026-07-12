"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DriveBanner({ semesterId }: { semesterId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/drive/setup-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semesterId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
      <div>
        <p className="text-sm font-medium text-amber-300">
          Carpetas de Google Drive pendientes
        </p>
        <p className="mt-0.5 text-xs text-amber-400/70">
          {error ?? "Aún no se creó la estructura de carpetas de este semestre."}
        </p>
      </div>
      <button
        onClick={retry}
        disabled={busy}
        className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50"
      >
        {busy ? "Creando carpetas..." : "Crear carpetas"}
      </button>
    </div>
  );
}
