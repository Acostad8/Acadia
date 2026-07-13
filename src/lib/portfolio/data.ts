import type { Project, ProjectStatus, PublicProfile, Semester, Subject } from "@/lib/types";

export type PortfolioTemplate = "minimal" | "academic" | "showcase";

export const PORTFOLIO_TEMPLATES: {
  id: PortfolioTemplate;
  label: string;
  hint: string;
}[] = [
  { id: "minimal", label: "Minimal", hint: "Una columna, tipografía sobria." },
  { id: "academic", label: "Academic", hint: "Cabecera con datos, listado por semestre." },
  { id: "showcase", label: "Showcase", hint: "Tarjetas coloreadas por materia, foco visual." },
];

export type PortfolioDataset = {
  profile: PublicProfile | null;
  displayName: string;
  headline: string | null;
  bio: string | null;
  website: string | null;
  email: string | null;
  publicUrl: string | null;
  projects: Project[];
  subjectsById: Record<string, Subject>;
  semestersById: Record<string, Semester>;
  semesterOrder: string[];
};

const STATUS_RANK: Record<ProjectStatus, number> = {
  terminado: 0,
  en_desarrollo: 1,
  idea: 2,
};

export function groupProjectsBySemester(
  projects: Project[],
  semestersById: Record<string, Semester>
): { semester: Semester | null; projects: Project[] }[] {
  const buckets = new Map<string, Project[]>();
  for (const project of projects) {
    const key = project.semester_id ?? "__none__";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(project);
    else buckets.set(key, [project]);
  }
  const groups = Array.from(buckets.entries()).map(([key, list]) => ({
    semester: key === "__none__" ? null : semestersById[key] ?? null,
    projects: list,
  }));
  groups.sort((a, b) => {
    if (!a.semester && b.semester) return 1;
    if (a.semester && !b.semester) return -1;
    if (a.semester && b.semester) {
      const ta = a.semester.start_date ?? a.semester.created_at;
      const tb = b.semester.start_date ?? b.semester.created_at;
      return tb.localeCompare(ta);
    }
    return 0;
  });
  return groups;
}

export function pickTopThreePerSemester(
  groups: { semester: Semester | null; projects: Project[] }[]
) {
  return groups.map((g) => ({
    semester: g.semester,
    projects: [...g.projects]
      .sort((a, b) => {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (rank !== 0) return rank;
        return b.created_at.localeCompare(a.created_at);
      })
      .slice(0, 3),
  }));
}

export function formatSemesterLabel(semester: Semester | null): string {
  if (!semester) return "Otros proyectos";
  if (semester.label) return semester.label;
  return semester.name;
}
