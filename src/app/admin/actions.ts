"use server";

import { lireAttentes } from "@/lib/attentes";
import { estExpiree, lireExpiration } from "@/lib/expiration";

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
import { STATUTS_ENTREPRISE, lireEntreprise } from "@/lib/entreprises";
import { entrepriseRecrute, genererFicheOffre, lancerRechercheCandidats, preparerFicheDePoste } from "@/lib/recherche-entreprise";
import { lireFormations } from "@/lib/formations";
import { STATUTS_LEAD, brochurePour, envoyerBrochure, envoyerInvitation, estLeadAdmis, leadParId } from "@/lib/leads";
import { changerAdmission } from "@/lib/admission-serveur";
import { majDiplome } from "@/lib/diplome-serveur";
import { memeEntreprise } from "@/lib/prospections";
import { VALIDITE_JOURS, nouveauJeton } from "@/lib/fiche-besoin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
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
    expire_le: null as string | null,
    redigee_ia: false, // relue et enregistrée par l'équipe
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { data: avant } = await createAdminClient().from("offres").select("*").eq("id", id).maybeSingle();
    donnees.expire_le = lireExpiration(f, avant?.expire_le);
    // Texte modifié à la main : la fiche imprimable reprend ce texte au lieu de la rédaction de MagnusMatch
    if (avant?.fiche && (avant.description ?? "").trim() !== donnees.description.trim()) Object.assign(donnees, { fiche: null });
  } else donnees.expire_le = lireExpiration(f, null);
  if (estExpiree(donnees)) donnees.ouverte = false;
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
  if (erreur && /latitude|longitude|contact_tel|attentes|entreprise_id|expire_le|redigee_ia/.test(erreur.message)) {
    // Base pas encore à jour : on enregistre sans les colonnes récentes
    const { contact_tel: _t, attentes: _a, entreprise_id: _e, expire_le: _x, redigee_ia: _r, ...ancien } = donnees;
    void _t; void _a; void _e; void _x; void _r;
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
  // Base pas encore à jour pour le questionnaire : on enregistre sans lui
  const sansQuestionnaire = () => { const { attentes: _a, ...reste } = donnees; void _a; return reste; };
  const { data: avantE } = id ? await db.from("entreprises").select("statut").eq("id", id).maybeSingle() : { data: null };
  const devientRecrute = donnees.statut === "recrute" && avantE?.statut !== "recrute";
  if (id) {
    let { error } = await db.from("entreprises").update(donnees).eq("id", id);
    if (error && /attentes/.test(error.message)) ({ error } = await db.from("entreprises").update(sansQuestionnaire()).eq("id", id));
    if (error) redirect(`/admin/entreprises/${id}?erreur=base`);
    // Besoin rempli et l'entreprise recrute : MagnusMatch cherche les candidats tout de suite
    if (devientRecrute || (donnees.attentes && (await entrepriseRecrute({ id, nom: donnees.nom, statut: donnees.statut })))) {
      after(() => lancerRechercheCandidats(id).then(() => undefined));
      redirect(`/admin/entreprises/${id}?onglet=candidats&recherche=1`);
    }
    redirect(`/admin/entreprises/${id}?ok=1`);
  }
  let { data, error } = await db.from("entreprises").insert({ ...donnees, auteur: user.email ?? "" }).select("id").single();
  if (error && /attentes/.test(error.message)) ({ data, error } = await db.from("entreprises").insert({ ...sansQuestionnaire(), auteur: user.email ?? "" }).select("id").single());
  if (error || !data) redirect("/admin/entreprises/nouvelle?erreur=base");
  if (devientRecrute || (donnees.attentes && (await entrepriseRecrute({ id: data.id, nom: donnees.nom, statut: donnees.statut })))) {
    after(() => lancerRechercheCandidats(data.id).then(() => undefined));
    redirect(`/admin/entreprises/${data.id}?onglet=candidats&recherche=1`);
  }
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

export async function changerAdmissionAdmin(f: FormData) {
  await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  const statut = t(f, "statut_admission", 30);
  const r = await changerAdmission(candidat, statut, t(f, "motif_admission", 1000));
  // Abandon sans motif (ex. depuis le tableau) : on ouvre la fiche pour saisir le motif
  if (r.erreur === "motif") redirect(`/admin/candidats/${candidat}?admission=${statut}#admission`);
  revalidatePath(`/admin/candidats/${candidat}`);
  revalidatePath("/admin");
}

/* ---------- Formations des écoles ---------- */
export async function ajouterFormation(f: FormData) {
  await exigerAdmin();
  const id = t(f, "ecole_id", 60);
  const nom = t(f, "nom", 120);
  const duree = Math.max(1, Math.min(5, Number(f.get("duree")) || 1));
  const alternance = f.getAll("alternance").map(Number).filter((n) => n >= 1 && n <= duree);
  if (!id || !nom) redirect("/admin?vue=ecoles");
  const db = createAdminClient();
  const { data } = await db.from("ecoles").select("formations").eq("id", id).maybeSingle();
  const avant = lireFormations(data?.formations);
  const brochure = avant.find((x) => x.nom.toLowerCase() === nom.toLowerCase())?.brochure ?? null;
  const liste = avant.filter((x) => x.nom.toLowerCase() !== nom.toLowerCase());
  await db.from("ecoles").update({ formations: [...liste, { nom, duree, alternance, brochure }] }).eq("id", id);
  redirect("/admin?vue=ecoles&ok=1");
}

export async function retirerFormation(f: FormData) {
  await exigerAdmin();
  const id = t(f, "ecole_id", 60);
  const nom = t(f, "nom", 120);
  const db = createAdminClient();
  const { data } = await db.from("ecoles").select("formations").eq("id", id).maybeSingle();
  await db.from("ecoles").update({ formations: lireFormations(data?.formations).filter((x) => x.nom !== nom) }).eq("id", id);
  redirect("/admin?vue=ecoles");
}

export async function changerDiplomeAdmin(f: FormData) {
  await exigerAdmin();
  const candidat = t(f, "candidat_id", 60);
  await majDiplome(candidat, f);
  revalidatePath(`/admin/candidats/${candidat}`);
}

/** Entreprise prospectée par un étudiant → « Mes entreprises » (ou rattachée à la fiche existante du même nom). */
export async function ajouterProspectionAuxEntreprises(f: FormData) {
  const { user } = await exigerAdmin();
  const db = createAdminClient();
  const { data: p } = await db.from("prospections").select("*").eq("id", t(f, "prospection_id", 60)).maybeSingle();
  if (!p) return;
  const { data: toutes } = await db.from("entreprises").select("id, nom");
  let entrepriseId = (toutes ?? []).find((e) => memeEntreprise(e.nom, p.entreprise))?.id as string | undefined;
  if (!entrepriseId) {
    const { data } = await db.from("entreprises").insert({
      nom: p.entreprise, ville: p.ville ?? "", contact_nom: p.contact_nom ?? "", contact_tel: p.contact_tel ?? "", contact_email: p.contact_email ?? "",
      statut: p.recrute === "oui" ? "en_discussion" : "rencontree", origine: "Autre",
      notes: `Prospectée par un étudiant. ${p.recrute === "oui" ? "Recrute" : "Ne recrute pas"} : ${p.justification ?? ""}`.trim(),
      auteur: user.email ?? "",
    }).select("id").single();
    entrepriseId = data?.id;
  }
  if (!entrepriseId) return;
  // Toutes les prospections d'étudiants pour cette entreprise sont rattachées à la fiche
  const { data: memes } = await db.from("prospections").select("id, entreprise").is("entreprise_id", null);
  const ids = (memes ?? []).filter((x) => memeEntreprise(x.entreprise, p.entreprise)).map((x) => x.id);
  if (ids.length) await db.from("prospections").update({ entreprise_id: entrepriseId }).in("id", ids);
  revalidatePath(`/admin/candidats/${t(f, "candidat_id", 60)}`);
  // Elle recrute d'après l'étudiant : MagnusMatch rédige déjà une fiche de poste
  if (p.recrute === "oui") { const eid = entrepriseId; after(() => lancerRechercheCandidats(eid).then(() => undefined)); }
  // On ouvre la fiche entreprise sur la fiche besoin, à remplir avec l'entreprise
  redirect(`/admin/entreprises/${entrepriseId}?besoins=1#besoins`);
}

/** Envoie à l'entreprise un lien personnel pour remplir sa fiche besoin elle-même. */
export async function envoyerFicheBesoin(f: FormData) {
  const { user } = await exigerAdmin();
  const id = t(f, "id", 60);
  const db = createAdminClient();
  const { data: e } = await db.from("entreprises").select("*").eq("id", id).maybeSingle();
  if (!e) redirect("/admin?vue=entreprises");
  const jeton = nouveauJeton();
  const { error } = await db.from("entreprises").update({ jeton_besoin: jeton, besoin_envoye_le: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin/entreprises/${id}?erreur=base`);
  const lien = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/besoin/${jeton}`;
  let envoye = false;
  if (e.contact_email && moyenEnvoi() && f.get("par_email") === "1") {
    envoye = await envoyerEmail(e.contact_email, `${e.nom} : vos besoins en alternance (2 minutes)`, texteEnHtml(
      `Bonjour ${e.contact_nom || ""},\n\nPour vous présenter les étudiants de Magnus Campus qui correspondent vraiment à vos besoins, pouvez-vous remplir cette courte fiche (2 minutes, quelques cases à cocher) ?\n\n${lien}\n\nCe lien est personnel et valable ${VALIDITE_JOURS} jours.\n\nMerci beaucoup,\n${user.email ?? "L'équipe Magnus Campus"}`,
    ), { repondreA: user.email ?? undefined });
    if (envoye) await db.from("echanges").insert({ entreprise_id: id, type: "email", resume: `Fiche besoin envoyée par email à ${e.contact_email}.`, auteur: user.email ?? "" });
  }
  revalidatePath(`/admin/entreprises/${id}`);
  redirect(`/admin/entreprises/${id}?besoin=${envoye ? "envoye" : "lien"}#besoins`);
}

/**
 * Entreprise qui recrute : MagnusMatch cherche les étudiants à 70 % et plus.
 * Sans offre ouverte, on crée un « besoin de recrutement » (offre interne, invisible des étudiants)
 * à partir de la fiche besoin et des notes, puis tous les étudiants admis sont notés en arrière-plan.
 */
export async function chercherCandidatsEntreprise(f: FormData) {
  await exigerAdmin();
  const id = t(f, "id", 60);
  after(() => lancerRechercheCandidats(id).then(() => undefined));
  redirect(`/admin/entreprises/${id}?onglet=candidats&recherche=1`);
}

export async function changerStatutEntreprise(f: FormData) {
  await exigerAdmin();
  const statut = t(f, "statut", 30);
  if (!STATUTS_ENTREPRISE.some((x) => x.id === statut)) return;
  const id = t(f, "id", 60);
  const { data: avant } = await createAdminClient().from("entreprises").select("statut").eq("id", id).maybeSingle();
  await createAdminClient().from("entreprises").update({ statut, updated_at: new Date().toISOString() }).eq("id", id);
  // Elle recrute : MagnusMatch rédige la fiche de poste et cherche les candidats
  if (statut === "recrute" && avant?.statut !== "recrute") after(() => lancerRechercheCandidats(id).then(() => undefined));
  revalidatePath("/admin");
}

/** Bouton « Générer la fiche de poste » d'une offre : MagnusMatch la rédige, puis on l'ouvre en version imprimable. */
export async function genererFicheDePosteOffre(f: FormData) {
  await exigerAdmin();
  const offre = t(f, "offre_id", 60);
  const retour = t(f, "retour", 300) || "/admin?vue=entreprises&sous=offres";
  const r = await genererFicheOffre(offre);
  if (r.erreur) redirect(`${retour}${retour.includes("?") ? "&" : "?"}erreur=fiche-${r.erreur}`);
  redirect(`/admin/offres/${offre}/fiche`);
}

/** Entreprise qui recrute sans aucune offre : MagnusMatch crée l'offre et sa fiche de poste. */
export async function genererFicheDePosteEntreprise(f: FormData) {
  await exigerAdmin();
  const id = t(f, "id", 60);
  const o = await preparerFicheDePoste(id, f.get("forcer") === "1");
  if (!o) redirect(`/admin/entreprises/${id}?onglet=offres&erreur=fiche-base`);
  after(() => noterOffrePourTous(o.id));
  if (!("fiche" in o)) redirect(`/admin/entreprises/${id}?onglet=offres&erreur=fiche-base`);
  if (!(o as { fiche?: unknown }).fiche) redirect(`/admin/entreprises/${id}?onglet=offres&erreur=fiche-ia`);
  redirect(`/admin/offres/${o.id}/fiche`);
}

/* ---------- Brochures (téléchargées par les leads) ---------- */
export async function preparerDepotBrochure(ecoleId: string, formation: string): Promise<{ chemin: string; jeton: string } | { erreur: string }> {
  await exigerAdmin();
  const slug = (formation || "generale").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  const chemin = `${ecoleId}/${slug}-${Date.now()}.pdf`;
  const { data, error } = await createAdminClient().storage.from("brochures").createSignedUploadUrl(chemin);
  if (error || !data) return { erreur: "Le dépôt n'est pas encore activé : exécute la mise à jour SQL de la page /diagnostic." };
  return { chemin: data.path, jeton: data.token };
}

export async function enregistrerBrochure(ecoleId: string, formation: string, chemin: string | null): Promise<{ erreur?: string }> {
  await exigerAdmin();
  const db = createAdminClient();
  const { data: e } = await db.from("ecoles").select("*").eq("id", ecoleId).maybeSingle();
  if (!e) return { erreur: "École introuvable." };
  const { error } = formation
    ? await db.from("ecoles").update({ formations: lireFormations(e.formations).map((x) => (x.nom === formation ? { ...x, brochure: chemin } : x)) }).eq("id", ecoleId)
    : await db.from("ecoles").update({ brochure: chemin }).eq("id", ecoleId);
  if (error) return { erreur: "Enregistrement impossible : exécute la mise à jour SQL de la page /diagnostic." };
  revalidatePath("/admin");
  return {};
}

/* ---------- Leads (CRM) ---------- */
function lireLead(f: FormData) {
  const statut = t(f, "statut", 30);
  const a = Number(f.get("annee_rentree"));
  return {
    prenom: t(f, "prenom", 80), nom: t(f, "nom", 80), email: t(f, "email", 150).toLowerCase(), telephone: t(f, "telephone", 30),
    formation: t(f, "formation", 120), annee_rentree: Number.isInteger(a) && a >= 2020 && a <= 2100 ? a : null,
    origine: t(f, "origine", 60) || "Autre",
    statut: STATUTS_LEAD.some((x) => x.id === statut) ? statut : "nouveau",
    notes: t(f, "notes", 4000),
    updated_at: new Date().toISOString(),
  };
}

export async function enregistrerLead(f: FormData) {
  await exigerAdmin();
  const id = t(f, "id", 60);
  const d = lireLead(f);
  if (!d.email && !d.telephone && !d.nom) redirect(`/admin/leads/${id || "nouveau"}?erreur=champs`);
  const db = createAdminClient();
  if (id) {
    const avant = await leadParId(id);
    const { error } = await db.from("leads").update(d).eq("id", id);
    if (error) redirect(`/admin/leads/${id}?erreur=base`);
    if (d.statut === "admis" && avant && !estLeadAdmis(avant) && !avant.candidat_id) {
      const ok = await envoyerInvitation({ ...avant, ...d });
      redirect(`/admin/leads/${id}?${ok ? "invitation=1" : "ok=1"}`);
    }
    redirect(`/admin/leads/${id}?ok=1`);
  }
  const { data, error } = await db.from("leads").insert({ ...d, consentement: f.get("consentement") === "on" }).select("id").single();
  if (error || !data) redirect("/admin/leads/nouveau?erreur=base");
  redirect(`/admin/leads/${data.id}?ok=1`);
}

export async function changerStatutLead(f: FormData) {
  await exigerAdmin();
  const statut = t(f, "statut", 30);
  if (!STATUTS_LEAD.some((x) => x.id === statut)) return;
  const id = t(f, "id", 60);
  const avant = await leadParId(id);
  await createAdminClient().from("leads").update({ statut, updated_at: new Date().toISOString() }).eq("id", id);
  // Accepté à l'entretien : il reçoit son lien pour créer son espace
  if (statut === "admis" && avant && !estLeadAdmis(avant) && !avant.candidat_id) after(() => envoyerInvitation(avant).then(() => undefined));
  revalidatePath("/admin");
}

export async function renvoyerInvitation(f: FormData) {
  await exigerAdmin();
  const id = t(f, "id", 60);
  const l = await leadParId(id);
  if (!l) redirect("/admin?vue=leads");
  const ok = await envoyerInvitation(l);
  redirect(`/admin/leads/${id}?${ok ? "invitation=1" : "erreur=email"}`);
}

export async function supprimerLead(f: FormData) {
  await exigerAdmin();
  await createAdminClient().from("leads").delete().eq("id", t(f, "id", 60));
  redirect("/admin?vue=leads");
}

export async function renvoyerBrochure(f: FormData) {
  await exigerAdmin();
  const id = t(f, "id", 60);
  const l = await leadParId(id);
  if (!l) redirect("/admin?vue=leads");
  const lien = await brochurePour(l.formation, l.ecole_id);
  if (!lien) redirect(`/admin/leads/${id}?erreur=brochure`);
  const ok = await envoyerBrochure(l, lien);
  if (ok) await createAdminClient().from("echanges").insert({ lead_id: id, type: "email", resume: `Brochure ${l.formation} envoyée par email.`, auteur: "" });
  redirect(`/admin/leads/${id}?${ok ? "brochure=1" : "erreur=email"}`);
}

export async function ajouterEchangeLead(_: { erreur?: string; ok?: boolean }, f: FormData): Promise<{ erreur?: string; ok?: boolean }> {
  const { user } = await exigerAdmin();
  const id = t(f, "lead_id", 60);
  const r = await ajouterEchange({ lead: id }, f, user.email ?? "");
  if (r.erreur) return r;
  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}

export async function supprimerEchangeLead(f: FormData) {
  await exigerAdmin();
  const id = t(f, "lead_id", 60);
  await createAdminClient().from("echanges").delete().eq("id", t(f, "id", 60)).eq("lead_id", id);
  revalidatePath(`/admin/leads/${id}`);
}

export async function actionFaiteLead(f: FormData) {
  await exigerAdmin();
  const id = t(f, "lead_id", 60);
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", t(f, "id", 60)).eq("lead_id", id);
  revalidatePath(`/admin/leads/${id}`);
}
