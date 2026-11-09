import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { echeance, lienRelance } from "@/lib/echanges";
import { dateEntretien } from "@/lib/prospections";

/** Une notification passée : un rappel arrivé à échéance (fait ou pas). */
export type Notification = { id: string; nom: string; action: string; quand: string; lien: string; faite: boolean };

/** Historique des notifications de l'équipe (les plus récentes d'abord). */
export async function historiqueEquipe(email: string, base: string, limite = 200): Promise<Notification[]> {
  const db = createAdminClient();
  const maintenant = new Date().toISOString();
  const lire = (champs: string) => db.from("echanges").select(champs).eq("auteur", email).neq("action", "").lte("action_a", maintenant).order("action_a", { ascending: false }).limit(limite);
  let { data, error } = await lire("id, candidat_id, entreprise_id, lead_id, action, action_a, action_le, action_faite, candidats(nom, email), entreprises(nom), leads(prenom, nom, email)");
  if (error) ({ data, error } = await lire("id, candidat_id, action, action_a, action_le, action_faite, candidats(nom, email)"));
  if (error) return [];
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const c = r.candidats as { nom: string; email: string } | null;
    const e = r.entreprises as { nom: string } | null | undefined;
    const l = r.leads as { prenom: string; nom: string; email: string } | null | undefined;
    const x = { candidat_id: (r.candidat_id as string) ?? null, entreprise_id: (r.entreprise_id as string) ?? null, lead_id: (r.lead_id as string) ?? null, action: r.action as string };
    return {
      id: r.id as string,
      nom: x.lead_id ? `🧲 ${[l?.prenom, l?.nom].filter(Boolean).join(" ") || l?.email || "Lead"}` : x.entreprise_id ? `🏢 ${e?.nom || "Entreprise"}` : c?.nom || c?.email || "Candidat",
      action: x.action,
      quand: echeance({ action_a: r.action_a as string | null, action_le: r.action_le as string | null })?.toISOString() ?? (r.action_a as string),
      lien: lienRelance(x, base),
      faite: !!r.action_faite,
    };
  }).filter((n) => n.action && n.quand && !isNaN(+new Date(n.quand)) && new Date(n.quand).getTime() <= Date.now());
}

/** Historique des notifications d'un étudiant (relances de prospection, entretiens). */
export async function historiqueEtudiant(userId: string, limite = 200): Promise<Notification[]> {
  const db = createAdminClient();
  const maintenant = Date.now();
  const [{ data: ech }, { data: ent }] = await Promise.all([
    db.from("prospection_echanges").select("id, prospection_id, action, action_a, action_faite, prospections(entreprise)").eq("candidat_id", userId).neq("action", "").lte("action_a", new Date(maintenant).toISOString()).order("action_a", { ascending: false }).limit(limite),
    db.from("prospections").select("id, entreprise, entretien_a, entretien_vu").eq("candidat_id", userId).not("entretien_a", "is", null),
  ]);
  const relances = ((ech ?? []) as unknown as { id: string; prospection_id: string; action: string; action_a: string; action_faite: boolean; prospections: { entreprise: string } | null }[]).map((r) => ({
    id: r.id, nom: `🏢 ${r.prospections?.entreprise ?? "Entreprise"}`, action: r.action, quand: r.action_a, lien: `/espace/prospections/${r.prospection_id}`, faite: r.action_faite,
  }));
  const entretiens = ((ent ?? []) as { id: string; entreprise: string; entretien_a: string; entretien_vu: boolean }[])
    .map((p) => ({ id: `ent:${p.id}`, nom: `🤝 Entretien · ${p.entreprise}`, action: `Entretien ${dateEntretien(p.entretien_a)}`, quand: new Date(new Date(p.entretien_a).getTime() - 24 * 3600e3).toISOString(), lien: `/espace/prospections/${p.id}`, faite: p.entretien_vu }))
    .filter((n) => new Date(n.quand).getTime() <= maintenant);
  return [...relances, ...entretiens].sort((a, b) => b.quand.localeCompare(a.quand)).slice(0, limite);
}
