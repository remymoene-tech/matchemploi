import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ameliorerCV, iaConfiguree } from "@/lib/ia";
import type { Candidat } from "@/lib/types";

/** Fait réécrire le CV par Jobaprox et l'enregistre sur la fiche du candidat. */
export async function genererCvAmeliore(candidatId: string): Promise<{ erreur?: string }> {
  if (!iaConfiguree()) return { erreur: "La rédaction automatique n'est pas disponible pour l'instant." };
  const db = createAdminClient();
  const { data: c } = await db.from("candidats").select("*").eq("user_id", candidatId).single<Candidat>();
  if (!c?.cv_texte) return { erreur: "Dépose d'abord le CV et lance son analyse." };
  const conseils = (c.cv_conseils?.ameliorations ?? []).map((a) => `${a.categorie} : ${a.conseil}`).join(" | ");
  try {
    const cv = await ameliorerCV(c, conseils);
    const { error } = await db.from("candidats").update({ cv_ameliore: cv, cv_ameliore_le: new Date().toISOString() }).eq("user_id", candidatId);
    if (error) return { erreur: /cv_ameliore/.test(error.message) ? "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." : "L'enregistrement a échoué." };
    return {};
  } catch (e) {
    console.error("CV amélioré impossible", e);
    return { erreur: "La rédaction a échoué. Réessaie dans quelques minutes." };
  }
}
