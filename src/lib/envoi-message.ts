import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
import { SUIVIS_PREPARATION, genererPreparation } from "@/lib/preparation";
import { noterEmailEnvoye } from "@/lib/echanges";

export type EtatEnvoi = { erreur?: string; envoye?: string };

const ORDRE = ["a_traiter", "propose_candidat", "propose_entreprise", "entretien", "embauche", "refus"];

/**
 * Envoie le message (étudiant ou entreprise) d'une correspondance, puis fait avancer le suivi.
 * L'appelant a déjà vérifié les droits.
 */
export async function envoyerMessageCorrespondance(
  f: FormData,
  expediteur: { nom: string; email: string },
): Promise<EtatEnvoi> {
  if (!moyenEnvoi()) return { erreur: "L'envoi d'emails n'est pas encore configuré (voir la page /diagnostic)." };
  const cible = String(f.get("cible"));
  const a = String(f.get("a") ?? "").trim();
  const objet = String(f.get("objet") ?? "").trim().slice(0, 200);
  const texte = String(f.get("texte") ?? "").trim().slice(0, 10000);
  const candidat = String(f.get("candidat_id"));
  const offre = String(f.get("offre_id"));
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(a)) return { erreur: "Indique une adresse email valide pour le destinataire." };
  if (!objet || texte.length < 20) return { erreur: "L'objet et le message ne peuvent pas être vides." };

  const ok = await envoyerEmail(a, objet, texteEnHtml(texte), {
    nomExpediteur: expediteur.nom,
    repondreA: expediteur.email,
    copieCachee: expediteur.email,
    texte,
  });
  if (!ok) return { erreur: "L'envoi a échoué. Vérifie l'adresse, puis réessaie. Si ça continue, regarde la page /diagnostic." };
  await noterEmailEnvoye(candidat, expediteur.email, a, objet, cible); // trace dans le journal des échanges

  // Le suivi avance tout seul (sans jamais reculer)
  const db = createAdminClient();
  const nouveau = cible === "entreprise" ? "propose_entreprise" : "propose_candidat";
  const { data: m } = await db.from("correspondances").select("suivi").eq("candidat_id", candidat).eq("offre_id", offre).maybeSingle();
  if (m && ORDRE.indexOf(m.suivi) < ORDRE.indexOf(nouveau)) {
    await db.from("correspondances").update({ suivi: nouveau }).eq("candidat_id", candidat).eq("offre_id", offre);
  }
  if (SUIVIS_PREPARATION.includes(nouveau)) after(() => genererPreparation(candidat, offre));
  return { envoye: `Envoyé à ${a}. Une copie est arrivée dans ta boîte, et les réponses iront à ${expediteur.email}.` };
}
