import "server-only";
import { emailsEquipe } from "@/lib/equipe";
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
  /** Entretien prévu (date et heure) ; notifié la veille. */
  entretien_a?: string | null;
  entretien_vu?: boolean;
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

export const dateEntretien = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Entretiens à venir de l'étudiant : notification la veille (24 h avant). */
async function entretiensEtudiant(candidatId: string) {
  const { data, error } = await db().from("prospections").select("id, entreprise, entretien_a, entretien_vu")
    .eq("candidat_id", candidatId).not("entretien_a", "is", null).eq("entretien_vu", false)
    .gte("entretien_a", new Date(Date.now() - 3 * 3600e3).toISOString());
  if (error) return [];
  return (data ?? []).map((p) => ({
    id: `ent:${p.id}`,
    nom: `🤝 Entretien · ${p.entreprise}`,
    action: `Ton entretien est ${dateEntretien(p.entretien_a as string)}. Prépare-toi !`,
    quand: new Date(new Date(p.entretien_a as string).getTime() - 24 * 3600e3).toISOString(),
    lien: `/espace/prospections/${p.id}`,
  }));
}

/** Relances de l'étudiant (non faites) et ses entretiens, avec le nom de l'entreprise. */
export async function relancesEtudiant(candidatId: string) {
  const entretiens = await entretiensEtudiant(candidatId);
  const { data, error } = await db()
    .from("prospection_echanges")
    .select("id, prospection_id, action, action_a, prospections(entreprise)")
    .eq("candidat_id", candidatId).eq("action_faite", false).neq("action", "")
    .order("action_a", { ascending: true, nullsFirst: false }).limit(100);
  if (error) return entretiens;
  return [...entretiens, ...(data ?? []).map((r) => ({
    id: r.id as string,
    nom: `🏢 ${(r.prospections as unknown as { entreprise: string } | null)?.entreprise ?? "Entreprise"}`,
    action: r.action as string,
    quand: echeance({ action_a: r.action_a as string | null })?.toISOString() ?? null,
    lien: `/espace/prospections/${r.prospection_id}`,
  }))].sort((a, b) => (a.quand ?? "9").localeCompare(b.quand ?? "9"));
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

/**
 * L'étudiant a noté qu'une entreprise recrute : notification 🔔 immédiate pour l'équipe
 * (les admins et les responsables de son école), sous forme de relance à traiter sur sa fiche.
 */
export async function notifierEntrepriseQuiRecrute(candidatId: string, entreprise: string, justification: string) {
  try {
    const base = db();
    const { data: c } = await base.from("candidats").select("nom, email, ecole_id").eq("user_id", candidatId).maybeSingle();
    const admins = await emailsEquipe();
    const { data: resp } = c?.ecole_id ? await base.from("responsables").select("email").eq("ecole_id", c.ecole_id) : { data: [] };
    const destinataires = [...new Set([...admins, ...(resp ?? []).map((r) => (r.email as string).toLowerCase())])];
    const nom = c?.nom || c?.email || "Un étudiant";
    const maintenant = new Date().toISOString();
    if (!destinataires.length) return;
    await base.from("echanges").insert(destinataires.map((auteur) => ({
      candidat_id: candidatId,
      type: "autre",
      date_echange: maintenant,
      resume: `🎯 ${nom} a noté que « ${entreprise} » recrute. Ce qu'on lui a dit : ${justification}`,
      action: `🎯 ${entreprise} recrute (prospection de ${nom}) : à traiter`,
      action_le: maintenant.slice(0, 10),
      action_a: maintenant,
      auteur,
    })));
  } catch {
    /* la notification ne doit jamais bloquer l'étudiant */
  }
}

export type Decouvreur = { candidat_id: string; nom: string; recrute: string; date: string };

/**
 * Pour chaque entreprise de l'équipe : les étudiants qui l'ont prospectée, du premier au dernier.
 * Le premier est celui qui « a trouvé » l'entreprise.
 */
export async function decouvreursDesEntreprises(entreprises: { id: string; nom: string }[]): Promise<Map<string, Decouvreur[]>> {
  const res = new Map<string, Decouvreur[]>();
  if (!entreprises.length) return res;
  const { data, error } = await db().from("prospections").select("entreprise, entreprise_id, candidat_id, recrute, created_at, candidats(nom, email)").order("created_at");
  if (error) return res;
  for (const p of (data ?? []) as unknown as { entreprise: string; entreprise_id: string | null; candidat_id: string; recrute: string; created_at: string; candidats: { nom: string; email: string } | null }[]) {
    const e = p.entreprise_id ? entreprises.find((x) => x.id === p.entreprise_id) : entreprises.find((x) => memeEntreprise(x.nom, p.entreprise));
    if (!e) continue;
    const liste = res.get(e.id) ?? [];
    if (!liste.some((d) => d.candidat_id === p.candidat_id)) {
      liste.push({ candidat_id: p.candidat_id, nom: p.candidats?.nom || p.candidats?.email || "Étudiant", recrute: p.recrute, date: p.created_at });
    }
    res.set(e.id, liste);
  }
  return res;
}
