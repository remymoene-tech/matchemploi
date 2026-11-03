import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estAdmin } from "@/lib/auth";
import { ecoleDuResponsable } from "@/lib/ecoles";
import { echeance, relancesDe } from "@/lib/echanges";

export const dynamic = "force-dynamic";

async function recruteur() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user?.email) return null;
  if (estAdmin(user.email)) return { email: user.email, base: "/admin/candidats" };
  if (await ecoleDuResponsable(user.email)) return { email: user.email, base: "/ecole/etudiants" };
  return null;
}

/** Relances du recruteur connecté : celles arrivées à échéance et les prochaines. */
export async function GET() {
  const r = await recruteur();
  if (!r) return NextResponse.json({ dues: [], prochaines: [] }, { status: 401 });
  const maintenant = Date.now();
  const toutes = (await relancesDe(r.email)).map((x) => ({ ...x, quand: echeance(x)?.toISOString() ?? null, lien: `${r.base}/${x.candidat_id}?onglet=echanges` }));
  const dues = toutes.filter((x) => x.quand && new Date(x.quand).getTime() <= maintenant);
  const prochaines = toutes.filter((x) => x.quand && new Date(x.quand).getTime() > maintenant).slice(0, 5);
  return NextResponse.json({ dues, prochaines });
}

/** Marquer une relance comme faite depuis la cloche. */
export async function POST(request: NextRequest) {
  const r = await recruteur();
  if (!r) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", id).eq("auteur", r.email);
  return NextResponse.json({ ok: true });
}
