import { LogoMark } from "@/components/logo";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Preview page — visual comparison de variantes de logo             */
/*  Abre /logos en dev                                                */
/* ------------------------------------------------------------------ */

type Variant = {
  id: string;
  name: string;
  desc: string;
  render: (size: number) => ReactNode;
};

/* ------------------ Variantes ------------------ */

// 0 — Actual (referencia)
function V0Actual({ size }: { size: number }) {
  return <LogoMark size={size} />;
}

// 1 — A geométrica minimal, sin fondo
function V1Minimal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v1g" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d="M14 50 L32 10 L50 50"
        stroke="url(#v1g)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M21 36 L43 36" stroke="url(#v1g)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

// 2 — Libro-birrete: A formada por páginas
function V2Book({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v2g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#v2g)" />
      <path d="M12 46 L32 14 L52 46 Z" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M32 14 L32 46" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path d="M20 38 L44 38" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// 3 — Grafo / nodo (ecosistema)
function V3Graph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v3g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <line x1="32" y1="12" x2="16" y2="46" stroke="url(#v3g)" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="12" x2="48" y2="46" stroke="url(#v3g)" strokeWidth="3" strokeLinecap="round" />
      <line x1="16" y1="46" x2="48" y2="46" stroke="url(#v3g)" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="12" x2="32" y2="46" stroke="url(#v3g)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="32" cy="12" r="5" fill="#818cf8" />
      <circle cx="16" cy="46" r="5" fill="#a78bfa" />
      <circle cx="48" cy="46" r="5" fill="#c4b5fd" />
      <circle cx="32" cy="46" r="3.5" fill="#fef3c7" />
    </svg>
  );
}

// 4 — Órbita
function V4Orbit({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v4g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <ellipse
        cx="32"
        cy="32"
        rx="26"
        ry="10"
        stroke="url(#v4g)"
        strokeWidth="2.5"
        fill="none"
        transform="rotate(-25 32 32)"
      />
      <circle cx="32" cy="32" r="10" fill="url(#v4g)" />
      <circle cx="52" cy="22" r="4" fill="#fef3c7" />
      <circle cx="52" cy="22" r="7" fill="#fef3c7" opacity="0.3" />
    </svg>
  );
}

// 5 — Cursor terminal
function V5Cursor({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v5g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="12" fill="#18181b" stroke="url(#v5g)" strokeWidth="2" />
      <rect x="26" y="16" width="6" height="26" rx="1.5" fill="url(#v5g)">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
      </rect>
      <rect x="20" y="48" width="24" height="4" rx="1.5" fill="url(#v5g)" />
    </svg>
  );
}

// 6 — Toga / borla
function V6Cap({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v6g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#v6g)" />
      <path d="M12 26 L32 18 L52 26 L32 34 Z" fill="#fff" />
      <path d="M18 30 L18 42 Q32 48 46 42 L46 30" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <line x1="50" y1="26" x2="50" y2="40" stroke="#fef3c7" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="42" r="3" fill="#fef3c7" />
    </svg>
  );
}

// 7 — Hexágono con A
function V7Hex({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v7g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
        fill="url(#v7g)"
        stroke="url(#v7g)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M18 46 L32 18 L46 46"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M24 36 L40 36" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// 8 — Wordmark puro (sin icono, se ve solo texto grande)
function V8Wordmark({ size }: { size: number }) {
  const scale = size / 64;
  return (
    <svg width={size * 2.4} height={size} viewBox="0 0 154 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v8g" x1="0" y1="0" x2="154" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#c7d2fe" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="46"
        fontFamily="ui-sans-serif, system-ui, -apple-system"
        fontSize={44 * scale * 1}
        fontWeight="800"
        letterSpacing="-2"
        fill="url(#v8g)"
      >
        acadia
      </text>
      <circle cx="21" cy="16" r="3" fill="#818cf8" />
    </svg>
  );
}

// 9 — A con acento (dot latam)
function V9Accent({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v9g" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d="M14 52 L32 16 L50 52"
        stroke="url(#v9g)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M21 40 L43 40" stroke="url(#v9g)" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="32" cy="7" r="4.5" fill="#818cf8" />
      <circle cx="32" cy="7" r="8" fill="#818cf8" opacity="0.28" />
    </svg>
  );
}

// 10 — Constelación
function V10Constellation({ size }: { size: number }) {
  const pts = [
    { x: 32, y: 10 },
    { x: 20, y: 28 },
    { x: 44, y: 28 },
    { x: 14, y: 50 },
    { x: 50, y: 50 },
    { x: 32, y: 40 },
  ];
  const lines = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [1, 5],
    [2, 5],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="v10g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={pts[a].x}
          y1={pts[a].y}
          x2={pts[b].x}
          y2={pts[b].y}
          stroke="url(#v10g)"
          strokeWidth="1.4"
          opacity="0.6"
          strokeLinecap="round"
        />
      ))}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === 0 ? 4 : 2.8} fill="url(#v10g)" />
          <circle cx={p.x} cy={p.y} r={i === 0 ? 8 : 5} fill="url(#v10g)" opacity="0.2" />
        </g>
      ))}
    </svg>
  );
}

const VARIANTS: Variant[] = [
  {
    id: "0",
    name: "Actual",
    desc: "Referencia · cuadrado gradient + A + estrella amarilla",
    render: (s) => <V0Actual size={s} />,
  },
  {
    id: "1",
    name: "Minimal A",
    desc: "Solo trazos, sin fondo. Escala perfecto a favicon 16px",
    render: (s) => <V1Minimal size={s} />,
  },
  {
    id: "2",
    name: "Libro-A",
    desc: "A con hoja/lomo. Referencia académica sutil",
    render: (s) => <V2Book size={s} />,
  },
  {
    id: "3",
    name: "Grafo",
    desc: "Nodos conectados. Refuerza ecosistema modular",
    render: (s) => <V3Graph size={s} />,
  },
  {
    id: "4",
    name: "Órbita",
    desc: "Sistema en movimiento. Único, memorable, no legible como A",
    render: (s) => <V4Orbit size={s} />,
  },
  {
    id: "5",
    name: "Cursor terminal",
    desc: "Blink dev-tool. Pierde académico, gana identidad software",
    render: (s) => <V5Cursor size={s} />,
  },
  {
    id: "6",
    name: "Toga / birrete",
    desc: "Literal graduación. Riesgo: infantil",
    render: (s) => <V6Cap size={s} />,
  },
  {
    id: "7",
    name: "Hexágono",
    desc: "Contenedor panal. Modularidad. Bien para stickers",
    render: (s) => <V7Hex size={s} />,
  },
  {
    id: "8",
    name: "Wordmark puro",
    desc: "Sin icono, tipo stripe/linear/vercel. Elegante pero requiere buena tipografía",
    render: (s) => <V8Wordmark size={s} />,
  },
  {
    id: "9",
    name: "A + acento",
    desc: "Dot indigo como tilde. Guiño latam / español (á)",
    render: (s) => <V9Accent size={s} />,
  },
  {
    id: "10",
    name: "Constelación",
    desc: "Estrellas conectadas. Poético. Difícil a 16px",
    render: (s) => <V10Constellation size={s} />,
  },
];

export default function LogosPage() {
  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
            Preview
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Variantes de logo · Acadia
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            11 opciones. Cada card muestra el mismo icono en 4 tamaños: 16
            (favicon), 32 (sidebar), 64 (hero) y 128 (marketing).
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {VARIANTS.map((v) => (
            <div
              key={v.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">
                  <span className="mr-2 text-zinc-600 tabular-nums">#{v.id}</span>
                  {v.name}
                </h2>
              </div>
              <p className="mb-6 text-xs text-zinc-500">{v.desc}</p>

              {/* Tamaños */}
              <div className="grid grid-cols-4 gap-3">
                {[16, 32, 64, 128].map((s) => (
                  <div
                    key={s}
                    className="flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-black/40 p-3"
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{ height: 128 }}
                    >
                      {v.render(s)}
                    </div>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {s}px
                    </span>
                  </div>
                ))}
              </div>

              {/* En contexto: navbar + wordmark */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                  {v.render(28)}
                  <span className="text-base font-bold tracking-tight">
                    Acadia
                  </span>
                  <span className="ml-auto text-[10px] text-zinc-600">
                    navbar · 28px
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                  {v.render(22)}
                  <span className="text-sm font-semibold">Acadia</span>
                  <span className="ml-auto text-[10px] text-zinc-600">
                    footer · 22px
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-16 text-center text-xs text-zinc-600">
          Para aplicar una variante: copia su función a{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-zinc-400">
            src/components/logo.tsx
          </code>{" "}
          y reemplaza el body de <code className="text-zinc-400">LogoMark</code>.
        </footer>
      </div>
    </div>
  );
}
