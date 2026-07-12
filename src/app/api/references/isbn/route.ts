import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OLAuthor = { name?: string; url?: string };
type OLPublisher = { name?: string };
type OLIdentifiers = { doi?: string[] };
type OpenLibraryBook = {
  title?: string;
  subtitle?: string;
  authors?: OLAuthor[];
  publish_date?: string;
  publishers?: OLPublisher[];
  url?: string;
  identifiers?: OLIdentifiers;
};

type GBVolumeInfo = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publishedDate?: string;
  publisher?: string;
  infoLink?: string;
  industryIdentifiers?: { type: string; identifier: string }[];
};

type GoogleBooksResult = {
  totalItems?: number;
  items?: { volumeInfo?: GBVolumeInfo }[];
};

function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function validateIsbn(isbn: string): boolean {
  if (isbn.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const c = isbn.charCodeAt(i) - 48;
      if (c < 0 || c > 9) return false;
      sum += c * (10 - i);
    }
    const last = isbn[9];
    const check = last === "X" ? 10 : last.charCodeAt(0) - 48;
    return (sum + check) % 11 === 0;
  }
  if (isbn.length === 13) {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const c = isbn.charCodeAt(i) - 48;
      if (c < 0 || c > 9) return false;
      sum += i % 2 === 0 ? c : c * 3;
    }
    return sum % 10 === 0;
  }
  return false;
}

function toApaAuthor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.trim();
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(" ");
  return `${last}, ${initials}`;
}

function yearFrom(date: string | undefined): number | null {
  if (!date) return null;
  const m = /\d{4}/.exec(date);
  return m ? Number(m[0]) : null;
}

async function fromOpenLibrary(isbn: string) {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, OpenLibraryBook>;
  const book = json[`ISBN:${isbn}`];
  if (!book?.title) return null;
  const title = book.subtitle
    ? `${book.title}: ${book.subtitle}`
    : book.title;
  return {
    title,
    authors: (book.authors ?? [])
      .map((a) => a.name)
      .filter((n): n is string => Boolean(n))
      .map(toApaAuthor)
      .join("; "),
    year: yearFrom(book.publish_date),
    source: (book.publishers ?? []).map((p) => p.name).filter(Boolean).join(", "),
    url: book.url ?? `https://openlibrary.org/isbn/${isbn}`,
    doi: book.identifiers?.doi?.[0] ?? "",
  };
}

async function fromGoogleBooks(isbn: string) {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as GoogleBooksResult;
  const info = json.items?.[0]?.volumeInfo;
  if (!info?.title) return null;
  const title = info.subtitle ? `${info.title}: ${info.subtitle}` : info.title;
  return {
    title,
    authors: (info.authors ?? []).map(toApaAuthor).join("; "),
    year: yearFrom(info.publishedDate),
    source: info.publisher ?? "",
    url: info.infoLink ?? `https://books.google.com/books?vq=${isbn}`,
    doi: "",
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("isbn")?.trim() ?? "";
  const isbn = normalizeIsbn(raw);
  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
    return NextResponse.json(
      { error: "ISBN debe tener 10 o 13 dígitos" },
      { status: 400 }
    );
  }
  if (!validateIsbn(isbn)) {
    return NextResponse.json(
      { error: "ISBN inválido (dígito de control incorrecto)" },
      { status: 400 }
    );
  }

  const openLibrary = await fromOpenLibrary(isbn).catch(() => null);
  const result = openLibrary ?? (await fromGoogleBooks(isbn).catch(() => null));

  if (!result) {
    return NextResponse.json(
      { error: "ISBN no encontrado en Open Library ni Google Books" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      title: result.title,
      authors: result.authors,
      year: result.year,
      source: result.source,
      url: result.url,
      doi: result.doi,
      kind: "libro",
      isbn,
    },
    {
      headers: {
        "Cache-Control":
          "private, max-age=86400, stale-while-revalidate=604800",
      },
    }
  );
}
