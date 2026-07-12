import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
