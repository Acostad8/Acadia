"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/logo";
import { CommandPalette } from "@/components/command-palette";

type LinkDef = {
  href: string;
  label: string;
  icon: ReactNode;
  matchPrefix?: string;
};

function I({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const LINKS: LinkDef[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    matchPrefix: "/materias",
    icon: (
      <I>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </I>
    ),
  },
  {
    href: "/biblioteca",
    label: "Biblioteca",
    icon: (
      <I>
        <path d="M4 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" />
      </I>
    ),
  },
  {
    href: "/calendario",
    label: "Calendario",
    icon: (
      <I>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4m8-4v4" />
      </I>
    ),
  },
  {
    href: "/estudio",
    label: "Estudio",
    icon: (
      <I>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 3h6" />
      </I>
    ),
  },
  {
    href: "/referencias",
    label: "Referencias",
    icon: (
      <I>
        <path d="M6 3h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v6h6" />
        <path d="M8 14h8M8 17h5" />
      </I>
    ),
  },
  {
    href: "/enlaces",
    label: "Enlaces",
    icon: (
      <I>
        <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </I>
    ),
  },
  {
    href: "/portafolio",
    label: "Portafolio",
    icon: (
      <I>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      </I>
    ),
  },
  {
    href: "/analitica",
    label: "Analítica",
    icon: (
      <I>
        <path d="M4 20V10m6 10V4m6 16v-8m6 8V8" />
      </I>
    ),
  },
  {
    href: "/asistente",
    label: "Asistente",
    icon: (
      <I>
        <path d="M12 3a4 4 0 0 0-4 4c0 .5.1 1 .3 1.5A4.5 4.5 0 0 0 5 12.5 4.5 4.5 0 0 0 9.5 17H17a4 4 0 0 0 1-7.9A5 5 0 0 0 12 3Z" />
      </I>
    ),
  },
  {
    href: "/finanzas",
    label: "Finanzas",
    icon: (
      <I>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M15 9.5c-.5-1-1.7-1.5-3-1.5s-3 .7-3 2 2 1.7 3 2 3 1 3 2-1.5 2-3 2-2.5-.5-3-1.5" />
      </I>
    ),
  },
  {
    href: "/semestres",
    label: "Semestres",
    icon: (
      <I>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 4v2m8-2v2" />
      </I>
    ),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("acadia:sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("acadia:sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed, mounted]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sidebarWidth = collapsed ? "md:w-16" : "md:w-56";
  const mainOffset = collapsed ? "md:pl-16" : "md:pl-56";

  return (
    <div className="min-h-screen">
      {/* Header móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-zinc-950/80 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-sm font-bold text-transparent">
            Acadia
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="rounded-lg border border-white/10 p-1.5 text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-white/5 bg-zinc-950/95 backdrop-blur-xl transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarWidth}`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-3">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-white/5"
            title="Acadia"
          >
            <LogoMark size={26} />
            {!collapsed && (
              <span className="truncate bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-sm font-bold text-transparent">
                Acadia
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            className="hidden shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white md:inline-flex"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            >
              <path
                d="m15 18-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-2 pt-3">
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("acadia:open-palette"))
            }
            title="Buscar en todo (Ctrl+K)"
            className={`group flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-sm font-medium text-zinc-400 transition hover:border-white/25 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-[18px] w-[18px] shrink-0"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="m20 20-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Buscar</span>
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px] text-zinc-500">
                  Ctrl K
                </kbd>
              </>
            )}
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.matchPrefix && pathname.startsWith(link.matchPrefix)) ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-500/15 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`shrink-0 transition ${
                    active ? "text-indigo-300" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                >
                  {link.icon}
                </span>
                {!collapsed && <span className="truncate">{link.label}</span>}
                {!collapsed && active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-2">
          <button
            onClick={signOut}
            title={collapsed ? "Salir" : undefined}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-red-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-[18px] w-[18px] shrink-0"
            >
              <path
                d="M15 12H4m0 0 4-4m-4 4 4 4M11 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      <div className={`transition-[padding] ${mainOffset}`}>{children}</div>
      <CommandPalette />
    </div>
  );
}
