"use client";

import { useEffect, useState } from "react";

function diffLabel(nowMs: number, targetMs: number, prefix: string): string {
  const diff = targetMs - nowMs;
  if (diff <= 0) return "";
  const totalMin = Math.round(diff / 60000);
  if (totalMin < 60) return `${prefix} ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${prefix} ${h} h` : `${prefix} ${h} h ${m} min`;
}

function buildTargetMs(hhmm: string, base: Date): number {
  const [h, m] = hhmm.split(":").map(Number);
  const t = new Date(base);
  t.setHours(h, m, 0, 0);
  return t.getTime();
}

export function NextClassCountdown({
  startTime,
  endTime,
  ongoing,
}: {
  startTime: string;
  endTime: string;
  ongoing: boolean;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const nowMs = now.getTime();
  const start = buildTargetMs(startTime.slice(0, 5), now);
  const end = buildTargetMs(endTime.slice(0, 5), now);
  const label = ongoing
    ? diffLabel(nowMs, end, "termina en")
    : diffLabel(nowMs, start, "empieza en");

  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        ongoing
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-indigo-500/15 text-indigo-300"
      }`}
      suppressHydrationWarning
      data-tick={tick}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ongoing ? "animate-pulse bg-emerald-400" : "bg-indigo-400"}`}
      />
      {label}
    </span>
  );
}
