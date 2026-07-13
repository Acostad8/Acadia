"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseCommand, type ResolvedCommand } from "@/lib/palette-commands";

type Item = {
  id: string;
  section: string;
  title: string;
  subtitle?: string;
  href: string;
  keywords?: string;
  onSelect?: () => void;
};

const ROUTE_ITEMS: Item[] = [
  { id: "r-dashboard", section: "Ir a", title: "Dashboard", href: "/dashboard" },
  { id: "r-biblioteca", section: "Ir a", title: "Biblioteca", href: "/biblioteca" },
  { id: "r-calendario", section: "Ir a", title: "Calendario", href: "/calendario" },
  { id: "r-estudio", section: "Ir a", title: "Estudio · Pomodoro", href: "/estudio" },
  { id: "r-referencias", section: "Ir a", title: "Referencias", href: "/referencias" },
  { id: "r-enlaces", section: "Ir a", title: "Enlaces", href: "/enlaces" },
  { id: "r-portafolio", section: "Ir a", title: "Portafolio", href: "/portafolio" },
  { id: "r-analitica", section: "Ir a", title: "Analítica", href: "/analitica" },
  { id: "r-asistente", section: "Ir a", title: "Asistente IA", href: "/asistente" },
  { id: "r-finanzas", section: "Ir a", title: "Finanzas", href: "/finanzas" },
  { id: "r-semestres", section: "Ir a", title: "Semestres", href: "/semestres" },
  {
    id: "r-portafolio-publico",
    section: "Ir a",
    title: "Perfil público",
    href: "/portafolio/publico",
  },
];

function resolvedToItem(
  cmd: ResolvedCommand,
  idx: number,
  router: ReturnType<typeof useRouter>,
  close: () => void
): Item {
  return {
    id: `cmd-${cmd.kind}-${idx}`,
    section: "Comandos",
    title: cmd.label,
    subtitle: cmd.hint,
    href: "#cmd",
    onSelect: () => {
      const res = cmd.execute();
      close();
      if ("customEvent" in res) {
        window.dispatchEvent(
          new CustomEvent(res.customEvent, { detail: res.detail })
        );
        if ("href" in res && res.href) router.push(res.href);
      } else if (res.href) {
        router.push(res.href);
      }
    },
  };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function score(item: Item, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const hay = normalize(
    `${item.title} ${item.subtitle ?? ""} ${item.section} ${item.keywords ?? ""}`
  );
  let s = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return 0;
    if (normalize(item.title).startsWith(t)) s += 3;
    else if (normalize(item.title).includes(t)) s += 2;
    else s += 1;
  }
  return s;
}

export function CommandPalette() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<Item[]>([]);
  const [subjectCtx, setSubjectCtx] = useState<
    { id: string; name: string; color: string | null }[]
  >([]);
  const [pdfMatches, setPdfMatches] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const loadDynamic = useCallback(async () => {
    if (loaded) return;
    const items: Item[] = [];
    const [subjectsRes, docsRes, eventsRes, refsRes, bookmarksRes] =
      await Promise.all([
        supabase.from("subjects").select("id, name, code, group_name").limit(80),
        supabase
          .from("documents")
          .select("id, name, doc_type, drive_web_link, subject_id")
          .order("uploaded_at", { ascending: false })
          .limit(120),
        supabase
          .from("events")
          .select("id, title, type, due_at, completed")
          .eq("completed", false)
          .order("due_at")
          .limit(40),
        supabase
          .from("bib_references")
          .select("id, title, authors")
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("bookmarks")
          .select("id, title, url, kind")
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

    const ctx: { id: string; name: string; color: string | null }[] = [];
    for (const s of subjectsRes.data ?? []) {
      const name = s.name as string;
      ctx.push({ id: s.id as string, name, color: null });
      items.push({
        id: `s-${s.id}`,
        section: "Materias",
        title: name,
        subtitle: [s.code, s.group_name].filter(Boolean).join(" · "),
        href: `/materias/${s.id}`,
      });
    }
    setSubjectCtx(ctx);
    for (const d of docsRes.data ?? []) {
      items.push({
        id: `d-${d.id}`,
        section: "Documentos",
        title: d.name as string,
        subtitle: d.doc_type as string,
        href: d.drive_web_link
          ? (d.drive_web_link as string)
          : "/biblioteca",
      });
    }
    for (const e of eventsRes.data ?? []) {
      const due = new Date(e.due_at as string);
      items.push({
        id: `e-${e.id}`,
        section: "Entregas",
        title: e.title as string,
        subtitle: `${e.type} · ${due.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`,
        href: "/calendario",
      });
    }
    for (const r of refsRes.data ?? []) {
      items.push({
        id: `ref-${r.id}`,
        section: "Referencias",
        title: r.title as string,
        subtitle: (r.authors as string) ?? undefined,
        href: "/referencias",
      });
    }
    for (const b of bookmarksRes.data ?? []) {
      items.push({
        id: `b-${b.id}`,
        section: "Enlaces",
        title: b.title as string,
        subtitle: b.kind as string,
        href: b.url as string,
      });
    }
    setDynamicItems(items);
    setLoaded(true);
  }, [loaded, supabase]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editing =
        target?.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT";
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !editing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("acadia:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("acadia:open-palette", onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setPdfMatches([]);
      void loadDynamic();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, loadDynamic]);

  const isCommandMode = query.trimStart().startsWith(">");

  const commandItems: Item[] = useMemo(() => {
    if (!isCommandMode) return [];
    const cmds = parseCommand(query, { subjects: subjectCtx });
    return cmds.map((cmd, idx) => resolvedToItem(cmd, idx, router, () => setOpen(false)));
  }, [isCommandMode, query, subjectCtx, router]);

  useEffect(() => {
    if (isCommandMode) {
      setPdfMatches([]);
      return;
    }
    const term = query.trim();
    if (term.length < 3) {
      setPdfMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_documents", {
        q: term,
        match_limit: 10,
      });
      if (cancelled || error || !data) return;
      const items: Item[] = (data as unknown[]).map((row) => {
        const record = row as {
          id: string;
          name: string;
          snippet: string | null;
          drive_web_link: string | null;
          subject_id: string | null;
        };
        return {
          id: `pdf-${record.id}`,
          section: "En contenido de PDFs",
          title: record.name,
          subtitle: record.snippet
            ? record.snippet.replace(/<<|>>/g, "**")
            : undefined,
          href: record.drive_web_link ?? "/biblioteca",
        };
      });
      setPdfMatches(items);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, isCommandMode, supabase]);

  const results = useMemo(() => {
    if (isCommandMode) return commandItems;
    const tokens = normalize(query.trim())
      .split(/\s+/)
      .filter(Boolean);
    const all = [...ROUTE_ITEMS, ...dynamicItems];
    const scored = all
      .map((item) => ({ item, s: score(item, tokens) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40);
    return [...scored.map((x) => x.item), ...pdfMatches];
  }, [isCommandMode, commandItems, query, dynamicItems, pdfMatches]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selected}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function go(item: Item) {
    setOpen(false);
    if (item.onSelect) {
      item.onSelect();
      return;
    }
    if (/^https?:\/\//.test(item.href)) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(item.href);
    }
  }

  if (!open) return null;

  const grouped = new Map<string, Item[]>();
  for (const r of results) {
    const arr = grouped.get(r.section) ?? [];
    arr.push(r);
    grouped.set(r.section, arr);
  }

  let flat = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-zinc-500">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o teclear > para comandos (ej: > evento Parcial mañana 8pm)"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[selected]) go(results[selected]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
            ESC
          </kbd>
        </div>
        <ul
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-1"
        >
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">
              {loaded ? "Sin resultados." : "Cargando..."}
            </li>
          ) : (
            Array.from(grouped.entries()).map(([section, items]) => (
              <li key={section}>
                <p className="mt-2 px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {section}
                </p>
                <ul>
                  {items.map((item) => {
                    const idx = flat++;
                    const active = idx === selected;
                    return (
                      <li key={item.id}>
                        <button
                          data-idx={idx}
                          onClick={() => go(item)}
                          onMouseEnter={() => setSelected(idx)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                            active
                              ? "bg-indigo-500/15 text-white"
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.title}</p>
                            {item.subtitle && (
                              <p className="truncate text-[11px] text-zinc-500">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          {/^https?:\/\//.test(item.href) && (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-3.5 w-3.5 shrink-0 text-zinc-500"
                            >
                              <path
                                d="M14 5h5v5m0-5-9 9M5 5h4M5 19h14v-4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center gap-4 border-t border-white/5 bg-white/[0.02] px-4 py-2 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">↑↓</kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">↵</kbd>
            abrir
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">Ctrl</kbd>
            <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">K</kbd>
            abrir/cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
