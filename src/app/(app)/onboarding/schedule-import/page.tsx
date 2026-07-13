"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { colorForSubject } from "@/lib/color-hash";
import type { ParsedSchedule } from "@/lib/types";

const DAY_LABELS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type EditableSubject = {
  code: string;
  name: string;
  group_name: string | null;
  professor: string;
  credits: string;
  color: string;
  blocks: ParsedSchedule["subjects"][number]["blocks"];
};

type DriveProgress = {
  done: number;
  total: number;
  label: string;
};

export default function ScheduleImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review" | "committing">("upload");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semesterName, setSemesterName] = useState("");
  const [semesterLabel, setSemesterLabel] = useState("");
  const [subjects, setSubjects] = useState<EditableSubject[]>([]);
  const [driveProgress, setDriveProgress] = useState<DriveProgress | null>(null);
  const [driveSkipped, setDriveSkipped] = useState(false);
  const [semesterId, setSemesterId] = useState<string | null>(null);
  const streamRef = useRef<EventSource | null>(null);

  useEffect(
    () => () => {
      streamRef.current?.close();
    },
    []
  );

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-schedule", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al analizar el PDF");

      const parsed = json as ParsedSchedule;
      setSemesterName(parsed.semester.name);
      setSemesterLabel(parsed.semester.label);
      setSubjects(
        parsed.subjects.map((s) => ({
          code: s.code,
          name: s.name,
          group_name: s.group_name,
          professor: s.professor ?? "",
          credits: "",
          color: colorForSubject(s.code || s.name),
          blocks: s.blocks,
        }))
      );
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  function updateSubject(index: number, patch: Partial<EditableSubject>) {
    setSubjects((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSubject(index: number) {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  }

  async function rollback(semesterId: string) {
    try {
      await fetch("/api/schedule-import/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semesterId }),
      });
    } catch {
      /* silencioso */
    }
  }

  async function commit() {
    setBusy(true);
    setError(null);
    setDriveProgress(null);
    setDriveSkipped(false);
    setStep("committing");

    try {
      const res = await fetch("/api/schedule-import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: {
            name: semesterName.trim(),
            label: semesterLabel.trim() || null,
            set_current: true,
          },
          subjects: subjects.map((s) => ({
            code: s.code || null,
            name: s.name.trim(),
            group_name: s.group_name,
            professor: s.professor.trim() || null,
            credits: s.credits ? parseInt(s.credits, 10) : null,
            color: s.color,
            blocks: s.blocks,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar el semestre");

      const newId = json.semesterId as string;
      setSemesterId(newId);

      await runDriveStream(newId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      setBusy(false);
      setStep("review");
    }
  }

  function runDriveStream(semesterId: string): Promise<void> {
    return new Promise((resolve) => {
      const es = new EventSource(
        `/api/drive/setup-semester/stream?semesterId=${encodeURIComponent(semesterId)}`
      );
      streamRef.current = es;
      let finished = false;

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === "start" || data.type === "progress") {
            setDriveProgress({
              done: data.done ?? 0,
              total: data.total ?? 0,
              label: data.label ?? "Preparando carpetas...",
            });
          } else if (data.type === "done") {
            finished = true;
            es.close();
            router.push("/dashboard");
            router.refresh();
            resolve();
          } else if (data.type === "error") {
            finished = true;
            es.close();
            setError(
              `Drive falló: ${data.message}. El semestre quedó creado; puedes reintentar carpetas desde el dashboard.`
            );
            setDriveSkipped(true);
            setBusy(false);
            resolve();
          }
        } catch {
          /* ignore malformed */
        }
      };

      es.onerror = () => {
        if (finished) return;
        finished = true;
        es.close();
        setError(
          "Conexión con el servidor interrumpida. El semestre quedó guardado."
        );
        setDriveSkipped(true);
        setBusy(false);
        resolve();
      };
    });
  }

  async function discardAndRestart() {
    if (semesterId) {
      await rollback(semesterId);
      setSemesterId(null);
    }
    setStep("upload");
    setSubjects([]);
    setSemesterName("");
    setSemesterLabel("");
    setError(null);
    setDriveProgress(null);
    setDriveSkipped(false);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-indigo-400">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
        {step === "upload"
          ? "Paso 1 de 2"
          : step === "review"
            ? "Paso 2 de 2"
            : "Creando semestre..."}
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white">
        {step === "upload"
          ? "Configura tu semestre"
          : step === "review"
            ? "Revisa tu semestre"
            : "Preparando tu espacio"}
      </h1>

      {step === "upload" && (
        <div className="mt-8">
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
            Sube el horario oficial en PDF que genera tu universidad. Acadia
            detecta materias, horarios, salones y docentes automáticamente — tú
            solo confirmas.
          </p>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`mt-8 flex h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all ${
              dragging
                ? "border-indigo-400 bg-indigo-500/10"
                : "border-white/15 bg-white/[0.03] hover:border-indigo-400/50 hover:bg-white/[0.05]"
            }`}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              {busy ? <Spinner /> : <UploadIcon />}
            </div>
            <span className="text-sm font-semibold text-white">
              {busy ? "Analizando horario..." : "Arrastra tu horario aquí o haz clic"}
            </span>
            <span className="mt-1 text-xs text-zinc-500">PDF · Máximo 10 MB</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        </div>
      )}

      {step === "review" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Semestre
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                className="w-32 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.08]"
                placeholder="2026-1"
              />
              <input
                value={semesterLabel}
                onChange={(e) => setSemesterLabel(e.target.value)}
                className="min-w-64 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.08]"
                placeholder="Primer Semestre del 2026"
              />
            </div>
          </div>

          <div className="space-y-3">
            {subjects.map((s, i) => (
              <div
                key={`${s.code}-${i}`}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-white/20"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-2 ring-white/10 transition hover:ring-white/30">
                    <span
                      className="absolute inset-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <input
                      type="color"
                      value={s.color}
                      onChange={(e) => updateSubject(i, { color: e.target.value })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      title="Color de la materia"
                    />
                  </label>
                  <div className="min-w-48 flex-1">
                    <input
                      value={s.name}
                      onChange={(e) => updateSubject(i, { name: e.target.value })}
                      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-white outline-none transition hover:border-white/15 focus:border-indigo-400/60"
                    />
                    <p className="px-2 text-xs text-zinc-500">
                      {s.code}
                      {s.group_name ? ` · Grupo ${s.group_name}` : ""}
                    </p>
                  </div>
                  <input
                    value={s.credits}
                    onChange={(e) =>
                      updateSubject(i, {
                        credits: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="w-24 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
                    placeholder="Créditos"
                    inputMode="numeric"
                  />
                  <input
                    value={s.professor}
                    onChange={(e) => updateSubject(i, { professor: e.target.value })}
                    className="w-48 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
                    placeholder="Profesor"
                  />
                  <button
                    type="button"
                    onClick={() => removeSubject(i)}
                    aria-label={`Quitar ${s.name}`}
                    className="rounded-lg border border-transparent p-2 text-zinc-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M6 6l12 12M18 6 6 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                {s.blocks.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {s.blocks.map((b, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300"
                        title={b.room_description ?? undefined}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {DAY_LABELS[b.day_of_week]} {b.start_time}–{b.end_time}
                        {b.room_code ? (
                          <span className="text-zinc-500">· {b.room_code}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs italic text-zinc-500">
                    Sin horario asignado
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              onClick={() => setStep("upload")}
              disabled={busy}
              className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Volver
            </button>
            <button
              onClick={commit}
              disabled={busy || !semesterName || subjects.length === 0}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
            >
              Confirmar y crear semestre
            </button>
          </div>
        </div>
      )}

      {step === "committing" && (
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Spinner />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Creando tu semestre...
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {driveProgress
                  ? driveProgress.label
                  : "Guardando materias en la base de datos"}
              </p>
            </div>
          </div>

          {driveProgress && driveProgress.total > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                <span>Carpetas en Google Drive</span>
                <span className="text-zinc-300 tabular-nums">
                  {driveProgress.done}/{driveProgress.total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{
                    width: `${Math.round(
                      (driveProgress.done / driveProgress.total) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {driveSkipped && semesterId && (
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={discardAndRestart}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
              >
                Descartar semestre
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
              >
                Ir al dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </main>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      className="h-5 w-5 text-white"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
