import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTIONS_DISC, SERIES_MANAGEMENT, calculerDisc, calculerManagement, type ResultatDisc, type TestId } from "@/lib/tests";
import type { Candidat } from "@/lib/types";

/** Lit les réponses du formulaire, calcule le résultat et l'enregistre. */
export async function enregistrerTest(candidatId: string, test: TestId, f: FormData, passePar: "candidat" | "conseiller"): Promise<{ erreur?: string }> {
  let reponses: unknown, scores: Record<string, number>, dominante: string;
  if (test === "disc") {
    const r = QUESTIONS_DISC.map((_, i) => String(f.get(`q${i}`) ?? ""));
    const manquantes = r.map((x, i) => (["a", "b", "c", "d"].includes(x) ? 0 : i + 1)).filter(Boolean);
    if (manquantes.length) return { erreur: `Réponds à toutes les questions (il manque : ${manquantes.join(", ")}).` };
    const res = calculerDisc(r);
    reponses = r; scores = res.scores; dominante = `${res.dominante},${res.secondaire}`;
  } else {
    const cl = SERIES_MANAGEMENT.map((s, i) => s.phrases.map((_, j) => Number(f.get(`s${i}_${j}`))));
    const res = calculerManagement(cl);
    if (!res) return { erreur: "Dans chaque série, utilise une fois chaque chiffre de 1 à 4 (4 = te ressemble le plus)." };
    reponses = cl; scores = res.scores; dominante = res.dominant;
  }
  const { error } = await createAdminClient().from("tests_resultats").insert({ candidat_id: candidatId, test, reponses, scores, dominante, passe_par: passePar });
  if (error) return { erreur: /tests_resultats/.test(error.message) ? "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." : "L'enregistrement a échoué." };
  return {};
}

/** Dernier résultat de chaque test pour un candidat. */
export async function derniersTests(candidatId: string) {
  const { data } = await createAdminClient().from("tests_resultats").select("*").eq("candidat_id", candidatId).order("created_at", { ascending: false });
  const rows = (data ?? []) as { test: TestId; scores: Record<string, number>; dominante: string; passe_par: string; created_at: string }[];
  return { disc: rows.find((r) => r.test === "disc") ?? null, management: rows.find((r) => r.test === "management") ?? null };
}

/** Ajoute au candidat son dernier profil DISC (utilisé par l'IA pour affiner les notes). */
export async function avecDisc(c: Candidat): Promise<Candidat> {
  const { data } = await createAdminClient().from("tests_resultats").select("scores, dominante").eq("candidat_id", c.user_id).eq("test", "disc").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return c;
  const [dominante, secondaire] = String(data.dominante).split(",");
  return { ...c, disc: { scores: data.scores, dominante, secondaire } as ResultatDisc };
}
