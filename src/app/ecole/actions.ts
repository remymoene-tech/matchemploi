"use server";

import { lireAttentes } from "@/lib/attentes";
import { changerAdmission } from "@/lib/admission-serveur";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigerResponsable } from "@/lib/ecoles";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, lireAnnonce } from "@/lib/ia";
import { localiserLieu } from "@/lib/geo";
import { SUIVIS_PREPARATION, genererPreparation } from "@/lib/preparation";
import { noterOffrePourTous, rechercherPourCandidat } from "@/lib/matching";
import { CONTRATS, SUIVIS, contactManquant } from "@/lib/types";
import { envoyerMessageCorrespondance, type EtatEnvoi } from "@/lib/envoi-message";
import { enregistrerEntretienConseil } from "@/lib/entretien-conseil-serveur";
import { enregistrerTest } from "@/lib/tests-serveur";
import { genererSynthese } from "@/lib/synthese";
import { genererCvAmeliore } from "@/lib/cv-ameliore";
import { ajouterEchange } from "@/lib/echanges";
import type { TestId } from "@/lib/tests";
import type { EtatTest } from "@/components/FormTests";
import type { EtatEntretien } from "@/components/FormEntretienConseil";

const t = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

/** Vérifie que l'étudiant appartient bien à l'école du responsable. */
async function etudiantDeLEcole(candidatId: string, ecoleId: string) {
  const { data } = await createAdminClient().from("candidats").select("user_id").eq("user_id", candidatId).eq("ecole_id", ecoleId).maybeSingle();
  return Boolean(data);
}

export async function changerSuiviEcole(f: FormData) {
  const { ecole } = await exigerResponsable();
  const suivi = t(f, "suivi");
  const candidat = t(f, "candidat_id");
  if (!SUIVIS.some((s) => s.id === suivi) || !(await etudiantDeLEcole(candidat, ecole.id))) return;
  const offre = t(f, "offre_id");
  await createAdminClient().from("correspondances").update({ suivi }).eq("candidat_id", candidat).eq("offre_id", offre);
  if (SUIVIS_PREPARATION.includes(suivi)) after(() => genererPreparation(candidat, offre));
  revalidatePath("/ecole");
}

export async function enregistrerOffreEcole(f: FormData) {
  const { ecole } = await exigerResponsable();
  const id = t(f, "id");
  const contrat = t(f, "contrat");
  const donnees = {
    ecole_id: ecole.id,
    source: t(f, "source") === "externe" ? "externe" : "partenaire",
    entreprise: t(f, "entreprise", 150),
    intitule: t(f, "intitule", 200),
    contrat: CONTRATS.some((c) => c.id === contrat) ? contrat : "",
    contrat_libelle: CONTRATS.find((c) => c.id === contrat)?.label ?? "",
    lieu: t(f, "lieu", 150),
    salaire: t(f, "salaire", 150),
    description: t(f, "description", 8000),
    lien: t(f, "lien", 500),
    contact_nom: t(f, "contact_nom", 150),
    contact_email: t(f, "contact_email", 150),
    contact_tel: t(f, "contact_tel", 30),
    attentes: lireAttentes(f),
    ouverte: f.get("ouverte") === "on",
    updated_at: new Date().toISOString(),
  };
  if (!donnees.entreprise || !donnees.intitule) redirect(`/ecole/offres/${id || "nouvelle"}?erreur=1`);
  if (contactManquant(donnees)) redirect(`/ecole/offres/${id || "nouvelle"}?erreur=contact`);
  const db = createAdminClient();
  const position = donnees.lieu ? await localiserLieu(donnees.lieu) : null;
  const ligne = { ...donnees, latitude: position?.latitude ?? null, longitude: position?.longitude ?? null };
  let offreId = id;
  const ecrire = async (l: Record<string, unknown>) =>
    id
      ? (await db.from("offres").update(l).eq("id", id).eq("ecole_id", ecole.id)).error // une école ne modifie que ses offres
      : await db.from("offres").insert(l).select("id").single().then(({ data, error }) => {
          if (data) offreId = data.id;
          return error;
        });
  const erreur = await ecrire(ligne);
  if (erreur && /contact_tel|attentes/.test(erreur.message)) {
    const { contact_tel: _t, attentes: _a, ...sans } = ligne;
    void _a;
    void _t;
    await ecrire(sans);
  }
  if (offreId && donnees.ouverte) after(() => noterOffrePourTous(offreId));
  redirect("/ecole?vue=entreprises&ok=1");
}

export async function supprimerOffreEcole(f: FormData) {
  const { ecole } = await exigerResponsable();
  await createAdminClient().from("offres").delete().eq("id", t(f, "id")).eq("ecole_id", ecole.id);
  redirect("/ecole?vue=entreprises");
}

export type EtatAnnonce = { erreur?: string };

export async function importerAnnonceEcole(_: EtatAnnonce, f: FormData): Promise<EtatAnnonce> {
  const { ecole } = await exigerResponsable();
  if (!iaConfiguree()) return { erreur: "La lecture automatique n'est pas disponible pour l'instant. Crée l'offre avec « Ajouter une offre »." };
  const texte = String(f.get("texte") ?? "").trim();
  if (texte.length < 80) return { erreur: "Colle le texte complet de l'annonce (le lien seul ne suffit pas)." };
  let fiche;
  try {
    fiche = await lireAnnonce(texte);
  } catch {
    return { erreur: "La lecture de l'annonce a échoué. Réessaie, ou crée l'offre à la main." };
  }
  const { data, error } = await createAdminClient()
    .from("offres")
    .insert({
      ...fiche,
      ecole_id: ecole.id,
      contrat_libelle: CONTRATS.find((c) => c.id === fiche.contrat)?.label ?? "",
      source: "externe",
      lien: t(f, "lien", 500),
      ouverte: false,
    })
    .select("id")
    .single();
  if (error || !data) return { erreur: "L'enregistrement a échoué." };
  redirect(`/ecole/offres/${data.id}?verifier=1`);
}

export async function relancerEcole() {
  const { ecole } = await exigerResponsable();
  const { data } = await createAdminClient().from("candidats").select("user_id").eq("ecole_id", ecole.id).eq("consentement", true);
  after(async () => {
    for (const c of data ?? []) await rechercherPourCandidat(c.user_id as string);
  });
  redirect("/ecole?vue=etudiants&relance=1");
}

export async function envoyerMessageEcole(_: EtatEnvoi, f: FormData): Promise<EtatEnvoi> {
  const { user, ecole } = await exigerResponsable();
  if (!(await etudiantDeLEcole(String(f.get("candidat_id")), ecole.id))) return { erreur: "Cet étudiant n'appartient pas à ton école." };
  const r = await envoyerMessageCorrespondance(f, { nom: ecole.nom, email: user.email! });
  revalidatePath("/ecole");
  return r;
}

export async function enregistrerEntretienEcole(_: EtatEntretien, f: FormData): Promise<EtatEntretien> {
  const { user, ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return { erreur: "Cet étudiant n'appartient pas à ton école." };
  const r = await enregistrerEntretienConseil(f, candidat, { email: user.email! });
  if (r.erreur) return { erreur: r.erreur };
  revalidatePath(`/ecole/etudiants/${candidat}`);
  if (!f.get("id")) redirect(`/ecole/etudiants/${candidat}/entretien/${r.id}?ok=1`);
  return { ok: "Fiche enregistrée." };
}

async function passerTestPour(test: TestId, f: FormData): Promise<EtatTest> {
  const { ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return { erreur: "Cet étudiant n'appartient pas à ton école." };
  const r = await enregistrerTest(candidat, test, f, "conseiller");
  if (r.erreur) return r;
  redirect(`/ecole/etudiants/${candidat}?onglet=suivi`);
}
export async function passerTestDiscEcole(_: EtatTest, f: FormData) { return passerTestPour("disc", f); }
export async function passerTestManagementEcole(_: EtatTest, f: FormData) { return passerTestPour("management", f); }

export async function autoriserTestEcole(f: FormData) {
  const { user, ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return;
  const test = t(f, "test", 20);
  if (!["disc", "management"].includes(test)) return;
  await createAdminClient().from("tests_autorisations").upsert({ candidat_id: candidat, test, autorise_par: user.email ?? "" });
  revalidatePath(`/ecole/etudiants/${candidat}`);
}

export async function genererSyntheseEcole(_: { erreur?: string }, f: FormData): Promise<{ erreur?: string }> {
  const { user, ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return { erreur: "Cet étudiant n'appartient pas à ton école." };
  const r = await genererSynthese(candidat, user.email ?? "");
  if (!r.erreur) revalidatePath(`/ecole/etudiants/${candidat}`);
  return r;
}

export async function genererCvAmelioreEcole(_: { erreur?: string }, f: FormData): Promise<{ erreur?: string }> {
  const { ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return { erreur: "Cet étudiant n'appartient pas à ton école." };
  const r = await genererCvAmeliore(candidat);
  if (!r.erreur) revalidatePath(`/ecole/etudiants/${candidat}`);
  return r;
}

export async function ajouterEchangeEcole(_: { erreur?: string; ok?: boolean }, f: FormData): Promise<{ erreur?: string; ok?: boolean }> {
  const { user, ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return { erreur: "Cet étudiant n'appartient pas à ton école." };
  const r = await ajouterEchange(candidat, f, user.email ?? "");
  if (r.erreur) return r;
  revalidatePath(`/ecole/etudiants/${candidat}`);
  return { ok: true };
}

export async function supprimerEchangeEcole(f: FormData) {
  const { ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return;
  await createAdminClient().from("echanges").delete().eq("id", t(f, "id", 60)).eq("candidat_id", candidat);
  revalidatePath(`/ecole/etudiants/${candidat}`);
}

export async function actionFaiteEcole(f: FormData) {
  const { ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return;
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", t(f, "id", 60)).eq("candidat_id", candidat);
  revalidatePath(`/ecole/etudiants/${candidat}`);
}

export async function changerAdmissionEcole(f: FormData) {
  const { ecole } = await exigerResponsable();
  const candidat = t(f, "candidat_id", 60);
  if (!(await etudiantDeLEcole(candidat, ecole.id))) return;
  await changerAdmission(candidat, t(f, "statut_admission", 30));
  revalidatePath(`/ecole/etudiants/${candidat}`);
}
