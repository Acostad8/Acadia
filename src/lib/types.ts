export type Semester = {
  id: string;
  user_id: string;
  name: string;
  label: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  archived: boolean;
  drive_folder_id: string | null;
  created_at: string;
};

export type Subject = {
  id: string;
  semester_id: string;
  user_id: string;
  code: string | null;
  name: string;
  group_name: string | null;
  credits: number | null;
  professor: string | null;
  room_default: string | null;
  color: string | null;
  notes: string | null;
  drive_folder_id: string | null;
  created_at: string;
};

export type ScheduleBlock = {
  id: string;
  subject_id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_code: string | null;
  room_description: string | null;
};

export type Document = {
  id: string;
  user_id: string;
  subject_id: string | null;
  semester_id: string | null;
  name: string;
  doc_type: string | null;
  drive_file_id: string | null;
  drive_folder_id: string | null;
  drive_web_link: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  tags: string[];
  uploaded_at: string;
};

export type Evaluation = {
  id: string;
  subject_id: string;
  user_id: string;
  name: string;
  weight_percent: number;
  grade: number | null;
  created_at: string;
};

export const EVENT_TYPES = [
  "tarea",
  "parcial",
  "quiz",
  "taller",
  "laboratorio",
  "exposicion",
  "otro",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type CalendarEvent = {
  id: string;
  user_id: string;
  subject_id: string | null;
  semester_id: string;
  title: string;
  type: EventType;
  due_at: string;
  completed: boolean;
  notes: string | null;
  created_at: string;
};

export const INCOME_CATEGORIES = [
  "beca",
  "trabajo",
  "auxilio",
  "padres",
  "otro",
] as const;

export const EXPENSE_CATEGORIES = [
  "matricula",
  "transporte",
  "alimentacion",
  "libros",
  "fotocopias",
  "papeleria",
  "materiales",
  "software",
  "internet",
  "impresiones",
  "otro",
] as const;

export type Transaction = {
  id: string;
  user_id: string;
  semester_id: string | null;
  type: "ingreso" | "gasto";
  category: string;
  amount: number;
  description: string | null;
  occurred_at: string;
  created_at: string;
};

export const REFERENCE_KINDS = ["articulo", "libro", "web", "otro"] as const;

export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

export type BibReference = {
  id: string;
  user_id: string;
  subject_id: string | null;
  group_id: string | null;
  kind: ReferenceKind;
  title: string;
  authors: string | null;
  year: number | null;
  source: string | null;
  url: string | null;
  doi: string | null;
  raw_citation: string | null;
  created_at: string;
};

export type ReferenceGroup = {
  id: string;
  user_id: string;
  name: string;
  subject_id: string | null;
  created_at: string;
};

export const PROJECT_STATUSES = [
  "idea",
  "en_desarrollo",
  "terminado",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Project = {
  id: string;
  user_id: string;
  subject_id: string | null;
  semester_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  technologies: string[];
  members: string | null;
  repo_url: string | null;
  demo_url: string | null;
  is_public: boolean;
  cover_url: string | null;
  highlights: string | null;
  created_at: string;
};

export type PublicProfile = {
  user_id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export const BOOKMARK_KINDS = [
  "articulo",
  "video",
  "blog",
  "paper",
  "normativa",
  "repositorio",
  "otro",
] as const;

export type BookmarkKind = (typeof BOOKMARK_KINDS)[number];

export type Bookmark = {
  id: string;
  user_id: string;
  subject_id: string | null;
  url: string;
  title: string;
  description: string | null;
  kind: BookmarkKind;
  tags: string[];
  favicon_url: string | null;
  created_at: string;
};

export type StudySession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  started_at: string;
  duration_minutes: number;
  kind: "pomodoro" | "manual";
  notes: string | null;
  created_at: string;
};

export type ParsedSchedule = {
  semester: { name: string; label: string };
  subjects: ParsedSubject[];
};

export type ParsedSubject = {
  code: string;
  name: string;
  group_name: string | null;
  professor: string | null;
  blocks: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    room_code: string | null;
    room_description: string | null;
  }[];
};
