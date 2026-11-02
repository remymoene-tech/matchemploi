import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ecoleDuResponsable } from "@/lib/ecoles";
import { cheminCV } from "@/lib/cv";

// CV d'un étudiant de l'école (lien temporaire de 5 minutes).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  const ecole = await ecoleDuResponsable(user?.email);
  if (!ecole) return new NextResponse("Accès réservé à l'école", { status: 403 });
  const db = createAdminClient();
  const { data: c } = await db.from("candidats").select("user_id").eq("user_id", id).eq("ecole_id", ecole.id).maybeSingle();
  if (!c) return new NextResponse("Étudiant introuvable dans ton école", { status: 404 });
  const { data } = await db.storage.from("cv").createSignedUrl(cheminCV(id), 300);
  if (!data) return new NextResponse("CV introuvable", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
