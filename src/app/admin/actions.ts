"use server";

import { lireAttentes } from "@/lib/attentes";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, lireAnnonce } from "@/lib/ia";
import { noterOffrePourTous, rechercheQuotidienne } from "@/lib/matching";
import { CONTRATS, SUIVIS, contactManquant } from "@/lib/types";
import { localiserLieu } from "@/lib/geo";
import { SUIVIS_PREPARATION, genererPreparation } from "@/lib/preparation";
import { genererCode } from "@/lib/ecoles";
import { envoyerMessageCorrespondance, type EtatEnvoi } from "@/lib/envoi-message";
import { enregistrerEntretienConseil } from "@/lib/entretien-conseil-serveur";
import { enregistrerTest } from "@/lib/tests-serveur";
import { genererSynthese } from "@/lib/synthese";
import { genererCvAmeliore } from "@/lib/cv-ameliore";
import { ajouterEchange } from "@/lib/echanges";
import { lireEntreprise } from "@/lib/entreprises";
import type { TestId } from "@/lib/tests";
import type { EtatTest } from "@/components/FormTests";
import type { EtatEntretien } from "@/components/FormEntretienConseil";
import { FREQUENCES, ecrireFrequence, type Frequence } from "@/lib/reglages";

const t = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

export async function changerSuivi(f: FormData) {
  await exigerAdmin();
  const suivi = t(f, "suivi");
  if (!SUIVIS.some((s) => s.id === suivi)) return;
  await createAdminClient()
    .from("correspondances")
    .update({ suivi })
    .eq("candidat_id", t(f, "candidat_id"))
    .eq("offre_id", t(f, "offre_id"));
  // Candidat positionné sur l'offre : on prépare sa fiche d'entretien
  if (SUIVIS_PREPARATION.includes(suivi)) {
    const [cand, offre] = [t(f, "candidat_id"), t(f, "offre_id")];
    after(() => genererPreparation(cand, offre));
  }
  revalidatePath("/admin");
}

export async function enregistrerOffre(f: FormData) {
  await exigerAdmin();
  const id = t(f, "id");
  const contrat = t(f, "contrat");
  const donnees = {
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
    entreprise_id: t(f, "entreprise_id", 60) || null,
    ouverte: f.get("ouverte") === "on",
    updated_at: new Date().toISOString(),
  };
  if (!donnees.entreprise || !donnees.intitule) redirect(`/admin/offres/${id || "nouvelle"}?erreur=1`);
  if (contactManquant(donnees)) redirect(`/admin/offres/${id || "nouvelle"}?erreur=contact`);
  const db = createAdminClient();
  const position = donnees.lieu ? await localiserLieu(donnees.lieu) : null;
  const avecGPS = { ...donnees, latitude: position?.latitude ?? null, longitude: position?.longitude ?? null };
  let offreId = id;
  const ecrire = async (ligne: typeof donnees) =>
    id
      ? (await db.from("offres").update(ligne).eq("id", id)).error
      : await db.from("offres").insert(ligne).select("id").single().then(({ data, error }) => {
          if (data) offreId = data.id;
          return error;
        });
  let erreur = await ecrire(avecGPS);
  if (erreur && /latitude|longitude|contact_tel|attentes|entreprise_id/.test(erreur.message)) {
    // Base pas encore à jour : on enregistre sans les colonnes récentes
    const { contact_tel: _t, attentes: _a, entreprise_id: _e, ...ancien } = donnees;
    void _t; void _a; void _e;
    erreur = await ecrire(ancien as typeof donnees);
  }
  if (donnees.ouverte) after(() => noterOffrePourTous(offreId));
  redirect(donnees.entreprise_id ? `/admin/entreprises/${donnees.entreprise_id}?onglet=offres&ok=1` : "/admin?vue=entreprises&sous=offres&ok=1");
}

export async function supprimerOffre(f: FormData) {
  await exigerAdmin();
  await createAdminClient().from("offres").delete().eq("id", t(f, "id"));
  redirect("/admin?vue=entreprises&sous=offres");
}

export type EtatAnnonce = { erreur?: string };

export async function importerAnnonce(_: EtatAnnonce, f: FormData): Promise<EtatAnnonce> {
  await exigerAdmin();
  const texte = String(f.get("texte") ?? "").trim();
  if (!iaConfiguree()) return { erreur: "La lecture automatique demande la clé IA (ANTHROPIC_API_KEY). En attendant, crée l'offre avec « Ajouter une offre »." };
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
      contrat_libelle: CONTRATS.find((c) => c.id === fiche.contrat)?.label ?? "",
      source: "externe",
      lien: t(f, "lien", 500),
      ouverte: false, // à vérifier avant publication
    })
    .select("id")
    .single();
  if (error) return { erreur: "L'enregistrement a échoué." };
  redirect(`/admin/offres/${data.id}?verifier=1`);
}

export async function relancerTout() {
  await exigerAdmin();
  after(() => rechercheQuotidienne());
  redirect("/admin?vue=candidats&relance=1");
}

export async function changerFrequence(f: FormData) {
  await exigerAdmin();
  const v = t(f, "frequence") as Frequence;
  if (!FREQUENCES.some((x) => x.id === v)) return;
  const ok = await ecrireFrequence(v);
  redirect(`/admin?vue=reglages&${ok ? "ok=1" : "erreur=1"}`);
}

export async function creerEcole(f: FormData) {
  await exigerAdmin();
  const nom = t(f, "nom", 120);
  const email = t(f, "email", 150).toLowerCase();
  if (!nom) redirect("/admin?vue=ecoles&erreur=nom");
  const db = createAdminClient();
  const { data: ecole, error } = await db.from("ecoles").insert({ nom, code: genererCode(nom) }).select("id").single();
  if (error || !ecole) redirect("/admin?vue=ecoles&erreur=table");
  if (email.includes("@")) await db.from("responsables").upsert({ email, ecole_id: ecole.id, nom: t(f, "responsable", 120) });
  redirect("/admin?vue=ecoles&ok=1");
}

export async function ajouterResponsable(f: FormData) {
  await exigerAdmin();
  const email = t(f, "email", 150).toLowerCase();
  if (!email.includes("@")) redirect("/admin?vue=ecoles&erreur=email");
  await createAdminClient().from("responsables").upsert({ email, ecole_id: t(f, "ecole_id"), nom: t(f, "nom", 120) });
  redirect("/admin?vue=ecoles&ok=1");
}

export async function retirerResponsable(f: FormData) {
  await exigerAdmin();
  await createAdminClient().from("responsables").delete().eq("email", t(f, "email", 150));
  redirect("/admin?vue=ecoles");
}

export async function envoyerMessageAdmin(_: EtatEnvoi, f: FormData): Promise<EtatEnvoi> {
  const { user } = await exigerAdmin();
  const r = await envoyerMessageCorrespondance(f, { nom: process.env.NOM_EXPEDITEUR || "L'équipe MagnusMatch", email: user.email! });
  revalidatePath("/admin");
  return r;
}

export async function enregistrerEntretienAdmin(_: EtatEntretien, f: FormData): Promise<EtatEntretien> {
  const { user } = await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  const r = await enregistrerEntretienConseil(f, candidat, { email: user.email! });
  if (r.erreur) return { erreur: r.erreur };
  revalidatePath(`/admin/candidats/${candidat}`);
  if (!f.get("id")) redirect(`/admin/candidats/${candidat}/entretien/${r.id}?ok=1`);
  return { ok: "Fiche enregistrée." };
}

async function passerTestPour(test: TestId, f: FormData): Promise<EtatTest> {
  await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  const r = await enregistrerTest(candidat, test, f, "conseiller");
  if (r.erreur) return r;
  redirect(`/admin/candidats/${candidat}?onglet=suivi`);
}
export async function passerTestDiscAdmin(_: EtatTest, f: FormData) { return passerTestPour("disc", f); }
export async function passerTestManagementAdmin(_: EtatTest, f: FormData) { return passerTestPour("management", f); }

export async function autoriserTestAdmin(f: FormData) {
  const { user } = await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  const test = t(f, "test", 20);
  if (!["disc", "management"].includes(test)) return;
  await createAdminClient().from("tests_autorisations").upsert({ candidat_id: candidat, test, autorise_par: user.email ?? "" });
  revalidatePath(`/admin/candidats/${candidat}`);
}

export async function genererSyntheseAdmin(_: { erreur?: string }, f: FormData): Promise<{ erreur?: string }> {
  const { user } = await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  const r = await genererSynthese(candidat, user.email ?? "");
  if (!r.erreur) revalidatePath(`/admin/candidats/${candidat}`);
  return r;
}

export async function genererCvAmelioreAdmin(_: { erreur?: string }, f: FormData): Promise<{ erreur?: string }> {
  await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  const r = await genererCvAmeliore(candidat);
  if (!r.erreur) revalidatePath(`/admin/candidats/${candidat}`);
  return r;
}

export async function ajouterEchangeAdmin(_: { erreur?: string; ok?: boolean }, f: FormData): Promise<{ erreur?: string; ok?: boolean }> {
  const { user } = await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  const r = await ajouterEchange(candidat, f, user.email ?? "");
  if (r.erreur) return r;
  revalidatePath(`/admin/candidats/${candidat}`);
  return { ok: true };
}

export async function supprimerEchangeAdmin(f: FormData) {
  await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  await createAdminClient().from("echanges").delete().eq("id", t(f, "id", 60)).eq("candidat_id", candidat);
  revalidatePath(`/admin/candidats/${candidat}`);
}

export async function actionFaiteAdmin(f: FormData) {
  await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", t(f, "id", 60)).eq("candidat_id", candidat);
  revalidatePath(`/admin/candidats/${candidat}`);
}

/* ---------- Mes entreprises ---------- */
export async function enregistrerEntreprise(f: FormData) {
  const { user } = await exigerAdmin();
  const id = t(f, "id", 60);
  const donnees = lireEntreprise(f);
  if (!donnees.nom) redirect(`/admin/entreprises/${id || "nouvelle"}?erreur=nom`);
  const db = createAdminClient();
  if (id) {
    const { error } = await db.from("entreprises").update(donnees).eq("id", id);
    if (error) redirect(`/admin/entreprises/${id}?erreur=base`);
    redirect(`/admin/entreprises/${id}?ok=1`);
  }
  const { data, error } = await db.from("entreprises").insert({ ...donnees, auteur: user.email ?? "" }).select("id").single();
  if (error || !data) redirect("/admin/entreprises/nouvelle?erreur=base");
  redirect(`/admin/entreprises/${data.id}?ok=1`);
}

export async function supprimerEntreprise(f: FormData) {
  await exigerAdmin();
  await createAdminClient().from("entreprises").delete().eq("id", t(f, "id", 60));
  redirect("/admin?vue=entreprises");
}

export async function ajouterEchangeEntreprise(_: { erreur?: string; ok?: boolean }, f: FormData): Promise<{ erreur?: string; ok?: boolean }> {
  const { user } = await exigerAdmin();
  const id = t(f, "entreprise_id", 60);
  const r = await ajouterEchange({ entreprise: id }, f, user.email ?? "");
  if (r.erreur) return r;
  revalidatePath(`/admin/entreprises/${id}`);
  return { ok: true };
}

export async function supprimerEchangeEntreprise(f: FormData) {
  await exigerAdmin();
  const id = t(f, "entreprise_id", 60);
  await createAdminClient().from("echanges").delete().eq("id", t(f, "id", 60)).eq("entreprise_id", id);
  revalidatePath(`/admin/entreprises/${id}`);
}

export async function actionFaiteEntreprise(f: FormData) {
  await exigerAdmin();
  const id = t(f, "entreprise_id", 60);
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", t(f, "id", 60)).eq("entreprise_id", id);
  revalidatePath(`/admin/entreprises/${id}`);
}
