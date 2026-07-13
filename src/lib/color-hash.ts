export const SUBJECT_PALETTE = [
  "#6366f1",
  "#22c55e",
  "#f43f5e",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#fb7185",
  "#8b5cf6",
] as const;

function fnv1a(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function colorForSubject(codeOrName: string): string {
  const key = codeOrName.trim().toLowerCase();
  if (!key) return SUBJECT_PALETTE[0];
  return SUBJECT_PALETTE[fnv1a(key) % SUBJECT_PALETTE.length];
}
