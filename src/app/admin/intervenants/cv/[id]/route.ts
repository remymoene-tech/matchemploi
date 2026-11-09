import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { droitsDe, peut } from "@/lib/equipe";

// Ouvre le CV d'un intervenant (lien temporaire de 5 minutes), réservé à l'équipe qui a accès aux intervenants.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || !peut(await droitsDe(user.email), "intervenants")) return new NextResponse("Accès réservé", { status: 403 });
  const db = createAdminClient();
  const { data: l } = await db.from("leads").select("cv_chemin").eq("id", id).eq("categorie", "intervenant").maybeSingle();
  if (!l?.cv_chemin) return new NextResponse("CV introuvable", { status: 404 });
  const { data } = await db.storage.from("cv").createSignedUrl(l.cv_chemin, 300);
  if (!data) return new NextResponse("CV introuvable", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
