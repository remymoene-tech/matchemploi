import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifierConfig } from "@/lib/config";

// Rafraîchit la session Supabase à chaque requête et protège les espaces privés.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!verifierConfig().supabaseOk) {
    // Configuration incomplète : on envoie vers la page de diagnostic au lieu de planter.
    if (request.nextUrl.pathname === "/diagnostic") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/diagnostic";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/espace") || path.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
