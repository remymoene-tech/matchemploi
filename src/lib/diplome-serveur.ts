import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formationsDeLEcole } from "@/lib/ecoles";

const txt = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** L'équipe change le diplôme préparé d'un étudiant : formation, année de cursus, année d'obtention. */
export async function majDiplome(candidatId: string, f: FormData): Promise<{ erreur?: string }> {
  const db = createAdminClient();
  const { data: c } = await db.from("candidats").select("ecole_id").eq("user_id", candidatId).maybeSingle();
  if (!c) return { erreur: "Candidat introuvable." };
  const catalogue = await formationsDeLEcole(c.ecole_id);
  const choix = txt(f, "formation_choix", 120);
  // Uniquement une formation de l'école (texte libre seulement si l'école n'en a aucune)
  const formation = catalogue.length ? (catalogue.some((x) => x.nom === choix) ? choix : "") : txt(f, "formation_autre");
  if (!formation) return { erreur: "Choisis une formation de l'école." };
  const cat = catalogue.find((x) => x.nom === formation);
  const an = Number(f.get("annee_cursus"));
  const annee_cursus = Number.isInteger(an) && an >= 1 && an <= (cat?.duree ?? 5) ? an : null;
  const d = Number(f.get("diplome_annee"));
  const ligne = {
    formation,
    annee_cursus,
    rythme_cursus: annee_cursus && cat ? (cat.alternance.includes(annee_cursus) ? "alternance" : "initial") : null,
    diplome_annee: Number.isInteger(d) && d >= 2000 && d <= 2100 ? d : null,
    updated_at: new Date().toISOString(),
  };
  let { error } = await db.from("candidats").update(ligne).eq("user_id", candidatId);
  if (error) ({ error } = await db.from("candidats").update({ formation, updated_at: ligne.updated_at }).eq("user_id", candidatId));
  return error ? { erreur: "L'enregistrement a échoué." } : {};
}
