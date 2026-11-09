import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { nomLead, statutLead, type Lead } from "@/lib/leads";

/** Un rendez-vous du planning : entretien d'admission (lead) ou entretien en entreprise (étudiant). */
export type Evenement = { id: string; quand: string; titre: string; detail: string; lien: string; type: "admission" | "entreprise"; statut?: string };

/** « 2026-11-18 » à Paris pour un instant donné. */
export const jourParis = (iso: string | Date) => new Date(iso).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

/** Entretiens entre deux jours (inclus), triés par heure. */
export async function evenementsEntre(debut: string, fin: string): Promise<Evenement[]> {
  const db = createAdminClient();
  const de = new Date(`${debut}T00:00:00Z`).getTime() - 864e5;
  const a = new Date(`${fin}T23:59:59Z`).getTime() + 864e5;
  const [{ data: leads }, { data: prosp }] = await Promise.all([
    db.from("leads").select("*").not("entretien_a", "is", null).gte("entretien_a", new Date(de).toISOString()).lte("entretien_a", new Date(a).toISOString()),
    db.from("prospections").select("id, candidat_id, entreprise, entretien_a, candidats(nom, email)").not("entretien_a", "is", null).gte("entretien_a", new Date(de).toISOString()).lte("entretien_a", new Date(a).toISOString()),
  ]);
  const ev: Evenement[] = [
    ...((leads ?? []) as Lead[]).map((l) => ({
      id: `l-${l.id}`, quand: l.entretien_a!, titre: nomLead(l), type: "admission" as const,
      detail: `Entretien d'admission${l.formation ? ` · ${l.formation}` : ""}`, lien: `/admin/leads/${l.id}?onglet=entretien`, statut: statutLead(l.statut).label,
    })),
    ...((prosp ?? []) as unknown as { id: string; candidat_id: string; entreprise: string; entretien_a: string; candidats: { nom: string; email: string } | null }[]).map((p) => ({
      id: `p-${p.id}`, quand: p.entretien_a, titre: p.candidats?.nom || p.candidats?.email || "Étudiant", type: "entreprise" as const,
      detail: `Entretien chez ${p.entreprise}`, lien: `/admin/candidats/${p.candidat_id}?onglet=prospections`,
    })),
  ];
  return ev.filter((e) => { const j = jourParis(e.quand); return j >= debut && j <= fin; }).sort((x, y) => x.quand.localeCompare(y.quand));
}
