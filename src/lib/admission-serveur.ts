import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
import { rechercherPourCandidat } from "@/lib/matching";
import { ADMISSIONS, AVEC_MOTIF, type Admission } from "@/lib/admission";

/** Change le statut d'admission. Passage à « admis » : recherche d'offres lancée + email de bienvenue. */
export async function changerAdmission(candidatId: string, statut: string, motif = ""): Promise<{ erreur?: string }> {
  if (!ADMISSIONS.some((a) => a.id === statut)) return { erreur: "Statut inconnu." };
  if (statut === "abandon" && !motif.trim()) return { erreur: "motif" };
  const db = createAdminClient();
  const { data: avant } = await db.from("candidats").select("email, nom, statut_admission, consentement").eq("user_id", candidatId).maybeSingle();
  let { error } = await db.from("candidats").update({ statut_admission: statut as Admission, motif_admission: AVEC_MOTIF.includes(statut) ? motif.trim().slice(0, 1000) : "" }).eq("user_id", candidatId);
  if (error && /motif_admission/.test(error.message)) ({ error } = await db.from("candidats").update({ statut_admission: statut as Admission }).eq("user_id", candidatId));
  if (error) return { erreur: "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." };
  if (statut === "admis" && avant?.statut_admission !== "admis") {
    if (avant?.consentement) after(() => rechercherPourCandidat(candidatId));
    if (avant?.email && moyenEnvoi()) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      after(() => envoyerEmail(avant.email, "Bonne nouvelle : tu es admis 🎉",
        texteEnHtml(`Bonjour ${avant.nom || ""},\n\nBonne nouvelle : ton admission est confirmée. Tes offres sont en train d'arriver sur MagnusMatch.\n\nVoir mes offres : ${site}/espace\n\nÀ très vite,\nL'équipe MagnusMatch`)).then(() => undefined));
    }
  }
  return {};
}
