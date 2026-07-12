# Plan de trabajo nocturno — Acadia

## Contexto

Acadia: "Sistema Operativo Académico" para estudiantes universitarios. Visión completa en `docs/contexto.md`. PDF de horario de ejemplo en `docs/horario.pdf`.

Stack: Next.js 16 (App Router, Turbopack, `src/proxy.ts` en vez de middleware) + Supabase (proyecto `kgcoevibdsfxdewjuxvv`) + Google Drive API + pdfjs-dist. UI: tema oscuro zinc-950, gradientes índigo→violeta, tarjetas translúcidas `bg-white/[0.03]` con `border-white/10` — mantener este sistema visual en todo lo nuevo. Toda la UI en español.

## Ya construido (NO rehacer)

- Login Google vía Supabase Auth con scope `drive.file` (tokens en user_metadata)
- Parser determinístico del horario UFPSO (`src/lib/schedule-parser/parser.ts`)
- Onboarding: PDF → confirmación editable → crea semester/subjects/schedule_blocks
- Dashboard: stats + horario semanal + tarjetas de materias
- Drive: estructura Universidad/semestre/materia/subcarpetas (`/api/drive/setup-semester`)
- Biblioteca: upload con clasificación por nombre y contenido, filtros, links a Drive

## Tareas de esta noche (en orden)

### 1. Módulo de notas y calculadora (prioridad máxima)
- Tablas nuevas: `evaluations` (id, subject_id, user_id, name, weight_percent, grade nullable, created_at) con RLS igual que las demás (usar `apply_migration` de Supabase MCP, nombres snake_case).
- Página `/materias/[id]`: detalle de materia con lista de evaluaciones (agregar/editar/eliminar nombre, porcentaje, nota).
- Calculadora automática (escala colombiana 0.0–5.0, aprobar = 3.0):
  - Nota acumulada, porcentaje evaluado, nota mínima necesaria en lo restante para 3.0 / 4.0 / 4.5 / 5.0, nota máxima alcanzable, estado (aprobada / en riesgo / perdida matemáticamente).
- Tarjetas de materia en dashboard enlazan a su detalle y muestran nota acumulada.

### 2. Calendario y tareas
- Tabla `events` (id, user_id, subject_id nullable, semester_id, title, type [tarea|parcial|quiz|taller|laboratorio|exposicion|otro], due_at timestamptz, completed boolean default false, notes) con RLS.
- Página `/calendario`: vista mensual + lista "próximas entregas"; crear/editar/completar/eliminar eventos; chips de color por materia.
- Dashboard: sección "Próximas entregas" (5 más cercanas no completadas).

### 3. Gestión de semestres/materias
- Editar materia (nombre, créditos, profesor, color) desde su detalle.
- Página `/semestres`: lista de semestres, cambiar cuál es el actual, archivar.

### 4. Pulido (si queda tiempo)
- Navegación superior compartida (Dashboard / Biblioteca / Calendario / Semestres).
- Estados vacíos y loading consistentes.
- `npm run lint` sin errores.

## Reglas estrictas

1. **Commit después de cada tarea completada** (mensajes en español, formato como los commits existentes; no push — no hay remoto).
2. **`npm run build` debe pasar antes de cada commit.** Si falla, arreglar antes de seguir.
3. **Prohibido:** borrar tablas o datos de Supabase, tocar `.env.local`, desinstalar dependencias, deploy, borrar archivos fuera del proyecto, modificar `docs/contexto.md` u `horario.pdf`.
4. Migraciones solo aditivas (create table / add column). Nunca drop.
5. Leer `AGENTS.md` — Next.js 16 tiene cambios; consultar `node_modules/next/dist/docs/` ante dudas de API.
6. RLS obligatorio en toda tabla nueva + revisar advisors de seguridad tras cada migración.
7. Si una tarea se bloquea, documentar el bloqueo en `docs/PENDIENTES.md` y pasar a la siguiente.
8. No trabajar en integraciones nuevas de Google (Calendar, GitHub) — requieren configuración manual del usuario.
