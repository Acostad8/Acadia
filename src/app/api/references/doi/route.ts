import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CrossrefAuthor = { family?: string; given?: string; name?: string };

type CrossrefWork = {
  title?: string[];
  author?: CrossrefAuthor[];
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  publisher?: string;
  URL?: string;
  type?: string;
};

function formatAuthor(a: CrossrefAuthor): string {
  if (a.family) {
    const initials = (a.given ?? "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((n) => `${n.charAt(0).toUpperCase()}.`)
      .join(" ");
    return initials ? `${a.family}, ${initials}` : a.family;
  }
  return a.name ?? "";
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
  const doi = searchParams.get("doi")?.trim().replace(/^https?:\/\/doi\.org\//i, "");
  if (!doi) {
    return NextResponse.json({ error: "DOI requerido" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: "DOI no encontrado" },
      { status: 404 }
    );
  }

  const json = (await res.json()) as { message?: CrossrefWork };
  const work = json.message;
  if (!work) {
    return NextResponse.json({ error: "DOI no encontrado" }, { status: 404 });
  }

  const kind =
    work.type === "book" || work.type === "monograph"
      ? "libro"
      : work.type?.includes("journal") || work.type?.includes("proceedings")
        ? "articulo"
        : "otro";

  return NextResponse.json({
    title: work.title?.[0] ?? "",
    authors: (work.author ?? []).map(formatAuthor).filter(Boolean).join("; "),
    year: work.issued?.["date-parts"]?.[0]?.[0] ?? null,
    source: work["container-title"]?.[0] ?? work.publisher ?? "",
    url: work.URL ?? "",
    doi,
    kind,
  });
}
