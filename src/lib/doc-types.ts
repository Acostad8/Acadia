export const SUBJECT_SUBFOLDERS = [
  "Apuntes",
  "Talleres",
  "Laboratorios",
  "Parciales",
  "Proyectos",
  "Investigaciones",
  "Referencias",
] as const;

export type SubjectSubfolder = (typeof SUBJECT_SUBFOLDERS)[number];
