"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LogoMark } from "@/components/logo";

/* ------------------------------------------------------------------ */
/*  Reveal on scroll                                                  */
/* ------------------------------------------------------------------ */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({
  variant = "up",
  delay = 0,
  className = "",
  children,
}: {
  variant?: "up" | "left" | "right" | "scale";
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useReveal<HTMLDivElement>();
  const cls =
    variant === "left"
      ? "reveal-left"
      : variant === "right"
        ? "reveal-right"
        : variant === "scale"
          ? "reveal-scale"
          : "reveal";
  const style = delay ? { transitionDelay: `${delay}ms` } : undefined;
  return (
    <div ref={ref} style={style} className={`${cls} ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contador animado                                                  */
/* ------------------------------------------------------------------ */
function CountUp({
  to,
  suffix = "",
  duration = 1600,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let started = false;
    const start = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          start();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Parallax                                                          */
/* ------------------------------------------------------------------ */
function useParallax() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

/* ------------------------------------------------------------------ */
/*  Landing                                                            */
/* ------------------------------------------------------------------ */
export function Landing() {
  const scrollY = useParallax();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70 animate-aurora"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 20% 10%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 20%, rgba(139,92,246,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(56,189,248,0.10), transparent 60%)",
        }}
      />

      <NavBar />
      <Hero scrollY={scrollY} />
      <MarqueeBand />
      <FeatureGrid />
      <NumbersBand />
      <ModulesTour />
      <HowItWorks />
      <Manifesto />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all ${
        scrolled
          ? "border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="text-lg font-bold tracking-tight text-white">
            Acadia
          </span>
        </Link>
        <nav className="hidden gap-8 text-sm text-zinc-400 md:flex">
          <a href="#modulos" className="transition hover:text-white">
            Módulos
          </a>
          <a href="#como" className="transition hover:text-white">
            Cómo funciona
          </a>
          <a href="#manifesto" className="transition hover:text-white">
            Filosofía
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:text-white sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-500/50"
          >
            <span className="relative z-10">Comenzar</span>
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
const HERO_ROTATE = [
  "académico",
  "de estudio",
  "de tu carrera",
  "para tu tesis",
];

function RotatingHeroWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setI((v) => (v + 1) % HERO_ROTATE.length);
    }, 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-grid whitespace-nowrap align-baseline">
      {HERO_ROTATE.map((w) => (
        <span
          key={`spacer-${w}`}
          aria-hidden
          className="invisible col-start-1 row-start-1 whitespace-nowrap px-1"
        >
          {w}
        </span>
      ))}
      {HERO_ROTATE.map((w, idx) => (
        <span
          key={w}
          className={`text-shimmer col-start-1 row-start-1 flex items-center justify-center whitespace-nowrap px-1 transition-all duration-500 ease-out ${
            idx === i
              ? "translate-y-0 opacity-100 blur-0"
              : "pointer-events-none translate-y-4 opacity-0 blur-[2px]"
          }`}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

const LIVE_CMDS = [
  "buscar apuntes de Cálculo…",
  "abrir portafolio público",
  "citar Kant 1781 en APA",
  "nueva tarea: entregar proyecto",
  "resumir capítulo 3 con IA",
];

function LiveCommandBar() {
  const [phrase, setPhrase] = useState(0);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const target = LIVE_CMDS[phrase];
    let i = 0;
    setTyped("");
    const typing = setInterval(() => {
      i++;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(typing);
        setTimeout(
          () => setPhrase((v) => (v + 1) % LIVE_CMDS.length),
          1800
        );
      }
    }, 42);
    return () => clearInterval(typing);
  }, [phrase]);

  return (
    <div className="animate-fade-in-up anim-delay-400 group relative mt-8 flex w-full max-w-md items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 shadow-lg shadow-indigo-500/10 backdrop-blur-xl transition hover:border-indigo-400/30">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent transition-transform duration-[1400ms] group-hover:translate-x-full"
      />
      <span className="relative flex h-6 shrink-0 items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.06] px-1.5 font-mono text-[10px] text-zinc-300">
        ⌘K
      </span>
      <span className="relative flex-1 truncate text-left text-sm text-zinc-300">
        {typed}
        <span
          aria-hidden
          className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-indigo-400"
        />
      </span>
      <span className="relative hidden shrink-0 items-center gap-1 text-[10px] uppercase tracking-widest text-zinc-500 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
        live
      </span>
    </div>
  );
}

function Hero({ scrollY }: { scrollY: number }) {
  const py = scrollY * 0.22;
  return (
    <section className="relative isolate mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-12 text-center">
      {/* Orbes de fondo (z -1 dentro del isolate del section) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[8%] top-[10%] -z-10 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl animate-float-slow animate-blob sm:h-80 sm:w-80"
        style={{ transform: `translateY(${py * -0.5}px)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[6%] top-[28%] -z-10 h-72 w-72 rounded-full bg-violet-600/18 blur-3xl animate-float-slower animate-blob sm:h-96 sm:w-96"
        style={{ transform: `translateY(${py * 0.3}px)` }}
      />

      {/* First-fold wrapper: ocupa exactamente el viewport */}
      <div className="relative flex min-h-[100dvh] w-full flex-col items-center pt-24 sm:pt-28">
        {/* Bloque de texto centrado verticalmente */}
        <div className="flex flex-1 flex-col items-center justify-center">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 backdrop-blur-xl">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Tu carrera universitaria, en un solo lugar
        </div>

        {/* Título */}
        <h1 className="animate-fade-in-up anim-delay-100 mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          El sistema operativo
          <br />
          <RotatingHeroWord />
          <br />
          que tu carrera merece.
        </h1>

        {/* Subtítulo */}
        <p className="animate-fade-in-up anim-delay-200 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Materias, notas, biblioteca, calendario, portafolio, finanzas.
          Todo conectado. Todo tuyo. Del primer semestre hasta el grado.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up anim-delay-300 mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-7 py-3.5 text-base font-semibold text-white shadow-2xl shadow-indigo-500/40 transition hover:scale-[1.02] hover:shadow-indigo-500/60"
          >
            <span className="relative z-10">Comenzar gratis</span>
            <svg
              viewBox="0 0 24 24"
              className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                d="M5 12h14M13 5l7 7-7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
            />
          </Link>
          <a
            href="#modulos"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-base font-medium text-zinc-300 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
          >
            Ver módulos
          </a>
        </div>

          {/* Live command bar — nueva pieza kinética */}
          <LiveCommandBar />
        </div>

        {/* Scroll hint al fondo del viewport, separado del bloque */}
        <div className="flex flex-col items-center gap-1.5 pb-6 pt-8 text-zinc-500 animate-bob">
          <span className="text-[11px] uppercase tracking-widest">
            Descubre más
          </span>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M12 5v14M5 12l7 7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Mockup flotante (debajo del fold) */}
      <Reveal
        variant="scale"
        delay={200}
        className="mt-20 w-full max-w-5xl sm:mt-24"
      >
        <div className="tilt-card group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-[0_30px_100px_-20px_rgba(99,102,241,0.4)] backdrop-blur-xl">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
          />
          <HeroMockup />
        </div>
      </Reveal>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]">
      {/* Sidebar mockup */}
      <div className="hidden border-r border-white/5 bg-zinc-950/80 p-5 sm:block">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-sm font-bold">Acadia</span>
        </div>
        <div className="space-y-1.5">
          {[
            "Dashboard",
            "Horario",
            "Calendario",
            "Biblioteca",
            "Estudio",
            "Portafolio",
            "Analítica",
          ].map((l, i) => (
            <div
              key={l}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                i === 0
                  ? "bg-indigo-500/15 text-white"
                  : "text-zinc-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  i === 0 ? "bg-indigo-400" : "bg-white/20"
                }`}
              />
              {l}
            </div>
          ))}
        </div>
      </div>
      {/* Main mockup */}
      <div className="p-6 sm:p-8">
        <div className="mb-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-300">
            Lunes, 13 de Julio
          </p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">
            Buenos días, Diego.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Materias", value: "6", color: "text-indigo-300" },
            { label: "Créditos", value: "18", color: "text-amber-300" },
            { label: "Racha", value: "12d", color: "text-orange-300" },
            { label: "Entregas", value: "3", color: "text-sky-300" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Clases de hoy
          </div>
          <div className="space-y-2">
            {[
              { c: "#6366f1", n: "Bases de Datos", t: "08:00–10:00" },
              { c: "#f59e0b", n: "Redes", t: "10:15–12:00" },
              { c: "#10b981", n: "Ingeniería de Software", t: "14:00–16:00" },
            ].map((b) => (
              <div
                key={b.n}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: b.c }}
                />
                <span className="truncate text-xs font-medium text-white">
                  {b.n}
                </span>
                <span className="ml-auto font-mono text-[10px] text-zinc-500">
                  {b.t}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function MarqueeBand() {
  const items = [
    "Materias",
    "Horario semanal",
    "Notas ponderadas",
    "Biblioteca en Drive",
    "Referencias APA · IEEE · MLA",
    "Calendario académico",
    "Racha de estudio",
    "Portafolio público",
    "Finanzas del semestre",
    "Analítica personal",
    "Command palette ⌘K",
    "Búsqueda full-text en PDFs",
  ];
  const doubled = [...items, ...items];
  return (
    <section className="relative border-y border-white/5 bg-white/[0.01] py-8 overflow-hidden">
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {doubled.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-3 text-sm font-medium text-zinc-500"
          >
            <span className="h-1 w-1 rounded-full bg-indigo-400" />
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function FeatureGrid() {
  const features = [
    {
      icon: (
        <path
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
          strokeLinejoin="round"
        />
      ),
      title: "Dashboard vivo",
      desc: "Racha, clase en curso, próximas entregas, progreso del semestre. Todo actualizado al segundo.",
    },
    {
      icon: <path d="M3 5h18M3 12h18M3 19h12" strokeLinecap="round" />,
      title: "Horario 3D",
      desc: "Vistas semanal, diaria y mensual. Línea roja del ahora, click y saltas a la materia.",
    },
    {
      icon: (
        <>
          <path d="M4 4h9l5 5v11H4z" />
          <path d="M13 4v5h5" />
        </>
      ),
      title: "Biblioteca inteligente",
      desc: "Sube un PDF, se sincroniza a tu Drive, se indexa el contenido. Busca dentro de cualquier documento.",
    },
    {
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v9l6 3" />
        </>
      ),
      title: "Calculadora de notas",
      desc: "Introduce tu meta, sabemos qué necesitas en cada evaluación pendiente para llegar exactamente.",
    },
    {
      icon: (
        <path
          d="M6 3v18M18 3v18M6 12h12M12 3v18"
          strokeLinecap="round"
        />
      ),
      title: "Portafolio público",
      desc: "Un slug personal como /p/tu-nombre. Tus proyectos, para el CV y reclutadores. Sin sitio web aparte.",
    },
    {
      icon: <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />,
      title: "Todo en español",
      desc: "Pensado para universidades latinoamericanas. Escala 0-5, formatos APA/IEEE, semestres A/B.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-32">
      <Reveal className="mb-20 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
          Todo en uno
        </p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Un ecosistema en vez de{" "}
          <span className="text-zinc-500 line-through">10 apps sueltas</span>
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 80}>
            <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-7 backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.04]">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300 ring-1 ring-inset ring-indigo-400/20 transition group-hover:from-indigo-500/40 group-hover:to-violet-600/40">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {f.icon}
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function NumbersBand() {
  const stats = [
    { to: 11, label: "Módulos integrados", suffix: "" },
    { to: 100, label: "Notas por semestre", suffix: "+" },
    { to: 5, label: "Formatos de citación", suffix: "" },
    { to: 0, label: "Suscripciones extras", suffix: "" },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/5 via-white/[0.02] to-violet-600/5 p-10 backdrop-blur-sm sm:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/12 blur-3xl animate-blob"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl animate-blob"
        />
        <div className="relative grid grid-cols-2 gap-y-10 gap-x-6 lg:grid-cols-4 lg:gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="text-center">
              <div className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
                <CountUp to={s.to} suffix={s.suffix} />
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
type ModuleDef = {
  tag: string;
  title: string;
  desc: string;
  bullets: string[];
  mock: ReactNode;
  reverse?: boolean;
};

function ModulesTour() {
  const modules: ModuleDef[] = [
    {
      tag: "01 · Académico",
      title: "Materias, evaluaciones, calculadora inteligente",
      desc: "Configura la estructura de evaluaciones de cada materia. La calculadora te dice — en tiempo real — exactamente qué necesitas para cerrar en 4.5, sacar 5.0, o simplemente aprobar. Con desglose por evaluación pendiente ponderado.",
      bullets: [
        "Notas ponderadas al 100%",
        "Metas personalizadas",
        "Distribución sugerida",
        "Simulador de escenarios",
      ],
      mock: <ModMockAcademic />,
    },
    {
      tag: "02 · Horario",
      title: "Vistas semanal, diaria y mensual",
      desc: "Sube el PDF oficial de la universidad. El sistema extrae materias, horarios, salones y profesores. Vistas triples con línea roja del momento actual. Nunca más pierdas una clase por no revisar el horario.",
      bullets: [
        "Parseo automático del PDF",
        "Sync con calendario",
        "Alerta clase en curso",
        "Bloques con colores",
      ],
      mock: <ModMockSchedule />,
      reverse: true,
    },
    {
      tag: "03 · Biblioteca",
      title: "Google Drive sin tocar Drive",
      desc: "Un solo archivo, en un solo lugar. La app sincroniza con tu Drive, indexa el contenido de cada PDF, y te permite buscar texto adentro de miles de páginas. Con full-text search sobre tsvector nativo.",
      bullets: [
        "Sync bidireccional",
        "Búsqueda dentro de PDFs",
        "Tags automáticos",
        "Organización por materia",
      ],
      mock: <ModMockLibrary />,
    },
    {
      tag: "04 · Portafolio",
      title: "Tu carrera, en una URL",
      desc: "Cada proyecto que haces se documenta. Al final tienes /p/tu-slug — un sitio público sin login, con tus mejores trabajos. Reemplaza tener que armar un portfolio a mano cuando lo necesitas.",
      bullets: [
        "Proyectos por semestre",
        "Repos, demos, docs",
        "Slug personalizado",
        "SEO listo",
      ],
      mock: <ModMockPortfolio />,
      reverse: true,
    },
  ];
  return (
    <section id="modulos" className="mx-auto w-full max-w-6xl px-6 py-32">
      <Reveal className="mb-24 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
          Recorrido
        </p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Diseñado como un{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            sistema operativo
          </span>
          , no una app
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          Cada módulo conecta con los demás. Notas alimentan analítica.
          Horario alimenta calendario. Biblioteca alimenta referencias.
        </p>
      </Reveal>
      <div className="space-y-32 md:space-y-40">
        {modules.map((m) => (
          <ModuleRow key={m.tag} module={m} />
        ))}
      </div>
    </section>
  );
}

function ModuleRow({ module: m }: { module: ModuleDef }) {
  const text = (
    <Reveal variant={m.reverse ? "right" : "left"}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
        {m.tag}
      </p>
      <h3 className="mb-6 text-3xl font-bold leading-tight sm:text-4xl">
        {m.title}
      </h3>
      <p className="mb-8 text-lg leading-relaxed text-zinc-400">{m.desc}</p>
      <ul className="space-y-3">
        {m.bullets.map((b) => (
          <li key={b} className="flex items-center gap-3 text-zinc-300">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 text-indigo-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="m5 12 5 5L20 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {b}
          </li>
        ))}
      </ul>
    </Reveal>
  );
  const mock = (
    <Reveal variant={m.reverse ? "left" : "right"} delay={120}>
      {m.mock}
    </Reveal>
  );
  return (
    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
      {m.reverse ? (
        <>
          <div className="lg:order-2">{text}</div>
          <div className="lg:order-1">{mock}</div>
        </>
      ) : (
        <>
          {text}
          {mock}
        </>
      )}
    </div>
  );
}

function ModMockAcademic() {
  return (
    <div className="tilt-card overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-indigo-500/10 backdrop-blur-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-4xl font-bold tabular-nums">3.8</span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          Aprobada
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
      </div>
      <p className="mb-3 text-xs font-medium text-zinc-400">
        Necesitas en el 25% restante para cerrar en:
      </p>
      <ul className="space-y-2.5 text-sm">
        {[
          { g: "3.0", need: "Asegurada", ok: true },
          { g: "4.0", need: "4.2", ok: false },
          { g: "4.5", need: "4.9", ok: false },
        ].map((t) => (
          <li key={t.g} className="flex items-center justify-between">
            <span className="text-zinc-400">Para {t.g}</span>
            <span
              className={`font-semibold ${t.ok ? "text-emerald-400" : "text-white"}`}
            >
              {t.need}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModMockSchedule() {
  const blocks = [
    { d: 0, s: 20, h: 100, c: "#6366f1", n: "BD" },
    { d: 0, s: 140, h: 80, c: "#f59e0b", n: "Redes" },
    { d: 1, s: 60, h: 120, c: "#10b981", n: "IS" },
    { d: 2, s: 30, h: 70, c: "#ec4899", n: "Cálc" },
    { d: 2, s: 160, h: 90, c: "#8b5cf6", n: "Ética" },
    { d: 3, s: 90, h: 90, c: "#6366f1", n: "BD" },
    { d: 4, s: 20, h: 60, c: "#10b981", n: "IS" },
  ];
  return (
    <div className="tilt-card overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-violet-500/10 backdrop-blur-sm">
      <div className="mb-3 grid grid-cols-5 gap-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
        {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div
        className="relative grid grid-cols-5 gap-1.5 overflow-hidden rounded-lg border border-white/5"
        style={{ height: 260 }}
      >
        {[0, 1, 2, 3, 4].map((d) => (
          <div
            key={d}
            className="relative border-l border-white/5 first:border-transparent"
          >
            {blocks
              .filter((b) => b.d === d)
              .map((b, i) => (
                <div
                  key={i}
                  className="absolute inset-x-1 overflow-hidden rounded-md border p-1"
                  style={{
                    top: b.s,
                    height: b.h,
                    background: `${b.c}22`,
                    borderColor: `${b.c}55`,
                  }}
                >
                  <span
                    className="absolute inset-y-0 left-0 w-0.5"
                    style={{ background: b.c }}
                  />
                  <p className="truncate pl-1.5 text-[9px] font-semibold text-white">
                    {b.n}
                  </p>
                </div>
              ))}
          </div>
        ))}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 flex items-center gap-1"
          style={{ top: 150 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
          <span className="h-px flex-1 bg-red-400/50" />
        </div>
      </div>
    </div>
  );
}

function ModMockLibrary() {
  const docs = [
    { n: "Parcial 1 · Bases de Datos.pdf", tag: "Parcial" },
    { n: "Modelo Relacional cap 3.pdf", tag: "Apuntes" },
    { n: "Taller 4 · Normalización.docx", tag: "Taller" },
    { n: "Referencias BD.bib", tag: "Ref" },
  ];
  return (
    <div className="tilt-card overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-sky-500/10 backdrop-blur-sm">
      <div className="border-b border-white/5 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-zinc-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span className="text-zinc-400">buscar normalización</span>
          <span className="ml-auto rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
            ⌘K
          </span>
        </div>
      </div>
      <ul className="divide-y divide-white/5">
        {docs.map((d) => (
          <li key={d.n} className="flex items-center gap-3 px-5 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[10px] font-bold text-red-300">
              PDF
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-white">
              {d.n}
            </span>
            <span className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300">
              {d.tag}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModMockPortfolio() {
  return (
    <div className="tilt-card overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-emerald-500/10 backdrop-blur-sm">
      <div className="border-b border-white/5 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-4 rounded-md bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-zinc-500">
            acadia.app/p/diego
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold">
            D
          </span>
          <div>
            <p className="font-semibold">Diego Acosta</p>
            <p className="text-xs text-zinc-500">
              Ingeniería de Sistemas · UFPSO
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { n: "Acadia", t: ["Next.js", "Supabase"] },
            { n: "API Notas", t: ["Node", "Postgres"] },
            { n: "Chat Realtime", t: ["Socket.io"] },
            { n: "Cluster Redes", t: ["Docker"] },
          ].map((p) => (
            <div
              key={p.n}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
            >
              <p className="text-xs font-semibold text-white">{p.n}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.t.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Sube tu horario",
      d: "PDF oficial de la universidad. En segundos, semestre, materias, salones y profesores quedan configurados.",
    },
    {
      n: "02",
      t: "Vive tu semestre",
      d: "Estudia con pomodoros, sube docs, registra notas, cita referencias, marca entregas. Todo desde un solo lugar.",
    },
    {
      n: "03",
      t: "Crece con datos",
      d: "Al cerrar, tu semestre queda archivado con métricas. Compara, mejora, decide con datos reales.",
    },
  ];
  return (
    <section id="como" className="mx-auto w-full max-w-6xl px-6 py-32">
      <Reveal className="mb-20 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
          Cómo funciona
        </p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Tres pasos. Diez semestres.
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-10">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 120}>
            <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition hover:border-white/25">
              <div className="mb-5 bg-gradient-to-br from-indigo-400 to-violet-500 bg-clip-text text-6xl font-black leading-none tracking-tight text-transparent">
                {s.n}
              </div>
              <h3 className="mb-4 text-xl font-semibold">{s.t}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Manifesto() {
  return (
    <section
      id="manifesto"
      className="relative mx-auto w-full max-w-4xl px-6 py-40 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl animate-glow-pulse"
      />
      <Reveal>
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">
          Filosofía
        </p>
        <blockquote className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl">
          <span className="text-zinc-500">&ldquo;</span>Tu única tarea debería ser{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            estudiar
          </span>
          . Todo lo demás — organizar, buscar, sincronizar, calcular — es
          trabajo del sistema.<span className="text-zinc-500">&rdquo;</span>
        </blockquote>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-32 pt-8">
      <Reveal variant="scale">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-white/[0.03] to-violet-600/20 p-14 text-center backdrop-blur-sm sm:p-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl animate-blob"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl animate-blob"
          />
          <div className="relative">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Tu próximo semestre
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                empieza aquí.
              </span>
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-lg text-zinc-400">
              Gratis. Sin límites. Sin compromisos. Solo abre y organiza todo lo
              que ya tenías disperso.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-indigo-500/40 transition hover:scale-[1.02] hover:shadow-indigo-500/60"
              >
                <span className="relative z-10">Crear cuenta</span>
                <svg
                  viewBox="0 0 24 24"
                  className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path
                    d="M5 12h14M13 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
                />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Footer() {
  const year = new Date().getFullYear();
  const columns: {
    title: string;
    links: { label: string; href: string; external?: boolean }[];
  }[] = [
    {
      title: "Producto",
      links: [
        { label: "Módulos", href: "#modulos" },
        { label: "Cómo funciona", href: "#como" },
        { label: "Manifiesto", href: "#manifesto" },
        { label: "Entrar", href: "/login" },
      ],
    },
    {
      title: "Recursos",
      links: [
        { label: "Portafolio ejemplo", href: "/p/demo" },
        { label: "Atajos ⌘K", href: "#como" },
        { label: "Guía rápida", href: "#modulos" },
      ],
    },
    {
      title: "Sistema",
      links: [
        { label: "Estado · operativo", href: "#" },
        { label: "Privacidad", href: "#" },
        { label: "Términos", href: "#" },
      ],
    },
  ];

  return (
    <footer className="relative mt-16 border-t border-white/5 bg-zinc-950/70 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 60% at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(ellipse 50% 60% at 90% 0%, rgba(139,92,246,0.14), transparent 55%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="text-base font-semibold tracking-tight">
              Acadia
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Sistema operativo académico. Materias, apuntes, referencias y
            portafolio en un solo lugar — pensado para estudiantes.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Operativo
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono text-zinc-400">
              v1.0
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-400">
              UFPSO
            </span>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {col.title}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => {
                const isHash = l.href.startsWith("#");
                const isRoute = l.href.startsWith("/");
                const cls =
                  "group inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-white";
                const inner = (
                  <>
                    <span className="h-px w-0 bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-300 group-hover:w-3" />
                    {l.label}
                  </>
                );
                if (isRoute && !isHash) {
                  return (
                    <li key={l.label}>
                      <Link href={l.href} className={cls}>
                        {inner}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={l.label}>
                    <a href={l.href} className={cls}>
                      {inner}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative border-t border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-zinc-500 sm:flex-row">
          <p>
            © {year} Acadia · Hecho por{" "}
            <span className="text-zinc-300">Juan David Acosta</span>
          </p>
          <p className="flex items-center gap-2">
            <span>Ocaña, Colombia</span>
            <span aria-hidden className="text-zinc-700">
              ·
            </span>
            <span className="font-mono text-zinc-600">
              {process.env.NEXT_PUBLIC_APP_ENV ?? "prod"}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
