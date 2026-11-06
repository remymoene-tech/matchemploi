import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, lireCV } from "@/lib/ia";

export const cheminCV = (userId: string) => `${userId}/cv.pdf`;

/** Vérifie et enregistre le PDF dans le stockage privé. Renvoie un message d'erreur ou null. */
export async function stockerCV(userId: string, fichier: File): Promise<{ erreur: string } | { octets: Buffer }> {
  if (fichier.type !== "application/pdf") return { erreur: "Le CV doit être un fichier PDF." };
  if (fichier.size > 3.5 * 1024 * 1024) return { erreur: "Le CV dépasse 3,5 Mo. Exporte-le en PDF plus léger." };
  const octets = Buffer.from(await fichier.arrayBuffer());
  const { error } = await createAdminClient().storage.from("cv").upload(cheminCV(userId), octets, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) return { erreur: "L'envoi du CV a échoué. Réessaie." };
  return { octets };
}

/** CV envoyé directement par le navigateur : on vérifie que c'est bien un PDF. */
export async function cvDepose(userId: string): Promise<{ erreur: string } | { octets: Buffer }> {
  const octets = await telechargerCV(userId);
  if (!octets) return { erreur: "Le CV n'est pas arrivé. Réessaie de l'envoyer." };
  if (octets.subarray(0, 5).toString() !== "%PDF-") {
    await createAdminClient().storage.from("cv").remove([cheminCV(userId)]);
    return { erreur: "Le fichier envoyé n'est pas un vrai PDF. Exporte ton CV en PDF et réessaie." };
  }
  if (octets.length > 10 * 1024 * 1024) return { erreur: "Le CV dépasse 10 Mo. Exporte-le en PDF plus léger." };
  return { octets };
}

export async function telechargerCV(userId: string) {
  const { data } = await createAdminClient().storage.from("cv").download(cheminCV(userId));
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

/** Fait lire le CV par l'IA. Renvoie les champs à enregistrer, ou null si l'IA est indisponible ou échoue. */
export async function analyserCV(octets: Buffer, posteVise: string, projet: string) {
  if (!iaConfiguree()) return null;
  try {
    const lu = await lireCV(octets.toString("base64"), posteVise, projet);
    return {
      cv_texte: lu.texte.slice(0, 6000),
      competences: lu.competences.slice(0, 10),
      mots_cles: lu.mots_cles,
      cv_conseils: lu.conseils,
    };
  } catch (e) {
    console.error("Analyse du CV impossible", e);
    return null;
  }
}

/** Colonnes ajoutées après la première version : si la base n'est pas à jour, on enregistre sans elles. */
const COLONNES_OPTIONNELLES = ["cv_conseils", "latitude", "longitude", "code_commune", "ecole_id", "diplome_annee"];

/** Retire les colonnes optionnelles qui n'existent pas encore dans la base, d'après le message d'erreur. */
export function sansColonnesManquantes<T extends Record<string, unknown>>(ligne: T, message: string): T | null {
  const manquantes = COLONNES_OPTIONNELLES.filter((c) => message.includes(c) && c in ligne);
  if (!manquantes.length) return null;
  // La base ne signale qu'une colonne à la fois : on retire toutes les colonnes récentes d'un coup.
  const copie = { ...ligne };
  for (const c of COLONNES_OPTIONNELLES) delete copie[c];
  return copie;
}

/** Enregistre des champs du candidat, même si la base n'a pas encore toutes les colonnes récentes. */
export async function majCandidat(
  supabase: SupabaseClient,
  ligne: Record<string, unknown> & { user_id: string },
): Promise<{ ok: boolean; colonneConseilsManquante: boolean; detail?: string }> {
  let { error } = await supabase.from("candidats").upsert(ligne, { onConflict: "user_id" });
  if (error) {
    const reduite = sansColonnesManquantes(ligne, error.message);
    if (reduite) {
      ({ error } = await supabase.from("candidats").upsert(reduite, { onConflict: "user_id" }));
      if (error) console.error("Enregistrement du candidat impossible", error);
      return { ok: !error, colonneConseilsManquante: "cv_conseils" in ligne && !("cv_conseils" in reduite), detail: error?.message };
    }
    console.error("Enregistrement du candidat impossible", error);
  }
  return { ok: !error, colonneConseilsManquante: false, detail: error?.message };
}
