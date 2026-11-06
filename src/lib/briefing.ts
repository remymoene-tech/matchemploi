import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LigneBriefing = {
  id: string;
  nom: string;
  nouvelles: string[];
  recrutent: number;
  contacts: number;
  enRetard: number;
  interesses: number;
  postules: number;
  totalProspections: number;
  derniere: string | null;
};

/** Ce que chaque étudiant a fait ces 7 derniers jours (prospections, contacts, relances, offres). */
export async function briefingEtudiants(etudiants: { user_id: string; nom: string; email: string }[], maintenant: number): Promise<LigneBriefing[]> {
  const ids = etudiants.map((e) => e.user_id);
  if (!ids.length) return [];
  const depuis = new Date(maintenant - 7 * 864e5).toISOString();
  const db = createAdminClient();
  const [{ data: pData }, { data: eData }, { data: mData }] = await Promise.all([
    db.from("prospections").select("id, candidat_id, entreprise, recrute, created_at, updated_at").in("candidat_id", ids),
    db.from("prospection_echanges").select("candidat_id, date_echange, action, action_a, action_faite").in("candidat_id", ids),
    db.from("correspondances").select("candidat_id, avis_candidat").in("candidat_id", ids).in("avis_candidat", ["interesse", "postule"]),
  ]);
  const prosp = (pData ?? []) as { id: string; candidat_id: string; entreprise: string; recrute: string; created_at: string; updated_at: string }[];
  const ech = (eData ?? []) as { candidat_id: string; date_echange: string; action: string; action_a: string | null; action_faite: boolean }[];
  const avis = (mData ?? []) as { candidat_id: string; avis_candidat: string }[];
  return etudiants.map((e) => {
    const p = prosp.filter((x) => x.candidat_id === e.user_id);
    const n = p.filter((x) => x.created_at >= depuis);
    const x = ech.filter((y) => y.candidat_id === e.user_id);
    const dates = [...x.map((y) => y.date_echange), ...p.map((y) => y.updated_at)].sort();
    return {
      id: e.user_id,
      nom: e.nom || e.email,
      nouvelles: n.map((y) => y.entreprise),
      recrutent: n.filter((y) => y.recrute === "oui").length,
      contacts: x.filter((y) => y.date_echange >= depuis).length,
      enRetard: x.filter((y) => y.action && !y.action_faite && y.action_a && new Date(y.action_a).getTime() < maintenant).length,
      interesses: avis.filter((y) => y.candidat_id === e.user_id && y.avis_candidat === "interesse").length,
      postules: avis.filter((y) => y.candidat_id === e.user_id && y.avis_candidat === "postule").length,
      totalProspections: p.length,
      derniere: dates.at(-1) ?? null,
    };
  }).sort((a, b) => (b.contacts + b.nouvelles.length) - (a.contacts + a.nouvelles.length));
}
