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

/**
 * Enregistre des champs du candidat. Si la colonne cv_conseils n'existe pas encore
 * dans la base (ligne SQL non exécutée), enregistre le reste et le signale.
 */
export async function majCandidat(
  supabase: SupabaseClient,
  ligne: Record<string, unknown> & { user_id: string },
): Promise<{ ok: boolean; colonneConseilsManquante: boolean }> {
  let { error } = await supabase.from("candidats").upsert(ligne, { onConflict: "user_id" });
  if (error && /cv_conseils/.test(error.message)) {
    const { cv_conseils: _ignore, ...sans } = ligne;
    void _ignore;
    ({ error } = await supabase.from("candidats").upsert(sans, { onConflict: "user_id" }));
    return { ok: !error, colonneConseilsManquante: true };
  }
  if (error) console.error("Enregistrement du candidat impossible", error);
  return { ok: !error, colonneConseilsManquante: false };
}
