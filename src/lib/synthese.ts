import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, redigerSynthese, type Synthese } from "@/lib/ia";
import { BILANS, SECTIONS, type EntretienConseil } from "@/lib/entretien-conseil";
import { COULEURS, STYLES } from "@/lib/tests";
import { derniersTests } from "@/lib/tests-serveur";
import type { Candidat } from "@/lib/types";

export type SyntheseEnregistree = { contenu: Synthese; created_at: string; genere_par: string };

/** Ce qui manque encore avant de pouvoir faire la synthèse. */
export async function etatSynthese(candidatId: string) {
  const db = createAdminClient();
  const [{ data: e }, tests, { data: s }] = await Promise.all([
    db.from("entretiens_conseil").select("id").eq("candidat_id", candidatId).limit(1),
    derniersTests(candidatId),
    db.from("syntheses_candidat").select("contenu, created_at, genere_par").eq("candidat_id", candidatId).maybeSingle(),
  ]);
  return {
    entretien: Boolean(e?.length),
    disc: Boolean(tests.disc),
    management: Boolean(tests.management),
    synthese: (s as SyntheseEnregistree | null) ?? null,
  };
}

function entretienEnTexte(e: EntretienConseil) {
  const lignes: string[] = [`Date : ${e.date_entretien} · Formation : ${e.formation} · Zone : ${e.zone}`];
  for (const s of SECTIONS) {
    lignes.push(`\n${s.titre}`);
    for (const it of s.items) {
      const r = e.reponses[it.id];
      if (s.type === "cases") lignes.push(`- [${r?.coche || r?.reponse === "Oui" ? "x" : " "}] ${it.label}${r?.precision ? ` (${r.precision})` : ""}`);
      else lignes.push(`- ${it.label} ${r?.reponse ?? "Non renseigné"}${r?.precision ? ` (${r.precision})` : ""}`);
    }
  }
  lignes.push(`\nAutres qualités : ${e.qualites || "—"}`, `Autres points à travailler : ${e.points_faibles || "—"}`);
  lignes.push(`Bilan : ${BILANS.find((b) => b.id === e.bilan)?.label ?? "—"}`, `Observations : ${e.observations || "—"}`, `Prochaine étape : ${e.prochaine_etape || "—"}`);
  return lignes.join("\n");
}

/** Rédige la synthèse globale (entretien le plus récent + tests + profil) et l'enregistre. */
export async function genererSynthese(candidatId: string, par: string): Promise<{ erreur?: string }> {
  if (!iaConfiguree()) return { erreur: "La rédaction automatique n'est pas disponible pour l'instant." };
  const db = createAdminClient();
  const [{ data: c }, { data: ents }, tests] = await Promise.all([
    db.from("candidats").select("*").eq("user_id", candidatId).single<Candidat>(),
    db.from("entretiens_conseil").select("*").eq("candidat_id", candidatId).order("date_entretien", { ascending: false }).limit(1),
    derniersTests(candidatId),
  ]);
  const e = (ents?.[0] ?? null) as EntretienConseil | null;
  const manque = [!e && "l'entretien", !tests.disc && "le test DISC", !tests.management && "le test de management"].filter(Boolean);
  if (!c || manque.length) return { erreur: `Il manque encore : ${manque.join(", ")}.` };

  const [dom, sec] = tests.disc!.dominante.split(",");
  const disc = `Scores sur 15 : ${COULEURS.map((x) => `${x.nom} ${tests.disc!.scores[x.id] ?? 0}`).join(", ")}. Dominante ${COULEURS.find((x) => x.id === dom)?.nom}, secondaire ${COULEURS.find((x) => x.id === sec)?.nom}.`;
  const management = `Scores sur 40 (total 100) : ${STYLES.map((x) => `${x.nom} ${tests.management!.scores[x.id] ?? 0}`).join(", ")}. Style dominant : ${STYLES.find((x) => x.id === tests.management!.dominante)?.nom}.`;
  try {
    const contenu = await redigerSynthese(c, entretienEnTexte(e!), disc, management);
    const { error } = await db.from("syntheses_candidat").upsert({ candidat_id: candidatId, contenu, genere_par: par, created_at: new Date().toISOString() });
    if (error) return { erreur: /syntheses_candidat/.test(error.message) ? "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." : "L'enregistrement a échoué." };
    return {};
  } catch (err) {
    console.error("Synthèse impossible", err);
    return { erreur: "La rédaction a échoué. Réessaie dans quelques minutes." };
  }
}

/** Version « étudiant » de la synthèse (jamais la version équipe). */
export async function syntheseEtudiant(candidatId: string) {
  const { data } = await createAdminClient().from("syntheses_candidat").select("contenu, created_at").eq("candidat_id", candidatId).maybeSingle();
  if (!data) return null;
  return { ...(data.contenu as Synthese).etudiant, created_at: data.created_at as string };
}

/* ---------- Autorisations pour repasser un test ---------- */

export async function peutPasserTest(candidatId: string, test: string) {
  const db = createAdminClient();
  const [{ data: deja }, { data: auto }] = await Promise.all([
    db.from("tests_resultats").select("id").eq("candidat_id", candidatId).eq("test", test).limit(1),
    db.from("tests_autorisations").select("test").eq("candidat_id", candidatId).eq("test", test).maybeSingle(),
  ]);
  return { dejaPasse: Boolean(deja?.length), autorise: Boolean(auto), peut: !deja?.length || Boolean(auto) };
}
