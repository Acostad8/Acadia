import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { ParsedSchedule, ParsedSubject } from "@/lib/types";

type Item = {
  str: string;
  x: number;
  y: number;
  w: number;
  page: number;
};

const DAY_NAMES: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

const SUBJECT_CODE_RE = /^\d{5,7}[A-Z]$/;
const TIME_RANGE_RE = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g;
const ROOM_CODE_RE = /^[A-ZÁÉÍÓÚÑ]{1,8}\d{0,3}$/;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function center(it: Item): number {
  return it.x + it.w / 2;
}

async function extractItems(data: Uint8Array): Promise<Item[]> {
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const items: Item[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      if (!("str" in raw)) continue;
      const str = raw.str.trim();
      if (!str) continue;
      items.push({
        str,
        x: raw.transform[4],
        y: raw.transform[5],
        w: raw.width ?? 0,
        page: p,
      });
    }
  }
  return items;
}

function parseSemester(items: Item[]): { name: string; label: string } {
  for (const it of items) {
    const m = it.str.match(/(Primer|Segundo)\s+Semestre\s+del\s+(\d{4})/i);
    if (m) {
      const num = normalize(m[1]) === "primer" ? 1 : 2;
      return { name: `${m[2]}-${num}`, label: m[0] };
    }
  }
  return { name: "desconocido", label: "Semestre no detectado" };
}

/** Leyenda Salón → Descripción (puede aparecer en varias páginas). */
function parseRoomLegend(items: Item[]): Map<string, string> {
  const rooms = new Map<string, string>();
  const pages = [...new Set(items.map((i) => i.page))];

  for (const page of pages) {
    const pageItems = items.filter((i) => i.page === page);
    const salonHeader = pageItems.find((i) => normalize(i.str) === "salon");
    const descHeader = pageItems.find((i) => normalize(i.str) === "descripcion");
    if (!salonHeader || !descHeader) continue;

    const codeItems = pageItems.filter(
      (i) =>
        i.y < salonHeader.y - 2 &&
        Math.abs(center(i) - center(salonHeader)) < 50 &&
        ROOM_CODE_RE.test(i.str)
    );

    for (const code of codeItems) {
      const descParts = pageItems
        .filter(
          (i) =>
            Math.abs(i.y - code.y) < 3 &&
            i.x > code.x + code.w + 5 &&
            i.str !== "-"
        )
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str);
      if (descParts.length > 0 && !rooms.has(code.str)) {
        rooms.set(code.str, descParts.join(" "));
      }
    }
  }
  return rooms;
}

/** Tabla Materia → Docente (última página). */
function parseProfessors(items: Item[]): Map<string, string | null> {
  const profs = new Map<string, string | null>();
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => b - a);

  for (const page of pages) {
    const pageItems = items.filter((i) => i.page === page);
    const materiaHeader = pageItems.find((i) => normalize(i.str) === "materia");
    const docenteHeader = pageItems.find((i) => normalize(i.str) === "docente");
    if (!materiaHeader || !docenteHeader) continue;

    const split = (center(materiaHeader) + center(docenteHeader)) / 2;
    const rowItems = pageItems.filter((i) => i.y < materiaHeader.y - 2);

    const rows = new Map<number, Item[]>();
    for (const it of rowItems) {
      const key = [...rows.keys()].find((y) => Math.abs(y - it.y) < 3);
      if (key !== undefined) rows.get(key)!.push(it);
      else rows.set(it.y, [it]);
    }

    for (const row of rows.values()) {
      const left = row
        .filter((i) => center(i) < split)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ");
      const right = row
        .filter((i) => center(i) >= split)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ");
      if (!left || !right) continue;
      const docente = /no\s+asignado/i.test(right) ? null : right;
      profs.set(normalize(left), docente);
    }
    if (profs.size > 0) break;
  }
  return profs;
}

/** Extrae bloques "HH:MM - HH:MM SALON" del texto de una celda. */
function parseCellBlocks(
  cellText: string,
  dayOfWeek: number,
  rooms: Map<string, string>
): ParsedSubject["blocks"] {
  const blocks: ParsedSubject["blocks"] = [];
  const matches = [...cellText.matchAll(TIME_RANGE_RE)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const segmentEnd =
      i + 1 < matches.length ? matches[i + 1].index : cellText.length;
    const tail = cellText.slice(m.index + m[0].length, segmentEnd);
    const roomToken = tail
      .split(/\s+/)
      .find((t) => t && ROOM_CODE_RE.test(t));

    const pad = (t: string) => (t.length === 4 ? `0${t}` : t);
    blocks.push({
      day_of_week: dayOfWeek,
      start_time: pad(m[1]),
      end_time: pad(m[2]),
      room_code: roomToken ?? null,
      room_description: roomToken ? rooms.get(roomToken) ?? null : null,
    });
  }
  return blocks;
}

export async function parseSchedulePdf(data: Uint8Array): Promise<ParsedSchedule> {
  const items = await extractItems(data);
  const semester = parseSemester(items);
  const rooms = parseRoomLegend(items);
  const professors = parseProfessors(items);

  const page1 = items.filter((i) => i.page === 1);

  // Encabezados de días definen las columnas
  const dayHeaders = page1
    .filter((i) => DAY_NAMES[normalize(i.str)] !== undefined)
    .sort((a, b) => a.x - b.x);
  if (dayHeaders.length === 0) {
    throw new Error("No se detectaron encabezados de días en el PDF");
  }
  const headerY = dayHeaders[0].y;

  // Límite izquierdo de la primera columna de día = frontera con columna Materia
  const materiaHeader = page1.find(
    (i) => normalize(i.str) === "materia" && Math.abs(i.y - headerY) < 5
  );
  const codigoHeader = page1.find(
    (i) => normalize(i.str) === "codigo" && Math.abs(i.y - headerY) < 5
  );

  const dayCenters = dayHeaders.map((h) => ({
    day: DAY_NAMES[normalize(h.str)],
    cx: center(h),
  }));
  const firstDayLeft =
    materiaHeader !== undefined
      ? (center(materiaHeader) + dayCenters[0].cx) / 2
      : dayCenters[0].cx - 60;

  const dayBounds = dayCenters.map((d, i) => {
    const left = i === 0 ? firstDayLeft : (dayCenters[i - 1].cx + d.cx) / 2;
    const right =
      i === dayCenters.length - 1
        ? Infinity
        : (d.cx + dayCenters[i + 1].cx) / 2;
    return { day: d.day, left, right };
  });

  const materiaLeft =
    codigoHeader !== undefined
      ? (center(codigoHeader) + (materiaHeader ? center(materiaHeader) : 0)) / 2
      : 0;

  // Filas ancladas por código de materia
  const codeItems = page1
    .filter((i) => i.y < headerY - 2 && SUBJECT_CODE_RE.test(i.str))
    .sort((a, b) => b.y - a.y);
  if (codeItems.length === 0) {
    throw new Error("No se detectaron códigos de materia en el PDF");
  }

  // Fin de la tabla = encabezado de la leyenda de salones (si existe)
  const legendHeader = page1.find(
    (i) => normalize(i.str) === "salon" && i.y < codeItems[codeItems.length - 1].y
  );
  const tableBottom = legendHeader ? legendHeader.y + 5 : -Infinity;

  const subjects: ParsedSubject[] = [];

  for (let r = 0; r < codeItems.length; r++) {
    const code = codeItems[r];
    const top = r === 0 ? headerY - 2 : (codeItems[r - 1].y + code.y) / 2;
    const bottom =
      r + 1 < codeItems.length
        ? (code.y + codeItems[r + 1].y) / 2
        : Math.max(tableBottom, code.y - 30);

    const rowItems = page1.filter(
      (i) => i.y < top && i.y >= bottom && i !== code
    );

    const nameParts = rowItems
      .filter((i) => center(i) > materiaLeft && center(i) < firstDayLeft)
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((i) => i.str);
    const rawName = nameParts.join(" ");
    const name = rawName.replace(/\s*\(\d+\)\s*$/, "").trim();

    const groupMatch = code.str.match(/([A-Z])$/);

    const blocks: ParsedSubject["blocks"] = [];
    for (const bound of dayBounds) {
      const cellItems = rowItems
        .filter((i) => {
          const cx = center(i);
          return cx >= bound.left && cx < bound.right;
        })
        .sort((a, b) => b.y - a.y || a.x - b.x);
      if (cellItems.length === 0) continue;
      const cellText = cellItems.map((i) => i.str).join(" ");
      blocks.push(...parseCellBlocks(cellText, bound.day, rooms));
    }

    subjects.push({
      code: code.str,
      name,
      group_name: groupMatch ? groupMatch[1] : null,
      professor: professors.get(normalize(name)) ?? null,
      blocks,
    });
  }

  return { semester, subjects };
}
