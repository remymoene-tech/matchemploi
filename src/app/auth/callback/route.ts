import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lien de confirmation reçu par email après l'inscription.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/espace";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/espace"}`);
  }
  // Lien expiré ou déjà utilisé
  return NextResponse.redirect(`${origin}${next === "/nouveau-mot-de-passe" ? "/nouveau-mot-de-passe" : "/connexion"}`);
}
