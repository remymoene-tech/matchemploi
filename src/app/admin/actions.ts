"use server";

import { lireAttentes } from "@/lib/attentes";
import { estExpiree, lireExpiration } from "@/lib/expiration";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigerAcces, exigerSuperAdmin } from "@/lib/auth";
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
import { nouveauCode } from "@/lib/evenements";
import { STATUTS_LEAD, dateEntretienTexte, datesEtapes, brochurePour, envoyerBrochure, envoyerConvocation, envoyerInvitation, estLeadAdmis, leadParId, nomLead, parisVersISO } from "@/lib/leads";
import { changerAdmission } from "@/lib/admission-serveur";
import { majDiplome } from "@/lib/diplome-serveur";
import { memeEntreprise } from "@/lib/prospections";
import { VALIDITE_JOURS, nouveauJeton } from "@/lib/fiche-besoin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
import type { TestId } from "@/lib/tests";
import type { EtatTest } from "@/components/FormTests";
import type { EtatEntretien } from "@/components/FormEntretienConseil";
import { FREQUENCES, ecrireFrequence, type Frequence } from "@/lib/reglages";
import { toutLire } from "@/lib/tout-lire";

const t = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

export async function changerSuivi(f: FormData) {
  await exigerAcces("entreprises", "candidats");
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
  await exigerAcces("entreprises");
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
  await exigerSuperAdmin();
  await createAdminClient().from("offres").delete().eq("id", t(f, "id"));
  redirect("/admin?vue=entreprises&sous=offres");
}

export type EtatAnnonce = { erreur?: string };

export async function importerAnnonce(_: EtatAnnonce, f: FormData): Promise<EtatAnnonce> {
  await exigerAcces("entreprises");
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
  await exigerAcces("candidats", "alumni");
  after(() => rechercheQuotidienne());
  redirect("/admin?vue=candidats&relance=1");
}

export async function changerFrequence(f: FormData) {
  await exigerSuperAdmin();
  const v = t(f, "frequence") as Frequence;
  if (!FREQUENCES.some((x) => x.id === v)) return;
  const ok = await ecrireFrequence(v);
  redirect(`/admin?vue=reglages&${ok ? "ok=1" : "erreur=1"}`);
}

export async function creerEcole(f: FormData) {
  await exigerSuperAdmin();
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
  await exigerSuperAdmin();
  const email = t(f, "email", 150).toLowerCase();
  if (!email.includes("@")) redirect("/admin?vue=ecoles&erreur=email");
  await createAdminClient().from("responsables").upsert({ email, ecole_id: t(f, "ecole_id"), nom: t(f, "nom", 120) });
  redirect("/admin?vue=ecoles&ok=1");
}

export async function retirerResponsable(f: FormData) {
  await exigerSuperAdmin();
  await createAdminClient().from("responsables").delete().eq("email", t(f, "email", 150));
  redirect("/admin?vue=ecoles");
}

export async function envoyerMessageAdmin(_: EtatEnvoi, f: FormData): Promise<EtatEnvoi> {
  const { user } = await exigerAcces("candidats", "alumni");
  const r = await envoyerMessageCorrespondance(f, { nom: process.env.NOM_EXPEDITEUR || "L'équipe MagnusMatch", email: user.email! });
  revalidatePath("/admin");
  return r;
}

export async function enregistrerEntretienAdmin(_: EtatEntretien, f: FormData): Promise<EtatEntretien> {
  const { user } = await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const r = await enregistrerEntretienConseil(f, candidat, { email: user.email! });
  if (r.erreur) return { erreur: r.erreur };
  revalidatePath(`/admin/candidats/${candidat}`);
  if (!f.get("id")) redirect(`/admin/candidats/${candidat}/entretien/${r.id}?ok=1`);
  return { ok: "Fiche enregistrée." };
}

async function passerTestPour(test: TestId, f: FormData): Promise<EtatTest> {
  await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const r = await enregistrerTest(candidat, test, f, "conseiller");
  if (r.erreur) return r;
  redirect(`/admin/candidats/${candidat}?onglet=suivi`);
}
export async function passerTestDiscAdmin(_: EtatTest, f: FormData) { return passerTestPour("disc", f); }
export async function passerTestManagementAdmin(_: EtatTest, f: FormData) { return passerTestPour("management", f); }

export async function autoriserTestAdmin(f: FormData) {
  const { user } = await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const test = t(f, "test", 20);
  if (!["disc", "management"].includes(test)) return;
  await createAdminClient().from("tests_autorisations").upsert({ candidat_id: candidat, test, autorise_par: user.email ?? "" });
  revalidatePath(`/admin/candidats/${candidat}`);
}

export async function genererSyntheseAdmin(_: { erreur?: string }, f: FormData): Promise<{ erreur?: string }> {
  const { user } = await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const r = await genererSynthese(candidat, user.email ?? "");
  if (!r.erreur) revalidatePath(`/admin/candidats/${candidat}`);
  return r;
}

export async function genererCvAmelioreAdmin(_: { erreur?: string }, f: FormData): Promise<{ erreur?: string }> {
  await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const r = await genererCvAmeliore(candidat);
  if (!r.erreur) revalidatePath(`/admin/candidats/${candidat}`);
  return r;
}

export async function ajouterEchangeAdmin(_: { erreur?: string; ok?: boolean }, f: FormData): Promise<{ erreur?: string; ok?: boolean }> {
  const { user } = await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const r = await ajouterEchange(candidat, f, user.email ?? "");
  if (r.erreur) return r;
  revalidatePath(`/admin/candidats/${candidat}`);
  return { ok: true };
}

export async function supprimerEchangeAdmin(f: FormData) {
  await exigerSuperAdmin();
  const candidat = t(f, "candidat_id", 60);
  await createAdminClient().from("echanges").delete().eq("id", t(f, "id", 60)).eq("candidat_id", candidat);
  revalidatePath(`/admin/candidats/${candidat}`);
}

export async function actionFaiteAdmin(f: FormData) {
  await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", t(f, "id", 60)).eq("candidat_id", candidat);
  revalidatePath(`/admin/candidats/${candidat}`);
}

/* ---------- Mes entreprises ---------- */
export async function enregistrerEntreprise(f: FormData) {
  const { user } = await exigerAcces("entreprises");
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
  await exigerSuperAdmin();
  await createAdminClient().from("entreprises").delete().eq("id", t(f, "id", 60));
  redirect("/admin?vue=entreprises");
}

export async function ajouterEchangeEntreprise(_: { erreur?: string; ok?: boolean }, f: FormData): Promise<{ erreur?: string; ok?: boolean }> {
  const { user } = await exigerAcces("entreprises");
  const id = t(f, "entreprise_id", 60);
  const r = await ajouterEchange({ entreprise: id }, f, user.email ?? "");
  if (r.erreur) return r;
  revalidatePath(`/admin/entreprises/${id}`);
  return { ok: true };
}

export async function supprimerEchangeEntreprise(f: FormData) {
  await exigerSuperAdmin();
  const id = t(f, "entreprise_id", 60);
  await createAdminClient().from("echanges").delete().eq("id", t(f, "id", 60)).eq("entreprise_id", id);
  revalidatePath(`/admin/entreprises/${id}`);
}

export async function actionFaiteEntreprise(f: FormData) {
  await exigerAcces("entreprises");
  const id = t(f, "entreprise_id", 60);
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", t(f, "id", 60)).eq("entreprise_id", id);
  revalidatePath(`/admin/entreprises/${id}`);
}

export async function changerAdmissionAdmin(f: FormData) {
  await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const statut = t(f, "statut_admission", 30);
  const r = await changerAdmission(candidat, statut, t(f, "motif_admission", 1000));
  // Abandon sans motif (ex. depuis le tableau) : on ouvre la fiche pour saisir le motif
  if (r.erreur === "motif") redirect(`/admin/candidats/${candidat}?admission=${statut}#admission`);
  revalidatePath(`/admin/candidats/${candidat}`);
  revalidatePath("/admin");
  // Requalifié en intervenant : on remplit tout de suite sa fiche intervenant
  if (r.leadIntervenant) redirect(`/admin/intervenants/${r.leadIntervenant}/fiche?requalifie=1`);
}

/* ---------- Formations des écoles ---------- */
export async function ajouterFormation(f: FormData) {
  await exigerSuperAdmin();
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
  await exigerSuperAdmin();
  const id = t(f, "ecole_id", 60);
  const nom = t(f, "nom", 120);
  const db = createAdminClient();
  const { data } = await db.from("ecoles").select("formations").eq("id", id).maybeSingle();
  await db.from("ecoles").update({ formations: lireFormations(data?.formations).filter((x) => x.nom !== nom) }).eq("id", id);
  redirect("/admin?vue=ecoles");
}

export async function changerDiplomeAdmin(f: FormData) {
  await exigerAcces("candidats", "alumni");
  const candidat = t(f, "candidat_id", 60);
  const r = await majDiplome(candidat, f);
  revalidatePath(`/admin/candidats/${candidat}`);
  redirect(`/admin/candidats/${candidat}?diplome=${r.erreur ? "erreur" : r.sansRentree ? "sql" : "ok"}`);
}

/** Entreprise prospectée par un étudiant → « Mes entreprises » (ou rattachée à la fiche existante du même nom). */
export async function ajouterProspectionAuxEntreprises(f: FormData) {
  const { user } = await exigerAcces("entreprises");
  const db = createAdminClient();
  const { data: p } = await db.from("prospections").select("*").eq("id", t(f, "prospection_id", 60)).maybeSingle();
  if (!p) return;
  const { data: toutes } = await toutLire<Record<string, string>>((de, a) => db.from("entreprises").select("id, nom").order("id").range(de, a));
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
  const { user } = await exigerAcces("entreprises");
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
  await exigerAcces("entreprises");
  const id = t(f, "id", 60);
  after(() => lancerRechercheCandidats(id).then(() => undefined));
  redirect(`/admin/entreprises/${id}?onglet=candidats&recherche=1`);
}

export async function changerStatutEntreprise(f: FormData) {
  await exigerAcces("entreprises");
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
  await exigerAcces("entreprises");
  const offre = t(f, "offre_id", 60);
  const retour = t(f, "retour", 300) || "/admin?vue=entreprises&sous=offres";
  const r = await genererFicheOffre(offre);
  if (r.erreur) redirect(`${retour}${retour.includes("?") ? "&" : "?"}erreur=fiche-${r.erreur}`);
  redirect(`/admin/offres/${offre}/fiche`);
}

/** Entreprise qui recrute sans aucune offre : MagnusMatch crée l'offre et sa fiche de poste. */
export async function genererFicheDePosteEntreprise(f: FormData) {
  await exigerAcces("entreprises");
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
  await exigerSuperAdmin();
  const slug = (formation || "generale").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  const chemin = `${ecoleId}/${slug}-${Date.now()}.pdf`;
  const { data, error } = await createAdminClient().storage.from("brochures").createSignedUploadUrl(chemin);
  if (error || !data) return { erreur: "Le dépôt n'est pas encore activé : exécute la mise à jour SQL de la page /diagnostic." };
  return { chemin: data.path, jeton: data.token };
}

export async function enregistrerBrochure(ecoleId: string, formation: string, chemin: string | null): Promise<{ erreur?: string }> {
  await exigerSuperAdmin();
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
    motif_perte: statut === "perdu" ? t(f, "motif_perte", 500) : "",
    updated_at: new Date().toISOString(),
  };
}

export async function enregistrerLead(f: FormData) {
  const { droits } = await exigerAcces("leads", "intervenants", "alumni");
  const id = t(f, "id", 60);
  if (id) await verifierContact(id, droits);
  const d = lireLead(f);
  if (!d.email && !d.telephone && !d.nom) redirect(`/admin/leads/${id || "nouveau"}?erreur=champs`);
  if (d.statut === "perdu" && d.motif_perte.length < 3) redirect(`/admin/leads/${id || "nouveau"}?erreur=motif`);
  if (d.statut === "convoque" && !id) redirect("/admin/leads/nouveau?erreur=date");
  const db = createAdminClient();
  if (id) {
    const avant = await leadParId(id);
    let { error } = await db.from("leads").update({ ...d, ...datesEtapes(avant, d.statut) }).eq("id", id);
    if (error) ({ error } = await db.from("leads").update(d).eq("id", id));
    if (error) { const { motif_perte: _m, ...sansMotif } = d; void _m; ({ error } = await db.from("leads").update(sansMotif).eq("id", id)); }
    if (error) redirect(`/admin/leads/${id}?erreur=base`);
    if (d.statut === "admis" && avant && !estLeadAdmis(avant) && !avant.candidat_id) {
      const ok = await envoyerInvitation({ ...avant, ...d });
      redirect(`/admin/leads/${id}?${ok ? "invitation=1" : "ok=1"}`);
    }
    redirect(`/admin/leads/${id}?ok=1`);
  }
  let { data, error } = await db.from("leads").insert({ ...d, ...datesEtapes(null, d.statut), consentement: f.get("consentement") === "on" }).select("id").single();
  if (error) ({ data, error } = await db.from("leads").insert({ ...d, consentement: f.get("consentement") === "on" }).select("id").single());
  if (error || !data) redirect("/admin/leads/nouveau?erreur=base");
  redirect(`/admin/leads/${data.id}?ok=1`);
}

export async function changerStatutLead(f: FormData) {
  await exigerAcces("leads");
  const statut = t(f, "statut", 30);
  if (!STATUTS_LEAD.some((x) => x.id === statut)) return;
  const id = t(f, "id", 60);
  const motif = t(f, "motif_perte", 500);
  if (statut === "perdu" && motif.length < 3) return; // le motif est obligatoire
  if (statut === "convoque") return; // la date de l'entretien est obligatoire : passer par la fiche
  const avant = await leadParId(id);
  const maj = { statut, updated_at: new Date().toISOString(), ...(statut === "perdu" ? { motif_perte: motif } : {}) };
  const { error } = await createAdminClient().from("leads").update({ ...maj, ...datesEtapes(avant, statut) }).eq("id", id);
  if (error) await createAdminClient().from("leads").update({ statut, updated_at: maj.updated_at }).eq("id", id); // base pas encore à jour
  // Accepté à l'entretien : il reçoit son lien pour créer son espace
  if (statut === "admis" && avant && !estLeadAdmis(avant) && !avant.candidat_id) after(() => envoyerInvitation(avant).then(() => undefined));
  revalidatePath("/admin");
}

export async function renvoyerInvitation(f: FormData) {
  await exigerAcces("leads");
  const id = t(f, "id", 60);
  const l = await leadParId(id);
  if (!l) redirect("/admin?vue=leads");
  const ok = await envoyerInvitation(l);
  redirect(`/admin/leads/${id}?${ok ? "invitation=1" : "erreur=email"}`);
}

export async function supprimerLead(f: FormData) {
  await exigerSuperAdmin();
  await createAdminClient().from("leads").delete().eq("id", t(f, "id", 60));
  redirect("/admin?vue=leads");
}

export async function renvoyerBrochure(f: FormData) {
  await exigerAcces("leads");
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
  const { user, droits } = await exigerAcces("leads", "intervenants", "alumni");
  const id = t(f, "lead_id", 60);
  await verifierContact(id, droits);
  const r = await ajouterEchange({ lead: id }, f, user.email ?? "");
  if (r.erreur) return r;
  await prendreSiLibre(id, user.email);
  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}

export async function supprimerEchangeLead(f: FormData) {
  await exigerSuperAdmin();
  const id = t(f, "lead_id", 60);
  await createAdminClient().from("echanges").delete().eq("id", t(f, "id", 60)).eq("lead_id", id);
  revalidatePath(`/admin/leads/${id}`);
}

export async function actionFaiteLead(f: FormData) {
  await exigerAcces("leads", "intervenants", "alumni");
  const id = t(f, "lead_id", 60);
  await createAdminClient().from("echanges").update({ action_faite: true }).eq("id", t(f, "id", 60)).eq("lead_id", id);
  revalidatePath(`/admin/leads/${id}`);
}

/* ---------- Entretien d'admission d'un lead ---------- */
export async function enregistrerEntretienLead(_: EtatEntretien, f: FormData): Promise<EtatEntretien> {
  const { user } = await exigerAcces("leads");
  const lead = t(f, "lead_id", 60);
  const r = await enregistrerEntretienConseil(f, { lead }, { email: user.email! });
  if (r.erreur) return { erreur: r.erreur };
  revalidatePath(`/admin/leads/${lead}`);
  if (!f.get("id")) redirect(`/admin/leads/${lead}/entretien/${r.id}?ok=1`);
  return { ok: "Fiche enregistrée." };
}

/** Date et heure de l'entretien d'admission : convocation par email tout de suite, rappel la veille. */
export async function planifierEntretienLead(f: FormData) {
  const { user } = await exigerAcces("leads");
  const id = t(f, "id", 60);
  const l = await leadParId(id);
  if (!l) redirect("/admin?vue=leads");
  const quand = parisVersISO(t(f, "entretien_a", 20));
  if (!quand) redirect(`/admin/leads/${id}?onglet=entretien&erreur=date`);
  const db = createAdminClient();
  const statut = ["nouveau", "contacte", "rdv", "dossier", "entretien"].includes(l.statut) ? "convoque" : l.statut;
  const { error } = await db.from("leads").update({ entretien_a: quand, rappel_entretien_envoye: false, statut, ...datesEtapes(l, statut), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin/leads/${id}?onglet=entretien&erreur=base`);
  await prendreSiLibre(id, user.email);
  // Rappel 🔔 1 heure avant, pour la personne qui suit le lead
  await db.from("echanges").insert({
    lead_id: id, type: "rdv", date_echange: new Date().toISOString(),
    resume: `📨 Convoqué à l'entretien d'admission : ${dateEntretienTexte(quand)}.`,
    action: `🗣️ Entretien d'admission de ${nomLead(l)} à ${new Date(quand).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}`,
    action_le: quand.slice(0, 10), action_a: new Date(new Date(quand).getTime() - 3600e3).toISOString(),
    auteur: l.attribue_a || user.email || "",
  });
  const ok = f.get("convocation") === "on" ? await envoyerConvocation(l, quand) : false;
  redirect(`/admin/leads/${id}?onglet=entretien&${ok ? "convocation=1" : "ok=1"}`);
}

/** Barre de statut de la fiche lead : statut + motif (perdu) + date d'entretien (convoqué) + invitation (admis). */
export async function changerStatutLeadFiche(f: FormData) {
  const { user } = await exigerAcces("leads");
  const id = t(f, "id", 60);
  const statut = t(f, "statut", 30);
  // « Alumni » ou « Intervenant » dans la barre de statut : ce n'est pas un lead, on le requalifie
  if (statut === "requalif_alumni" || statut === "requalif_intervenant") {
    f.set("categorie", statut === "requalif_alumni" ? "alumni" : "intervenant");
    return requalifierLead(f);
  }
  const retour = t(f, "retour", 200);
  const l = await leadParId(id);
  if (!l || !STATUTS_LEAD.some((x) => x.id === statut)) redirect("/admin?vue=leads");
  if (statut !== l.statut) await prendreSiLibre(id, user.email);
  // Convoqué au concours : la date et l'heure de l'entretien sont obligatoires
  if (statut === "convoque" && !t(f, "entretien_a", 20) && !(l.statut === "convoque" && l.entretien_a)) redirect(`/admin/leads/${id}?erreur=date`);
  const db = createAdminClient();
  const messages: string[] = [];
  if (statut === "perdu") {
    const motif = t(f, "motif_perte", 500);
    if (motif.length < 3) redirect(`/admin/leads/${id}?erreur=motif`);
    let { error } = await db.from("leads").update({ statut, motif_perte: motif, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) ({ error } = await db.from("leads").update({ statut, updated_at: new Date().toISOString() }).eq("id", id));
  } else if (statut === "convoque" && t(f, "entretien_a", 20)) {
    const quand = parisVersISO(t(f, "entretien_a", 20));
    if (!quand) redirect(`/admin/leads/${id}?erreur=date`);
    const { error } = await db.from("leads").update({ entretien_a: quand, rappel_entretien_envoye: false, statut, ...datesEtapes(l, statut), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) redirect(`/admin/leads/${id}?erreur=base`);
    if (l.entretien_a !== quand) {
      await db.from("echanges").insert({
        lead_id: id, type: "rdv", date_echange: new Date().toISOString(),
        resume: `📨 Convoqué à l'entretien d'admission : ${dateEntretienTexte(quand)}.`,
        action: `🗣️ Entretien d'admission de ${nomLead(l)} à ${new Date(quand).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}`,
        action_le: quand.slice(0, 10), action_a: new Date(new Date(quand).getTime() - 3600e3).toISOString(),
        auteur: user.email ?? "",
      });
      if (f.get("convocation") === "on" && (await envoyerConvocation(l, quand))) messages.push("convocation=1");
    }
  } else {
    const { error } = await db.from("leads").update({ statut, updated_at: new Date().toISOString(), ...datesEtapes(l, statut) }).eq("id", id);
    if (error) await db.from("leads").update({ statut, updated_at: new Date().toISOString() }).eq("id", id);
    if (statut === "admis" && !estLeadAdmis(l) && !l.candidat_id && (await envoyerInvitation(l))) messages.push("invitation=1");
  }
  revalidatePath("/admin");
  if (retour.startsWith("/admin")) redirect(retour);
  redirect(`/admin/leads/${id}?${messages.join("&") || "ok=1"}`);
}

/* ---------- Événements (JPO, salons…) ---------- */
export async function creerEvenement(f: FormData) {
  await exigerAcces("evenements");
  const nom = t(f, "nom", 150);
  const date = t(f, "date", 10);
  if (!nom || !/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect("/admin?vue=evenements&erreur=evenement");
  const db = createAdminClient();
  const base = { nom, date, lieu: t(f, "lieu", 150), code: nouveauCode() };
  let { data, error } = await db.from("evenements").insert({ ...base, sur_accueil: f.get("sur_accueil") === "on" }).select("id").single();
  if (error) ({ data, error } = await db.from("evenements").insert(base).select("id").single()); // colonne pas encore créée
  if (error || !data) redirect("/admin?vue=evenements&erreur=base");
  revalidatePath("/");
  redirect(`/admin/evenements/${data.id}`);
}

export async function basculerAccueilEvenement(f: FormData) {
  await exigerAcces("evenements");
  const { error } = await createAdminClient().from("evenements").update({ sur_accueil: f.get("valeur") === "1" }).eq("id", t(f, "id", 60));
  revalidatePath("/");
  redirect(error ? "/admin?vue=evenements&erreur=base" : "/admin?vue=evenements");
}

export async function supprimerEvenement(f: FormData) {
  await exigerSuperAdmin();
  await createAdminClient().from("evenements").delete().eq("id", t(f, "id", 60));
  revalidatePath("/");
  redirect("/admin?vue=evenements");
}

/** Carte de visite : nouveau QR code pour un candidat (l'ancien lien ne marche plus). Réservé à l'administrateur. */
export async function refaireQrCarteAdmin(f: FormData) {
  await exigerSuperAdmin();
  const id = t(f, "candidat_id", 60);
  const { changerJetonCarte } = await import("@/lib/carte");
  await changerJetonCarte(id);
  redirect(`/admin/candidats/${id}?carte=nouveau`);
}

/** Annonce déposée par un alumni : validée, elle est ouverte et comparée aux étudiants admis. */
export async function validerAnnonceAlumni(f: FormData) {
  await exigerAcces("entreprises");
  const id = t(f, "id", 60);
  const db = createAdminClient();
  const expire = new Date(Date.now() + 60 * 864e5).toISOString();
  let { error } = await db.from("offres").update({ ouverte: true, validation: "validee", expire_le: expire, publiee_le: new Date().toISOString() }).eq("id", id).eq("source", "alumni");
  if (error) ({ error } = await db.from("offres").update({ ouverte: true, validation: "validee" }).eq("id", id).eq("source", "alumni"));
  if (!error) after(() => noterOffrePourTous(id));
  revalidatePath("/admin");
  redirect(t(f, "retour", 200) || "/admin");
}

export async function refuserAnnonceAlumni(f: FormData) {
  await exigerAcces("entreprises");
  await createAdminClient().from("offres").update({ ouverte: false, validation: "refusee" }).eq("id", t(f, "id", 60)).eq("source", "alumni");
  revalidatePath("/admin");
  redirect(t(f, "retour", 200) || "/admin");
}

/* ---------- ⚙️ Équipe (administrateur uniquement) ---------- */

/** Intitulé choisi dans la liste, ou écrit à la main (« Autre »). */
function lirePoste(f: FormData) {
  const choix = t(f, "poste_choix", 120);
  return choix === "autre" ? t(f, "poste_autre", 120) : choix || t(f, "poste", 120);
}

export async function ajouterMembreEquipe(f: FormData) {
  await exigerSuperAdmin();
  const { TOUS_ACCES } = await import("@/lib/equipe");
  const email = t(f, "email", 200).toLowerCase();
  const acces = f.getAll("acces").map(String).filter((x) => (TOUS_ACCES as string[]).includes(x));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/admin/parametres?erreur=membre");
  if (!acces.length) redirect("/admin/parametres?erreur=acces");
  const db = createAdminClient();
  const { data: existe } = await db.from("equipe").select("id").eq("email", email).maybeSingle();
  const ligne = { email, nom: t(f, "nom", 120), poste: lirePoste(f), acces, role: "equipe", actif: true, retire_le: null };
  const { error } = existe ? await db.from("equipe").update(ligne).eq("id", existe.id) : await db.from("equipe").insert(ligne);
  if (error) redirect("/admin/parametres?erreur=base");
  if (f.get("prevenir") === "1" && moyenEnvoi()) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    after(() => envoyerEmail(email, "Ton accès au tableau de bord MagnusMatch", texteEnHtml(
      `Bonjour ${ligne.nom || ""},\n\nTu as maintenant accès au tableau de bord MagnusMatch du Campus Magnus${ligne.poste ? `, en tant que ${ligne.poste}` : ""}.\n\n1. Crée ton compte avec cette adresse (${email}) : ${site}/inscription\n   (si tu as déjà un compte, connecte-toi simplement : ${site}/connexion)\n2. Tu arrives directement sur ton tableau de bord.\n\nÀ très vite,\nL'équipe du Campus Magnus`)).then(() => undefined));
  }
  redirect("/admin/parametres?ok=ajoute");
}

export async function basculerAccesMembre(f: FormData) {
  await exigerSuperAdmin();
  const actif = f.get("actif") === "1";
  await createAdminClient().from("equipe").update({ actif, retire_le: actif ? null : new Date().toISOString() }).eq("id", t(f, "id", 60));
  redirect(`/admin/parametres?ok=${actif ? "retabli" : "coupe"}`);
}

export async function modifierMembre(f: FormData) {
  await exigerSuperAdmin();
  const { TOUS_ACCES } = await import("@/lib/equipe");
  const acces = f.getAll("acces").map(String).filter((x) => (TOUS_ACCES as string[]).includes(x));
  if (!acces.length) redirect("/admin/parametres?erreur=acces");
  const { error } = await createAdminClient().from("equipe").update({ nom: t(f, "nom", 120), poste: lirePoste(f), acces }).eq("id", t(f, "id", 60));
  redirect(error ? "/admin/parametres?erreur=base" : "/admin/parametres?ok=modifie");
}

export async function supprimerMembre(f: FormData) {
  await exigerSuperAdmin();
  await createAdminClient().from("equipe").delete().eq("id", t(f, "id", 60));
  redirect("/admin/parametres?ok=supprime");
}

/** Un intervenant ne se modifie que par la pédagogie et l'administrateur. */
async function verifierContact(leadId: string, droits: import("@/lib/equipe").Droits) {
  const { peut } = await import("@/lib/equipe");
  const { data } = await createAdminClient().from("leads").select("categorie").eq("id", leadId).maybeSingle();
  if (data?.categorie === "intervenant" && !peut(droits, "intervenants")) redirect("/admin?vue=leads&refuse=1");
}

/** « Je m'en occupe » ou attribution à un membre de l'équipe. */
export async function attribuerLeadAction(f: FormData) {
  const { user, droits } = await exigerAcces("leads", "intervenants", "alumni");
  const { attribuerLead } = await import("@/lib/leads");
  const id = t(f, "lead_id", 60);
  await verifierContact(id, droits);
  const choix = t(f, "attribue_a", 200);
  const email = choix === "moi" ? (user.email ?? "") : choix;
  await attribuerLead(id, email, user.email ?? "");
  revalidatePath("/admin");
  redirect(t(f, "retour", 200) || `/admin/leads/${id}?attribue=1`);
}

/** Le premier membre qui agit sur un lead libre en devient responsable (réactivité). */
async function prendreSiLibre(leadId: string, email: string | undefined) {
  if (!leadId || !email) return;
  const { attribuerLead } = await import("@/lib/leads");
  const { data } = await createAdminClient().from("leads").select("attribue_a").eq("id", leadId).maybeSingle();
  if (data && !data.attribue_a) await attribuerLead(leadId, email, email).catch(() => false);
}

/** Administrateur : attribue d'un coup les leads cochés à une personne de l'équipe. */
export async function attribuerLeadsGroupe(f: FormData) {
  const { user } = await exigerSuperAdmin();
  const { attribuerLead } = await import("@/lib/leads");
  const email = t(f, "attribue_a", 200);
  const ids = f.getAll("ids").map(String).filter((x) => /^[\w-]{1,60}$/.test(x));
  if (!email || !ids.length) redirect(`${t(f, "retour", 200) || "/admin?vue=leads"}&attribution=vide`);
  for (const id of ids) await attribuerLead(id, email, user.email ?? "");
  revalidatePath("/admin");
  redirect(`${t(f, "retour", 200) || "/admin?vue=leads"}&attribution=${ids.length}`);
}

/**
 * Requalifie un contact : lead du recrutement, intervenant (va à la pédagogie) ou alumni.
 * Il sort (ou revient dans) les leads et les chiffres du recrutement.
 */
export async function requalifierLead(f: FormData) {
  const { user, droits } = await exigerAcces("leads", "intervenants", "alumni");
  const { leadParId, notifierContact } = await import("@/lib/leads");
  const id = t(f, "id", 60);
  await verifierContact(id, droits);
  const choix = t(f, "categorie", 20);
  const categorie = choix === "intervenant" || choix === "alumni" ? choix : null;
  const l = await leadParId(id);
  if (!l) redirect("/admin?vue=leads");
  if ((l.categorie ?? null) === categorie) redirect(`/admin/leads/${id}`);
  const db = createAdminClient();
  const formation = t(f, "formation", 200);
  const { error } = await db.from("leads").update({
    categorie,
    ...(formation ? { formation } : {}),
    ...(categorie ? { annee_rentree: null } : {}),
    attribue_a: null, attribue_le: null, // la nouvelle équipe (pédagogie…) le prend en charge
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) redirect(`/admin/leads/${id}?erreur=base`);
  // Son compte candidat (s'il a créé son espace) suit : intervenant, alumni, ou retour candidat
  const { synchroniserCandidatDuLead } = await import("@/lib/leads");
  await synchroniserCandidatDuLead(l, categorie).catch(() => undefined);
  // Les notifications « Nouveau lead » n'ont plus lieu d'être
  await db.from("echanges").update({ action_faite: true }).eq("lead_id", id).eq("action_faite", false).like("action", "🧲 Nouveau lead%");
  const libelle = categorie === "intervenant" ? "🧑‍🏫 intervenant" : categorie === "alumni" ? "🎓 alumni" : "🧲 lead du recrutement";
  await db.from("echanges").insert({ lead_id: id, type: "autre", date_echange: new Date().toISOString(), auteur: "", resume: `🔁 Requalifié en ${libelle} par ${user.email ?? "l'équipe"}.` });
  if (categorie) {
    const apres = await leadParId(id);
    if (apres) await notifierContact(apres).catch(() => undefined);
  }
  revalidatePath("/admin");
  // Requalifié en intervenant : on remplit tout de suite sa fiche intervenant
  if (categorie === "intervenant") redirect(`/admin/intervenants/${id}/fiche?requalifie=1`);
  redirect(`/admin/leads/${id}?requalifie=1`);
}

/** Fiche intervenant remplie par l'équipe (après une requalification, ou pour la compléter). */
export async function enregistrerFicheIntervenant(f: FormData) {
  await exigerAcces("intervenants", "leads", "candidats");
  const { SPECIALITES, SITUATIONS_INTERVENANT } = await import("@/lib/intervenants");
  const id = t(f, "id", 60);
  const db = createAdminClient();
  const { data: l } = await db.from("leads").select("*").eq("id", id).eq("categorie", "intervenant").maybeSingle();
  if (!l) redirect("/admin");
  const situation = t(f, "situation", 20);
  const specialites = [...f.getAll("specialites").map(String).filter((x) => (SPECIALITES as readonly string[]).includes(x)), t(f, "autre_specialite", 80)].filter(Boolean);
  const message = [
    t(f, "presentation", 4000),
    t(f, "linkedin", 200) && `LinkedIn : ${t(f, "linkedin", 200)}`,
    t(f, "disponibilites", 300) && `Disponibilités : ${t(f, "disponibilites", 300)}`,
  ].filter(Boolean).join("\n\n");
  const maj = {
    prenom: t(f, "prenom", 80) || l.prenom, nom: t(f, "nom", 80) || l.nom, telephone: t(f, "telephone", 30),
    formation: specialites.join(" · "), situation: situation in SITUATIONS_INTERVENANT ? situation : "",
    entreprise: t(f, "entreprise", 150), recrute: f.get("recrute") === "on", message, updated_at: new Date().toISOString(),
  };
  let { error } = await db.from("leads").update(maj).eq("id", id);
  if (error && /situation|entreprise|recrute/.test(error.message)) {
    const { situation: _s, entreprise: _e, recrute: _r, ...base } = maj;
    void _s; void _e; void _r;
    ({ error } = await db.from("leads").update(base).eq("id", id));
  }
  if (error) redirect(`/admin/intervenants/${id}/fiche?erreur=base`);
  // Il recrute (nouvellement coché) : son entreprise arrive dans « Mes entreprises » et l'équipe est prévenue
  if (maj.recrute && maj.entreprise && !(l.recrute && l.entreprise_id)) {
    const { entrepriseQuiRecrute } = await import("@/lib/intervenants-serveur");
    const entrepriseId = await entrepriseQuiRecrute({ ...l, ...maj } as import("@/lib/leads").Lead).catch(() => null);
    if (entrepriseId) await db.from("leads").update({ entreprise_id: entrepriseId }).eq("id", id);
  }
  const { peut } = await import("@/lib/equipe");
  const { droits } = await exigerAcces("intervenants", "leads", "candidats");
  redirect(peut(droits, "intervenants") ? `/admin/leads/${id}?ok=1` : "/admin?vue=leads&requalifie=intervenant");
}

/** Tableau « Mes candidats » : l'équipe choisit l'année de rentrée (le diplôme est déduit : rentrée + durée). */
export async function changerRentreeAdmin(f: FormData) {
  await exigerAcces("candidats", "alumni");
  const { formationsDeLEcole } = await import("@/lib/ecoles");
  const id = t(f, "candidat_id", 60);
  const r = Number(f.get("annee_rentree"));
  const annee = Number.isInteger(r) && r >= 2000 && r <= 2100 ? r : null;
  const db = createAdminClient();
  const { data: c } = await db.from("candidats").select("formation, ecole_id").eq("user_id", id).maybeSingle();
  const duree = c ? (await formationsDeLEcole(c.ecole_id)).find((x) => x.nom === c.formation)?.duree : undefined;
  const { error } = await db.from("candidats").update({ annee_rentree: annee, ...(annee && duree ? { diplome_annee: annee + duree } : {}) }).eq("user_id", id);
  revalidatePath("/admin");
  redirect(`/admin?vue=candidats${error ? "&rentree=sql" : ""}`);
}

/* ---------- 📚 Pédagogie : classes ---------- */

export async function creerClasse(f: FormData) {
  await exigerAcces("intervenants");
  const nom = t(f, "nom", 120);
  const a = Number(f.get("annee"));
  if (!nom || !Number.isInteger(a) || a < 2000 || a > 2100) redirect("/admin?vue=classes&erreur=classe");
  const { error } = await createAdminClient().from("classes").insert({ nom, annee: a, formation: t(f, "formation", 60) });
  revalidatePath("/admin");
  redirect(`/admin?vue=classes${error ? "&erreur=base" : "&ok=classe"}`);
}

export async function supprimerClasse(f: FormData) {
  await exigerSuperAdmin();
  const db = createAdminClient();
  const id = t(f, "id", 60);
  await db.from("candidats").update({ classe_id: null }).eq("classe_id", id);
  await db.from("classes").delete().eq("id", id);
  revalidatePath("/admin");
  redirect("/admin?vue=classes");
}

/** Attribue (ou retire) la classe d'un étudiant admis. */
export async function attribuerClasse(f: FormData) {
  await exigerAcces("intervenants");
  const classe = t(f, "classe_id", 60);
  const { error } = await createAdminClient().from("candidats").update({ classe_id: classe || null }).eq("user_id", t(f, "candidat_id", 60));
  revalidatePath("/admin");
  redirect(`${t(f, "retour", 200) || "/admin?vue=classes"}${error ? "&erreur=base" : ""}`);
}

