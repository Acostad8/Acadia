import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  // Rechaza protocolo, protocolo-relativo (//host), backslash y esquemas raros.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/dashboard";
  }
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Guardar tokens de Google para usar Drive API luego
      const providerToken = data.session.provider_token;
      const providerRefreshToken = data.session.provider_refresh_token;
      if (providerToken) {
        await supabase.auth.updateUser({
          data: {
            google_provider_token: providerToken,
            ...(providerRefreshToken && {
              google_provider_refresh_token: providerRefreshToken,
            }),
          },
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
