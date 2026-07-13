"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Standard = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Standard);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function enablePush(): Promise<"ok" | "unsupported" | "denied" | "no-key" | "error"> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  const keyRes = await fetch("/api/push/public-key").then((r) => r.json());
  const publicKey: string | null = keyRes.publicKey;
  if (!publicKey) return "no-key";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const reg =
      (await navigator.serviceWorker.getRegistration()) ??
      (await navigator.serviceWorker.register("/sw.js"));
    const existing = await reg.pushManager.getSubscription();
    const keyBytes = urlBase64ToUint8Array(publicKey);
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer as ArrayBuffer,
      }));
    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error";
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {}
  try {
    await sub.unsubscribe();
  } catch {}
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function NotificationsBell({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<"unknown" | "off" | "on" | "unsupported">(
    "unknown"
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  const unread = notifications.filter((n) => !n.read_at).length;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setNotifications(json.notifications ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPushStatus("unsupported");
        return;
      }
      const sub = await currentSubscription();
      setPushStatus(sub ? "on" : "off");
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function markAll() {
    setLoading(true);
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function markOne(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {}
  }

  async function togglePush() {
    if (pushStatus === "on") {
      await disablePush();
      setPushStatus("off");
    } else {
      const result = await enablePush();
      if (result === "ok") setPushStatus("on");
      else if (result === "unsupported") setPushStatus("unsupported");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? "Notificaciones" : undefined}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        className={`group relative flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-sm font-medium text-zinc-400 transition hover:border-white/25 hover:text-white ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px] shrink-0">
          <path
            d="M6 8a6 6 0 0 1 12 0c0 4 1.5 6 2 7H4c.5-1 2-3 2-7Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {!collapsed && <span className="flex-1 text-left">Alertas</span>}
        {unread > 0 && (
          <span
            className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ${
              collapsed ? "absolute right-1 top-1" : ""
            }`}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 z-50 ml-2 w-80 rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notificaciones</p>
            <button
              onClick={markAll}
              disabled={loading || unread === 0}
              className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300 disabled:opacity-40"
            >
              Marcar todas
            </button>
          </div>

          {pushStatus !== "unsupported" && (
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-xs">
              <span className="text-zinc-400">
                Push del navegador:{" "}
                <span className={pushStatus === "on" ? "text-emerald-400" : "text-zinc-500"}>
                  {pushStatus === "on"
                    ? "activo"
                    : pushStatus === "off"
                      ? "desactivado"
                      : "..."}
                </span>
              </span>
              <button
                onClick={togglePush}
                className="rounded-md bg-white/5 px-2 py-1 font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                {pushStatus === "on" ? "Apagar" : "Activar"}
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                Sin alertas por ahora.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {notifications.map((n) => {
                  const inner = (
                    <div
                      className={`flex items-start gap-3 px-4 py-3 transition hover:bg-white/[0.03] ${
                        n.read_at ? "opacity-60" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.read_at ? "bg-transparent" : "bg-indigo-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-zinc-400">{n.body}</p>
                        )}
                        <p className="mt-1 text-[11px] text-zinc-600">
                          {formatRelative(n.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.url ? (
                        <Link
                          href={n.url}
                          onClick={() => {
                            markOne(n.id);
                            setOpen(false);
                          }}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          onClick={() => markOne(n.id)}
                          className="block w-full text-left"
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
