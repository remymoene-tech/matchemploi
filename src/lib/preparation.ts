import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, preparerEntretien, rechercherEntreprise, type Preparation, type Source } from "@/lib/ia";
import type { Candidat, Offre } from "@/lib/types";

export type FichePreparation = Preparation & {
  meta: { intitule: string; entreprise: string; lieu: string; contrat: string; lien: string; score: number };
  /** Pages consultées par Jobaprox pendant sa recherche sur l'entreprise. */
  sources?: Source[];
};

/** Statuts de suivi qui déclenchent la fiche (le candidat est positionné sur l'offre). */
export const SUIVIS_PREPARATION = ["propose_candidat", "propose_entreprise", "entretien"];

/**
 * Crée (ou recrée) la fiche de préparation d'entretien d'un duo candidat × offre.
 * Ne fait rien si elle existe déjà, sauf avec `forcer`.
 */
export async function genererPreparation(candidatId: string, offreId: string, forcer = false): Promise<{ ok: boolean; message?: string }> {
  if (!iaConfiguree()) return { ok: false, message: "La génération automatique n'est pas disponible pour l'instant." };
  const db = createAdminClient();
  const { data: m, error } = await db.from("correspondances").select("*").eq("candidat_id", candidatId).eq("offre_id", offreId).maybeSingle();
  if (error && /preparation/.test(error.message)) return { ok: false, message: "La base n'est pas à jour : exécute la mise à jour SQL indiquée sur la page /diagnostic." };
  if (!m) return { ok: false, message: "Correspondance introuvable." };
  if (m.preparation && !forcer) return { ok: true };

  const [{ data: c }, { data: o }] = await Promise.all([
    db.from("candidats").select("*").eq("user_id", candidatId).single<Candidat>(),
    db.from("offres").select("*").eq("id", offreId).single<Offre>(),
  ]);
  if (!c || !o) return { ok: false, message: "Candidat ou offre introuvable." };

  try {
    const recherche = await rechercherEntreprise(o); // null si la recherche n'aboutit pas
    const prep = await preparerEntretien(c, o, m.forts ?? [], m.manques ?? [], recherche?.notes);
    const fiche: FichePreparation = {
      ...prep,
      sources: recherche?.sources ?? [],
      meta: {
        intitule: o.intitule, entreprise: o.entreprise, lieu: o.lieu,
        contrat: o.contrat_libelle || o.contrat, lien: o.lien, score: m.score,
      },
    };
    const { error: e } = await db
      .from("correspondances")
      .update({ preparation: fiche, preparation_le: new Date().toISOString() })
      .eq("candidat_id", candidatId)
      .eq("offre_id", offreId);
    if (e) return { ok: false, message: "La fiche n'a pas pu être enregistrée." };
    return { ok: true };
  } catch (e) {
    console.error("Préparation d'entretien impossible", e);
    return { ok: false, message: "La préparation a échoué. Réessaie dans quelques minutes." };
  }
}
