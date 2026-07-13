import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { logger } from "@/lib/logger";

/**
 * Parsea y valida el body JSON de una `Request` contra un schema zod.
 * Devuelve `{ ok: true, data }` con los datos ya tipados o
 * `{ ok: false, response }` con una NextResponse 400 lista para retornar.
 */
export async function parseJson<T extends ZodType>(
  request: Request,
  schema: T
): Promise<
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Body debe ser JSON válido" },
        { status: 400 }
      ),
    };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logger.warn("[validate] body inválido", parsed.error.issues);
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Payload inválido",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Valida los query params de una URL contra un schema zod.
 */
export function parseQuery<T extends ZodType>(
  request: Request,
  schema: T
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: NextResponse } {
  const url = new URL(request.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Query inválido",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
