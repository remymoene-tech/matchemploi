import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { echeance } from "@/lib/echanges";

/** Entreprises que l'étudiant a prospectées lui-même, avec l'historique de ses contacts et ses relances. */
export const TYPES_PROSPECTION = [
  { id: "visite", label: "Visite sur place", icone: "🚶" },
  { id: "telephone", label: "Téléphone", icone: "📞" },
  { id: "email", label: "Email", icone: "✉️" },
  { id: "autre", label: "Autre", icone: "📝" },
] as const;

export const RECRUTE = [
  { id: "oui", label: "Recrute", icone: "✅", chip: "chip-plus" },
  { id: "non", label: "Ne recrute pas", icone: "❌", chip: "chip-minus" },
] as const;

export type Prospection = {
  id: string;
  candidat_id: string;
  entreprise: string;
  ville: string;
  contact_nom: string;
  contact_tel: string;
  contact_email: string;
  recrute: string;
  justification: string;
  entreprise_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EchangeProspection = {
  id: string;
  prospection_id: string;
  candidat_id: string;
  type: string;
  date_echange: string;
  resume: string;
  action: string;
  action_a: string | null;
  action_faite: boolean;
};

const db = () => createAdminClient();

export async function prospectionsDe(candidatId: string): Promise<Prospection[] | null> {
  const { data, error } = await db().from("prospections").select("*").eq("candidat_id", candidatId).order("updated_at", { ascending: false });
  return error ? null : ((data ?? []) as Prospection[]);
}

export async function prospection(id: string): Promise<Prospection | null> {
  const { data } = await db().from("prospections").select("*").eq("id", id).maybeSingle();
  return (data as Prospection) ?? null;
}

export async function echangesDeProspections(ids: string[]): Promise<EchangeProspection[]> {
  if (!ids.length) return [];
  const { data } = await db().from("prospection_echanges").select("*").in("prospection_id", ids).order("date_echange", { ascending: false });
  return (data ?? []) as EchangeProspection[];
}

/** Relances de l'étudiant (non faites), avec le nom de l'entreprise. */
export async function relancesEtudiant(candidatId: string) {
  const { data, error } = await db()
    .from("prospection_echanges")
    .select("id, prospection_id, action, action_a, prospections(entreprise)")
    .eq("candidat_id", candidatId).eq("action_faite", false).neq("action", "")
    .order("action_a", { ascending: true, nullsFirst: false }).limit(100);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    nom: `🏢 ${(r.prospections as unknown as { entreprise: string } | null)?.entreprise ?? "Entreprise"}`,
    action: r.action as string,
    quand: echeance({ action_a: r.action_a as string | null })?.toISOString() ?? null,
    lien: `/espace/prospections/${r.prospection_id}`,
  }));
}

const norme = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const memeEntreprise = (a: string, b: string) => !!norme(a) && norme(a) === norme(b);

/** Prospections de tous les étudiants pour une entreprise de l'équipe (lien direct ou même nom). */
export async function prospectionsDeLEntreprise(e: { id: string; nom: string }) {
  const [{ data: liees }, { data: memeNom }] = await Promise.all([
    db().from("prospections").select("*, candidats(nom, email)").eq("entreprise_id", e.id),
    db().from("prospections").select("*, candidats(nom, email)").ilike("entreprise", e.nom.replace(/[%_]/g, "")),
  ]);
  const vues = new Map<string, Prospection & { candidats: { nom: string; email: string } | null }>();
  for (const p of [...(liees ?? []), ...(memeNom ?? [])] as (Prospection & { candidats: { nom: string; email: string } | null })[]) {
    if (p.entreprise_id === e.id || memeEntreprise(p.entreprise, e.nom)) vues.set(p.id, p);
  }
  return [...vues.values()];
}
