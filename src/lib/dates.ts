export function relativeDue(dueAt: string): {
  label: string;
  urgent: boolean;
} {
  const now = new Date();
  const due = new Date(dueAt);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round(
    (startDue.getTime() - startToday.getTime()) / 86400000
  );
  if (days < 0)
    return {
      label: `Venció hace ${-days} día${days === -1 ? "" : "s"}`,
      urgent: true,
    };
  if (days === 0) return { label: "Hoy", urgent: true };
  if (days === 1) return { label: "Mañana", urgent: true };
  if (days <= 7) return { label: `En ${days} días`, urgent: false };
  return {
    label: due.toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
    urgent: false,
  };
}
