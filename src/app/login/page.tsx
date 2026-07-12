"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/logo";

const FEATURES = [
  {
    title: "Horario y materias",
    desc: "Sube tu horario y organiza todas tus materias del semestre.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M3 8h18M7 3v3m10-3v3M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Notas y evaluaciones",
    desc: "Registra ponderaciones y proyecta tu nota final.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 4h12l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M8 12h8M8 16h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Estudio con Pomodoro",
    desc: "Sesiones cronometradas y estadísticas por materia.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 9v4l2.5 2M9 3h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Asistente y Drive",
    desc: "IA para dudas, y documentos organizados en Google Drive.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M12 3a4 4 0 0 0-4 4c0 .5.1 1 .3 1.5A4.5 4.5 0 0 0 5 12.5 4.5 4.5 0 0 0 9.5 17H17a4 4 0 0 0 1-7.9A5 5 0 0 0 12 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/drive.file",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl animate-float-slow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-3xl animate-float-slower"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-0 h-[300px] w-[300px] rounded-full bg-fuchsia-600/10 blur-3xl animate-float-slow"
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-10 text-center animate-fade-in-up">
          <div className="relative mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl shadow-indigo-500/40">
            <LogoMark size={64} />
            <span className="absolute inset-0 rounded-2xl animate-pulse-ring" />
          </div>
          <h1 className="bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
            Acadia
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
            Tu sistema operativo académico.
            <br />
            Horario, notas, estudio, referencias y más en un solo lugar.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl animate-fade-in-up anim-delay-100 sm:p-8">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-xl hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <svg
                className="h-5 w-5 animate-spin text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
            )}
            {loading ? "Redirigiendo..." : "Continuar con Google"}
          </button>

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="h-px flex-1 bg-white/10" />
            <span>Acceso privado · Sin publicidad</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
            Acadia usa tu cuenta de Google para guardar tus documentos en Drive.
            Solo accede a las carpetas que crea la app.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((f, i) => {
            const delayClass = [
              "anim-delay-200",
              "anim-delay-300",
              "anim-delay-400",
              "anim-delay-500",
            ][i];
            return (
            <div
              key={f.title}
              className={`group flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.04] animate-fade-in-up ${delayClass}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300 ring-1 ring-inset ring-white/10 transition group-hover:from-indigo-500/30 group-hover:to-violet-600/30 group-hover:text-indigo-200">
                {f.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
              </div>
            </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-zinc-600 animate-fade-in-up anim-delay-600">
          Hecho para estudiantes · Diseño enfocado, sin distracciones
        </p>
      </div>
    </main>
  );
}
