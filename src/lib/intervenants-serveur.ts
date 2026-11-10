import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { memeEntreprise } from "@/lib/prospections";
import { emailsEquipe } from "@/lib/equipe";
import { toutLire } from "@/lib/tout-lire";
import type { Lead } from "@/lib/leads";

/** L'intervenant recrute : son entreprise arrive dans « Mes entreprises » (statut Recrute) et l'équipe est prévenue. */
export async function entrepriseQuiRecrute(l: Lead): Promise<string | null> {
  if (!l.entreprise) return null;
  const db = createAdminClient();
  const { data: toutes } = await toutLire<Record<string, string>>((de, a) => db.from("entreprises").select("id, nom, contact_nom, contact_email, statut").order("id").range(de, a));
  const existante = (toutes ?? []).find((e) => memeEntreprise(e.nom as string, l.entreprise!));
  const qui = [l.prenom, l.nom].filter(Boolean).join(" ") || l.email;
  let id = existante?.id as string | undefined;
  if (!existante) {
    const { data, error } = await db.from("entreprises").insert({
      nom: l.entreprise.slice(0, 150), statut: "recrute", origine: "Intervenant",
      contact_nom: qui, contact_fonction: "Intervenant au Campus", contact_email: l.email, contact_tel: l.telephone ?? "",
      notes: `Ajoutée automatiquement : ${qui}, intervenant (${l.formation}), recrute.`, auteur: "intervenant",
    }).select("id").single();
    if (error || !data) return null;
    id = data.id as string;
  } else {
    await db.from("entreprises").update({ statut: "recrute", ...(existante.contact_nom || existante.contact_email ? {} : { contact_nom: qui, contact_email: l.email, contact_tel: l.telephone ?? "" }) }).eq("id", id!).in("statut", ["rencontree", "en_discussion", "pas_maintenant"]);
  }
  const maintenant = new Date().toISOString();
  const dest = await emailsEquipe();
  await db.from("echanges").insert(dest.map((auteur) => ({
    entreprise_id: id, type: "autre", date_echange: maintenant, auteur,
    resume: `🎯 ${qui} (intervenant · ${l.formation}) recrute chez ${l.entreprise}. Contact : ${l.email}${l.telephone ? ` · ${l.telephone}` : ""}`,
    action: `🎯 ${l.entreprise} recrute (intervenant ${qui}) : à traiter`, action_le: maintenant.slice(0, 10), action_a: maintenant,
  })));
  return id ?? null;
}

