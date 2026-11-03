import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const TYPES_ECHANGE = [
  { id: "telephone", label: "Téléphone", icone: "📞" },
  { id: "email", label: "Email", icone: "✉️" },
  { id: "sms", label: "SMS", icone: "💬" },
  { id: "rdv", label: "Rendez-vous", icone: "🤝" },
  { id: "autre", label: "Autre", icone: "📝" },
] as const;

export type Echange = {
  id: string;
  candidat_id: string;
  type: string;
  date_echange: string;
  resume: string;
  action: string;
  action_le: string | null;
  action_faite: boolean;
  auteur: string;
};

const txt = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);

export async function ajouterEchange(candidatId: string, f: FormData, auteur: string): Promise<{ erreur?: string }> {
  const type = txt(f, "type", 20);
  const resume = txt(f, "resume");
  if (!resume) return { erreur: "Écris ce qui s'est dit." };
  const quand = txt(f, "date_echange", 30);
  const relance = txt(f, "action_le", 10);
  const { error } = await createAdminClient().from("echanges").insert({
    candidat_id: candidatId,
    type: TYPES_ECHANGE.some((t) => t.id === type) ? type : "autre",
    date_echange: quand ? new Date(quand).toISOString() : new Date().toISOString(),
    resume,
    action: txt(f, "action", 500),
    action_le: /^\d{4}-\d{2}-\d{2}$/.test(relance) ? relance : null,
    auteur,
  });
  if (error) return { erreur: /echanges/.test(error.message) ? "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." : "L'enregistrement a échoué." };
  return {};
}

/** Note automatiquement un email envoyé depuis Jobaprox (n'échoue jamais). */
export async function noterEmailEnvoye(candidatId: string, auteur: string, destinataire: string, objet: string, cible: string) {
  try {
    await createAdminClient().from("echanges").insert({
      candidat_id: candidatId,
      type: "email",
      resume: `Email envoyé depuis Jobaprox ${cible === "entreprise" ? "à l'entreprise" : "à l'étudiant"} (${destinataire}) : « ${objet} »`,
      auteur,
    });
  } catch {
    /* le journal ne doit jamais bloquer l'envoi */
  }
}

export async function echangesDuCandidat(candidatId: string): Promise<Echange[]> {
  const { data } = await createAdminClient().from("echanges").select("*").eq("candidat_id", candidatId).order("date_echange", { ascending: false }).limit(200);
  return (data ?? []) as Echange[];
}
