import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cheminCV } from "@/lib/cv";

// Ouvre le CV de la personne connectée (lien temporaire de 5 minutes).
export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return new NextResponse("Connecte-toi d'abord", { status: 401 });
  const { data } = await createAdminClient().storage.from("cv").createSignedUrl(cheminCV(user.id), 300);
  if (!data) return new NextResponse("Aucun CV trouvé", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
