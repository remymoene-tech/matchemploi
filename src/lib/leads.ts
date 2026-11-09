import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
import { BROCHURES_PAR_DEFAUT, lireFormations } from "@/lib/formations";

/** Leads (prospects) : personnes qui ont demandé une brochure ou rencontrées en salon, JPO… */
export const STATUTS_LEAD = [
  { id: "nouveau", label: "🆕 Nouveau", chip: "chip-tag" },
  { id: "contacte", label: "📞 Contacté", chip: "chip-tag" },
  { id: "rdv", label: "📅 RDV / JPO", chip: "chip-tag" },
  { id: "dossier", label: "📝 Dossier envoyé", chip: "chip-tag" },
  { id: "inscrit", label: "✅ Inscrit", chip: "chip-plus" },
  { id: "perdu", label: "❌ Perdu", chip: "chip-minus" },
] as const;

export const ORIGINES_LEAD = ["Brochure (site de l'école)", "Journée portes ouvertes", "Salon", "Téléphone", "Réseaux sociaux", "Recommandation", "Autre"] as const;

export type Lead = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  formation: string;
  annee_rentree: number | null;
  origine: string;
  statut: string;
  ecole_id: string | null;
  candidat_id: string | null;
  consentement: boolean;
  brochure_envoyee_le: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export const statutLead = (id: string) => STATUTS_LEAD.find((s) => s.id === id) ?? STATUTS_LEAD[0];
export const nomLead = (l: Pick<Lead, "prenom" | "nom" | "email">) => [l.prenom, l.nom].filter(Boolean).join(" ") || l.email;

const db = () => createAdminClient();

export async function listeLeads(): Promise<Lead[] | null> {
  const { data, error } = await db().from("leads").select("*").order("created_at", { ascending: false }).limit(2000);
  return error ? null : ((data ?? []) as Lead[]);
}

export async function leadParId(id: string): Promise<Lead | null> {
  const { data } = await db().from("leads").select("*").eq("id", id).maybeSingle();
  return (data as Lead) ?? null;
}

/** Brochure à envoyer : celle de la formation, sinon la brochure générale de l'école. Lien public. */
export async function brochurePour(formation: string, ecoleId?: string | null): Promise<string | null> {
  const { data } = await db().from("ecoles").select("*");
  const ecoles = (data ?? []) as { id: string; formations?: unknown; brochure?: string | null }[];
  const ordre = [...ecoles.filter((e) => e.id === ecoleId), ...ecoles.filter((e) => e.id !== ecoleId)];
  const propre = ordre.flatMap((e) => lireFormations(e.formations)).find((f) => f.nom === formation)?.brochure;
  if (propre) return db().storage.from("brochures").getPublicUrl(propre).data.publicUrl;
  if (!BROCHURES_PAR_DEFAUT[formation.toUpperCase()]) {
    const generale = ordre.find((e) => e.brochure)?.brochure;
    if (generale) return db().storage.from("brochures").getPublicUrl(generale).data.publicUrl;
  }
  // Sinon : la brochure fournie avec le site pour cette formation
  const defaut = BROCHURES_PAR_DEFAUT[formation.toUpperCase()];
  return defaut ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app"}${defaut}` : null;
}

/** Envoie la brochure par email. Renvoie true si l'email est parti. */
export async function envoyerBrochure(l: Pick<Lead, "id" | "prenom" | "email" | "formation" | "ecole_id">, lien: string): Promise<boolean> {
  if (!moyenEnvoi()) return false;
  const ok = await envoyerEmail(
    l.email,
    `Votre brochure ${l.formation || "Campus Magnus"}`,
    texteEnHtml(`Bonjour ${l.prenom || ""},

Merci pour votre intérêt pour ${l.formation ? `la formation ${l.formation} du ` : "le "}Campus Magnus.
Voici votre brochure : ${lien}

Une question, un projet d'alternance ? Répondez simplement à cet email, nous vous recontactons rapidement.

À très bientôt,
L'équipe Campus Magnus`),
  );
  if (ok) await db().from("leads").update({ brochure_envoyee_le: new Date().toISOString() }).eq("id", l.id);
  return ok;
}

/** Notification 🔔 à l'équipe : nouveau lead. */
export async function notifierNouveauLead(l: Pick<Lead, "id" | "prenom" | "nom" | "email" | "formation" | "annee_rentree" | "origine">) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!admins.length) return;
  const maintenant = new Date().toISOString();
  const quoi = [l.formation, l.annee_rentree && `rentrée ${l.annee_rentree}`].filter(Boolean).join(", ");
  await db().from("echanges").insert(admins.map((auteur) => ({
    lead_id: l.id,
    type: "autre",
    date_echange: maintenant,
    resume: `🧲 Nouveau lead : ${nomLead(l)} (${l.origine}${quoi ? ` · ${quoi}` : ""}).`,
    action: `🧲 Nouveau lead : ${nomLead(l)}${quoi ? ` · ${quoi}` : ""} → à contacter`,
    action_le: maintenant.slice(0, 10),
    action_a: maintenant,
    auteur,
  })));
}
