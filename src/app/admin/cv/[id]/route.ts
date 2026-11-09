import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estEquipe } from "@/lib/auth";

// Ouvre le CV d'un candidat (lien temporaire de 5 minutes), réservé à l'équipe.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || !(await estEquipe(user.email))) return new NextResponse("Accès réservé", { status: 403 });
  const { data } = await createAdminClient().storage.from("cv").createSignedUrl(`${id}/cv.pdf`, 300);
  if (!data) return new NextResponse("CV introuvable", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
