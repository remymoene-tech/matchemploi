import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estEquipe } from "@/lib/auth";
import { ecoleDuResponsable } from "@/lib/ecoles";
import { echeance, lienRelance, relancesDe } from "@/lib/echanges";
import { relancesEtudiant } from "@/lib/prospections";
import { historiqueEquipe, historiqueEtudiant } from "@/lib/notifications";

export const dynamic = "force-dynamic";

async function recruteur() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user?.email) return null;
  if (await estEquipe(user.email)) return { email: user.email, base: "/admin/candidats" };
  if (await ecoleDuResponsable(user.email)) return { email: user.email, base: "/ecole/etudiants" };
  return null;
}

/** Lundi de la semaine en cours (clé du briefing hebdomadaire). */
function lundi() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Relances de la personne connectée (équipe, ou étudiant pour ses prospections) : à échéance et prochaines. */
export async function GET() {
  const r = await recruteur();
  const maintenant = Date.now();
  if (!r) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return NextResponse.json({ dues: [], prochaines: [] }, { status: 401 });
    const toutes = await relancesEtudiant(user.id);
    return NextResponse.json({
      dues: toutes.filter((x) => x.quand && new Date(x.quand).getTime() <= maintenant),
      prochaines: toutes.filter((x) => x.quand && new Date(x.quand).getTime() > maintenant).slice(0, 5),
      recentes: await historiqueEtudiant(user.id, 5),
      historique: "/notifications",
    });
  }
  const toutes = (await relancesDe(r.email)).map((x) => ({ ...x, quand: echeance(x)?.toISOString() ?? null, lien: lienRelance(x, r.base) }));
  const dues = toutes.filter((x) => x.quand && new Date(x.quand).getTime() <= maintenant);
  const prochaines = toutes.filter((x) => x.quand && new Date(x.quand).getTime() > maintenant).slice(0, 5);
  // Briefing de la semaine sur les étudiants (une notification par semaine)
  const briefing = { cle: lundi(), lien: r.base.startsWith("/admin") ? "/admin?vue=briefing" : "/ecole?vue=briefing" };
  return NextResponse.json({ dues, prochaines, briefing, recentes: await historiqueEquipe(r.email, r.base, 5), historique: "/notifications" });
}

/** Marquer une relance comme faite depuis la cloche. */
export async function POST(request: NextRequest) {
  const r = await recruteur();
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  if (!r) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    if (id.startsWith("ent:")) await createAdminClient().from("prospections").update({ entretien_vu: true }).eq("id", id.slice(4)).eq("candidat_id", user.id);
    else await createAdminClient().from("prospection_echanges").update({ action_faite: true }).eq("id", id).eq("candidat_id", user.id);
    return NextResponse.json({ ok: true });
  }
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", id).eq("auteur", r.email);
  return NextResponse.json({ ok: true });
}
