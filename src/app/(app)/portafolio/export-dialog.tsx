"use client";

import { useState } from "react";
import { PORTFOLIO_TEMPLATES, type PortfolioTemplate } from "@/lib/portfolio/data";

export function PortfolioExportDialog({ onClose }: { onClose: () => void }) {
  const [template, setTemplate] = useState<PortfolioTemplate>("minimal");
  const [onePage, setOnePage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; cached: boolean } | null>(
    null
  );

  async function generate(force = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, onePage, force }),
      });
      const data = (await res.json()) as {
        url?: string;
        cached?: boolean;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo generar el PDF.");
        return;
      }
      setResult({ url: data.url, cached: Boolean(data.cached) });
    } catch {
      setError("Error de red al generar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
              Exportar
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              PDF del portafolio
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Un CV académico con QR al perfil público. Se cachea 24h.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className="rounded-lg px-2 py-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Plantilla
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {PORTFOLIO_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  template === t.id
                    ? "border-indigo-400/60 bg-indigo-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <p className="text-sm font-semibold text-white">{t.label}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{t.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <input
            type="checkbox"
            checked={onePage}
            onChange={(e) => setOnePage(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-indigo-500"
          />
          <div>
            <p className="text-sm font-medium text-white">
              Modo una página (top 3 por semestre)
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Prioriza proyectos terminados, luego en desarrollo, luego ideas.
            </p>
          </div>
        </label>

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
            <p className="text-emerald-300">
              PDF listo{result.cached ? " (cacheado)" : ""}.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:brightness-95"
              >
                Abrir PDF
              </a>
              <a
                href={result.url}
                download
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                Descargar
              </a>
              <button
                onClick={() => generate(true)}
                disabled={busy}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white disabled:opacity-50"
              >
                Regenerar
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Cerrar
          </button>
          <button
            onClick={() => generate(false)}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Generando..." : result ? "Volver a generar" : "Generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
