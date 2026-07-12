"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/calendario", label: "Calendario" },
  { href: "/semestres", label: "Semestres" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
        <Link
          href="/dashboard"
          className="mr-4 flex items-center gap-2 text-sm font-bold text-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
            A
          </span>
          Acadia
        </Link>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.href === "/dashboard" && pathname.startsWith("/materias"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={signOut}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
