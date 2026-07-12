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
