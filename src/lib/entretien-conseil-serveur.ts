import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BILANS, REPONSES_QUESTION, SECTIONS, type Reponses } from "@/lib/entretien-conseil";

const txt = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);

/** Lit le formulaire de la fiche d'entretien et l'enregistre (création ou mise à jour). Renvoie l'id ou une erreur. */
export async function enregistrerEntretienConseil(
  f: FormData,
  candidatId: string,
  conseiller: { email: string },
): Promise<{ id?: string; erreur?: string }> {
  const reponses: Reponses = {};
  for (const s of SECTIONS) {
    for (const it of s.items) {
      const precision = txt(f, `p_${it.id}`, 1000);
      if (s.type === "cases") {
        const coche = f.get(`c_${it.id}`) === "on";
        if (coche || precision) reponses[it.id] = { coche, precision: coche ? precision : "" };
      } else {
        const r = txt(f, `q_${it.id}`, 40);
        const reponse = (REPONSES_QUESTION as readonly string[]).includes(r) ? r : "Non renseigné";
        reponses[it.id] = { reponse, precision };
      }
    }
  }
  const bilan = txt(f, "bilan", 40);
  const ligne = {
    candidat_id: candidatId,
    conseiller: txt(f, "conseiller", 120),
    conseiller_email: conseiller.email,
    date_entretien: /^\d{4}-\d{2}-\d{2}$/.test(txt(f, "date_entretien", 10)) ? txt(f, "date_entretien", 10) : new Date().toISOString().slice(0, 10),
    formation: txt(f, "formation", 200),
    zone: txt(f, "zone", 200),
    reponses,
    qualites: txt(f, "qualites", 3000),
    points_faibles: txt(f, "points_faibles", 3000),
    bilan: BILANS.some((b) => b.id === bilan) ? bilan : "",
    observations: txt(f, "observations", 4000),
    prochaine_etape: txt(f, "prochaine_etape", 2000),
    partage: f.get("partage") === "on",
    updated_at: new Date().toISOString(),
  };
  const db = createAdminClient();
  const id = txt(f, "id", 60);
  if (id) {
    const { error } = await db.from("entretiens_conseil").update(ligne).eq("id", id).eq("candidat_id", candidatId);
    return error ? { erreur: "L'enregistrement a échoué." } : { id };
  }
  const { data, error } = await db.from("entretiens_conseil").insert(ligne).select("id").single();
  if (error || !data) {
    return { erreur: /entretiens_conseil/.test(error?.message ?? "") ? "La base n'est pas à jour : exécute la mise à jour SQL affichée sur la page /diagnostic." : "L'enregistrement a échoué." };
  }
  return { id: data.id };
}
