"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/logo";

const ROTATING_TAGLINES = [
  "Un solo lugar para toda tu carrera.",
  "Materias, notas y estudio conectados.",
  "Tu portafolio, siempre listo.",
  "IA que entiende tus apuntes.",
];

function RotatingTagline() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setI((v) => (v + 1) % ROTATING_TAGLINES.length),
      3200
    );
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-grid">
      {ROTATING_TAGLINES.map((t) => (
        <span
          key={`s-${t}`}
          aria-hidden
          className="invisible col-start-1 row-start-1 whitespace-nowrap"
        >
          {t}
        </span>
      ))}
      {ROTATING_TAGLINES.map((t, idx) => (
        <span
          key={t}
          className={`col-start-1 row-start-1 transition-all duration-500 ease-out ${
            idx === i
              ? "translate-y-0 opacity-100 blur-0"
              : "pointer-events-none translate-y-3 opacity-0 blur-[2px]"
          }`}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

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
    <main className="relative min-h-[100dvh] overflow-hidden bg-zinc-950">
      {/* Aurora global background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 15% 20%, rgba(99,102,241,0.28), transparent 60%), radial-gradient(ellipse 60% 45% at 85% 30%, rgba(139,92,246,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(56,189,248,0.12), transparent 60%)",
        }}
      />
      {/* Sutil grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Volver a landing */}
      <Link
        href="/"
        className="group absolute left-6 top-6 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-xl transition hover:border-white/25 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M15 6l-6 6 6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Volver
      </Link>

      {/* Version chip */}
      <div className="absolute right-6 top-6 z-20 flex items-center gap-2 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          Operativo
        </span>
        <span className="hidden font-mono sm:inline">v1.0</span>
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16 lg:py-16">
        {/* Panel izquierdo (hero) — oculto en móvil */}
        <div className="hidden flex-col justify-center lg:flex">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-3 self-start"
          >
            <LogoMark size={48} />
            <span className="text-3xl font-black tracking-tight">Acadia</span>
          </Link>
          <h2 className="max-w-md text-4xl font-black leading-[1.1] tracking-tight">
            El sistema operativo{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              de tu carrera.
            </span>
          </h2>
          <p className="mt-6 max-w-md text-base text-zinc-400">
            <RotatingTagline />
          </p>

          <ul className="mt-10 space-y-3 text-sm text-zinc-400">
            {[
              "Acceso privado, tú controlas tus datos.",
              "Google Drive: solo carpetas creadas por Acadia.",
              "Sin publicidad. Sin tracking. Sin ruido.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Panel derecho — auth card */}
        <div className="mx-auto flex w-full max-w-md flex-col animate-fade-in-up">
          {/* Header compacto (visible siempre; en desktop es duplicado del panel izq, pero centrado) */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <LogoMark size={56} />
            <h1 className="mt-4 text-3xl font-black tracking-tight">Acadia</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Tu sistema operativo académico.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl sm:p-10">
            {/* Accent superior */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
            />

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Ingresar
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Continúa con tu cuenta de Google.
              </p>
            </div>

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-indigo-200/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
              />
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
                <svg className="relative h-5 w-5" viewBox="0 0 24 24" aria-hidden>
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
              <span className="relative">
                {loading ? "Redirigiendo…" : "Continuar con Google"}
              </span>
            </button>

            {error && (
              <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-8 flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-500">
              <span className="h-px flex-1 bg-white/10" />
              <span>Autenticación segura</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mt-6 space-y-3 text-xs leading-relaxed text-zinc-500">
              <div className="flex items-start gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  OAuth 2.0 vía Google. Nunca guardamos tu contraseña.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  Solo acceso a las carpetas que crea Acadia en tu Drive.
                </span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-zinc-600">
            Al continuar aceptas el uso privado del sistema.
            <br />
            Sin publicidad · Sin tracking externo.
          </p>
        </div>
      </div>
    </main>
  );
}
