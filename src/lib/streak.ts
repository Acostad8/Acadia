type WithStartedAt = { started_at: string };

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Racha (streak) diaria = días consecutivos con al menos una sesión hasta hoy.
 * Si hoy aún no tiene sesión pero ayer sí, la racha se conserva pero no crece
 * hasta que el usuario estudie hoy.
 */
export function computeStreak(sessions: WithStartedAt[]): {
  current: number;
  longest: number;
  hasToday: boolean;
} {
  const days = new Set(
    sessions.map((s) => dayKey(new Date(s.started_at)))
  );
  const today = new Date();
  const hasToday = days.has(dayKey(today));

  let current = 0;
  const cursor = new Date(today);
  if (!hasToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedDays = [...days].sort();
  let longest = 0;
  let run = 0;
  let prevKey: string | null = null;
  for (const key of sortedDays) {
    if (prevKey) {
      const [ya, ma, da] = prevKey.split("-").map(Number);
      const prev = new Date(ya, ma - 1, da);
      prev.setDate(prev.getDate() + 1);
      const nextKey = dayKey(prev);
      if (nextKey === key) run++;
      else run = 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prevKey = key;
  }

  return { current, longest, hasToday };
}
