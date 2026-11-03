"use server";

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
  if (erreur && /latitude|longitude|contact_tel/.test(erreur.message)) {
    // Base pas encore à jour : on enregistre sans les colonnes récentes
    const { contact_tel: _t, ...ancien } = donnees;
    void _t;
    erreur = await ecrire(ancien as typeof donnees);
  }
  if (donnees.ouverte) after(() => noterOffrePourTous(offreId));
  redirect("/admin?vue=offres&ok=1");
}

export async function supprimerOffre(f: FormData) {
  await exigerAdmin();
  await createAdminClient().from("offres").delete().eq("id", t(f, "id"));
  redirect("/admin?vue=offres");
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
  const r = await envoyerMessageCorrespondance(f, { nom: process.env.NOM_EXPEDITEUR || "L'équipe Jobaprox", email: user.email! });
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
