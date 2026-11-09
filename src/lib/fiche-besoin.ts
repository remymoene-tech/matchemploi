import "server-only";
import { emailsEquipe } from "@/lib/equipe";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Entreprise } from "@/lib/entreprises";

/** Lien personnel envoyé à l'entreprise pour remplir sa fiche besoin elle-même (valable 60 jours). */
export const VALIDITE_JOURS = 60;

export const nouveauJeton = () => randomBytes(24).toString("base64url");

export async function entrepriseParJeton(jeton: string): Promise<Entreprise | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(jeton)) return null;
  const { data } = await createAdminClient().from("entreprises").select("*").eq("jeton_besoin", jeton).maybeSingle();
  const e = data as (Entreprise & { besoin_envoye_le?: string | null }) | null;
  if (!e?.besoin_envoye_le) return null;
  if (Date.now() - new Date(e.besoin_envoye_le).getTime() > VALIDITE_JOURS * 864e5) return null;
  return e;
}

/** Notification 🔔 à l'équipe : l'entreprise a rempli sa fiche besoin. */
export async function notifierBesoinRempli(e: Entreprise) {
  const admins = await emailsEquipe(["entreprises"]);
  const destinataires = [...new Set([...(e.auteur ? [e.auteur.toLowerCase()] : []), ...admins])];
  const maintenant = new Date().toISOString();
  if (!destinataires.length) return;
  await createAdminClient().from("echanges").insert(destinataires.map((auteur) => ({
    entreprise_id: e.id,
    type: "autre",
    date_echange: maintenant,
    resume: `📋 ${e.contact_nom || e.nom} a rempli la fiche besoin en ligne.`,
    action: `📋 ${e.nom} a rempli sa fiche besoin : à relire`,
    action_le: maintenant.slice(0, 10),
    action_a: maintenant,
    auteur,
  })));
}
