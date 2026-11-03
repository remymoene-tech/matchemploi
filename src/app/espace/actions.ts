"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigerUtilisateur } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, motsClesDepuisProfil } from "@/lib/ia";
import { analyserCV, cheminCV, majCandidat, stockerCV, telechargerCV } from "@/lib/cv";
import { localiserCommune } from "@/lib/geo";
import { ecoleParCode } from "@/lib/ecoles";
import { genererPreparation } from "@/lib/preparation";
import { enregistrerTest } from "@/lib/tests-serveur";
import { peutPasserTest } from "@/lib/synthese";
import { genererCvAmeliore } from "@/lib/cv-ameliore";
import type { TestId } from "@/lib/tests";
import type { EtatTest } from "@/components/FormTests";
import { rechercherPourCandidat } from "@/lib/matching";
import { AVIS, CONTRATS, MAX_RECHERCHES, RAISONS_REFUS, type Candidat, type Piste } from "@/lib/types";

export type EtatProfil = { erreur?: string };

const texte = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);

export async function enregistrerProfil(_: EtatProfil, f: FormData): Promise<EtatProfil> {
  const { user, supabase } = await exigerUtilisateur();
  const { data: avant } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();

  const contrats = CONTRATS.map((c) => c.id).filter((id) => f.get(`contrat_${id}`) === "on");
  const donnees = {
    user_id: user.id,
    email: user.email!,
    nom: texte(f, "nom", 120),
    telephone: texte(f, "telephone", 30),
    formation: texte(f, "formation", 200),
    poste_vise: texte(f, "poste_vise", 200),
    contrats,
    code_postal: texte(f, "code_postal", 10),
    ville: texte(f, "ville", 100),
    mobilite_km: Math.max(0, Math.min(200, Number(f.get("mobilite_km")) || 20)),
    permis: texte(f, "permis", 30),
    rythme: texte(f, "rythme", 120),
    disponibilite: texte(f, "disponibilite", 120),
    projet: texte(f, "projet", 2000),
    consentement: f.get("consentement") === "on",
    alertes_email: f.get("alertes_email") === "on",
    mots_cles: avant?.mots_cles ?? "",
    cv_chemin: avant?.cv_chemin ?? null,
    cv_texte: avant?.cv_texte ?? "",
    competences: avant?.competences ?? [],
    cv_conseils: avant?.cv_conseils ?? null,
    updated_at: new Date().toISOString(),
  };

  if (!donnees.nom || !donnees.poste_vise) return { erreur: "Indique au moins ton nom et le poste que tu vises." };
  if (!contrats.length) return { erreur: "Choisis au moins un type de contrat." };
  if (!donnees.consentement) return { erreur: "Coche la case d'accord pour que l'on puisse chercher des offres pour toi." };

  // CV en PDF : stocké en privé puis lu par l'IA (une analyse ratée ne bloque pas l'inscription)
  const cv = f.get("cv");
  const nouveauCV = cv instanceof File && cv.size > 0;
  if (nouveauCV) {
    const r = await stockerCV(user.id, cv);
    if ("erreur" in r) return r;
    donnees.cv_chemin = cheminCV(user.id);
    const lu = await analyserCV(r.octets, donnees.poste_vise, donnees.projet);
    if (lu) Object.assign(donnees, lu);
  }
  if (!iaConfiguree()) {
    donnees.mots_cles ||= donnees.poste_vise;
  } else if (!nouveauCV && (!donnees.mots_cles || avant?.poste_vise !== donnees.poste_vise)) {
    try {
      donnees.mots_cles = await motsClesDepuisProfil(donnees);
    } catch {
      donnees.mots_cles = donnees.poste_vise;
    }
  }
  donnees.mots_cles ||= donnees.poste_vise;

  // École (code d'inscription donné par le responsable entreprises)
  const codeEcole = texte(f, "code_ecole", 40);
  let ecole_id: string | null = avant?.ecole_id ?? null;
  if (codeEcole) {
    const ecole = await ecoleParCode(codeEcole).catch(() => null);
    if (!ecole) return { erreur: "Ce code école n'existe pas. Vérifie-le auprès de ton école, ou laisse le champ vide." };
    ecole_id = ecole.id;
  } else if (f.has("code_ecole")) {
    ecole_id = null;
  }

  // Position de la commune (recherche autour de chez lui + carte)
  let position: Record<string, unknown> = {};
  const lieuChange = avant?.code_postal !== donnees.code_postal || avant?.ville !== donnees.ville;
  if (lieuChange || avant?.latitude == null) {
    const commune = await localiserCommune(donnees.code_postal, donnees.ville);
    position = commune
      ? { latitude: commune.latitude, longitude: commune.longitude, code_commune: commune.code }
      : { latitude: null, longitude: null, code_commune: null };
  }

  const { ok } = await majCandidat(supabase, { ...donnees, ...position, ecole_id, recherche_en_cours: true });
  if (!ok) return { erreur: "L'enregistrement a échoué. Réessaie dans un instant." };

  after(() => rechercherPourCandidat(user.id));
  // Nouveau CV analysé : on montre d'abord les conseils
  redirect(nouveauCV ? "/espace/cv?nouveau=1" : "/espace");
}

export async function relancerRecherche() {
  const { user, supabase } = await exigerUtilisateur();
  await supabase.from("candidats").update({ recherche_en_cours: true }).eq("user_id", user.id);
  after(() => rechercherPourCandidat(user.id));
  revalidatePath("/espace");
}

export async function donnerAvis(f: FormData) {
  const { user, supabase } = await exigerUtilisateur();
  const avis = String(f.get("avis"));
  if (!AVIS.some((a) => a.id === avis)) return;
  const offreId = String(f.get("offre_id"));

  // Raison du refus : choix rapides + précision libre
  const raisons = f.getAll("raison").map(String).filter((r) => (RAISONS_REFUS as readonly string[]).includes(r));
  const precision = String(f.get("precision") ?? "").trim().slice(0, 300);
  const raison = avis === "pas_interesse" ? [raisons.join(", "), precision].filter(Boolean).join(" : ") : "";

  let { error } = await supabase
    .from("correspondances")
    .update({ avis_candidat: avis, raison_refus: raison || null })
    .eq("candidat_id", user.id)
    .eq("offre_id", offreId);
  if (error && /raison_refus/.test(error.message)) {
    // Base pas encore à jour : on enregistre au moins l'avis
    ({ error } = await supabase.from("correspondances").update({ avis_candidat: avis }).eq("candidat_id", user.id).eq("offre_id", offreId));
  }

  // Il a postulé : on lui prépare sa fiche d'entretien
  if (!error && avis === "postule") after(() => genererPreparation(user.id, offreId));

  // Un refus expliqué : on renote les autres offres en tenant compte de cette préférence
  if (!error && raison) {
    const { data: c } = await supabase.from("candidats").select("recherche_en_cours").eq("user_id", user.id).maybeSingle();
    await supabase.from("candidats").update({ updated_at: new Date().toISOString(), ...(c?.recherche_en_cours ? {} : { recherche_en_cours: true }) }).eq("user_id", user.id);
    if (!c?.recherche_en_cours) after(() => rechercherPourCandidat(user.id));
  }
  revalidatePath("/espace");
}

export async function supprimerCompte() {
  const { user } = await exigerUtilisateur();
  const admin = createAdminClient();
  await admin.storage.from("cv").remove([`${user.id}/cv.pdf`]);
  await admin.auth.admin.deleteUser(user.id); // supprime aussi le profil et les correspondances
  redirect("/");
}

export type EtatCV = { erreur?: string; info?: string };

/** Dépôt (ou remplacement) du CV directement depuis l'onglet « Mon CV ». */
export async function deposerCV(_: EtatCV, f: FormData): Promise<EtatCV> {
  const { user, supabase } = await exigerUtilisateur();
  const fichier = f.get("cv");
  if (!(fichier instanceof File) || !fichier.size) return { erreur: "Choisis d'abord ton CV en PDF." };
  const r = await stockerCV(user.id, fichier);
  if ("erreur" in r) return r;
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  const lu = await analyserCV(r.octets, c?.poste_vise ?? "", c?.projet ?? "");
  const { ok, colonneConseilsManquante } = await majCandidat(supabase, {
    user_id: user.id,
    email: user.email!,
    cv_chemin: cheminCV(user.id),
    ...(lu ?? {}),
    updated_at: new Date().toISOString(),
    ...(c?.consentement ? { recherche_en_cours: true } : {}),
  });
  if (!ok) return { erreur: "Le CV est bien envoyé, mais l'enregistrement de ta fiche a échoué. Réessaie." };
  if (c?.consentement) after(() => rechercherPourCandidat(user.id));
  revalidatePath("/espace/cv");
  if (!lu) return { info: "Ton CV est bien enregistré. L'analyse n'a pas pu se faire pour l'instant : réessaie avec le bouton « Analyser mon CV »." };
  if (colonneConseilsManquante) return { info: "Ton CV est enregistré et lu, mais les conseils ne peuvent pas encore être sauvegardés (mise à jour de la base à faire par l'équipe)." };
  return {};
}

/** Relance l'analyse du CV déjà déposé. */
export async function relancerAnalyseCV(): Promise<EtatCV> {
  const { user, supabase } = await exigerUtilisateur();
  const octets = await telechargerCV(user.id);
  if (!octets) return { erreur: "Aucun CV trouvé : dépose-le d'abord." };
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  const lu = await analyserCV(octets, c?.poste_vise ?? "", c?.projet ?? "");
  if (!lu) return { erreur: "L'analyse a échoué. Réessaie dans quelques minutes ; si ça continue, préviens l'équipe." };
  const { ok, colonneConseilsManquante } = await majCandidat(supabase, {
    user_id: user.id, email: user.email!, ...lu, updated_at: new Date().toISOString(),
  });
  if (!ok) return { erreur: "L'enregistrement a échoué. Réessaie." };
  revalidatePath("/espace/cv");
  if (colonneConseilsManquante) return { info: "CV analysé, mais les conseils ne peuvent pas encore être sauvegardés (mise à jour de la base à faire par l'équipe)." };
  return {};
}

/* ---------- Plusieurs recherches ---------- */

export type EtatRecherche = { erreur?: string; ok?: boolean };

function lireRecherche(f: FormData) {
  return {
    poste: texte(f, "poste", 120),
    contrats: CONTRATS.map((c) => c.id).filter((id) => f.get(`contrat_${id}`) === "on"),
    mobilite_km: Math.max(1, Math.min(200, Number(f.get("mobilite_km")) || 20)),
  };
}

/** Relance la recherche en arrière-plan après un changement. */
async function relancer(userId: string) {
  const { supabase } = await exigerUtilisateur();
  await supabase.from("candidats").update({ recherche_en_cours: true }).eq("user_id", userId);
  after(() => rechercherPourCandidat(userId));
}

export async function ajouterRecherche(_: EtatRecherche, f: FormData): Promise<EtatRecherche> {
  const { user, supabase } = await exigerUtilisateur();
  const r = lireRecherche(f);
  if (!r.poste) return { erreur: "Indique le métier que tu recherches." };
  if (!r.contrats.length) return { erreur: "Choisis au moins un type de contrat." };
  const { count } = await supabase.from("recherches").select("id", { count: "exact", head: true }).eq("candidat_id", user.id);
  if ((count ?? 0) >= MAX_RECHERCHES) return { erreur: `Tu peux avoir ${MAX_RECHERCHES} recherches en plus de ta recherche principale.` };
  const { error } = await supabase.from("recherches").insert({ ...r, mots_cles: r.poste, candidat_id: user.id });
  if (error) return { erreur: "L'enregistrement a échoué. Si ça continue, préviens ton école (mise à jour du site à faire)." };
  await relancer(user.id);
  revalidatePath("/espace/recherches");
  return { ok: true };
}

export async function modifierRecherche(f: FormData) {
  const { user, supabase } = await exigerUtilisateur();
  const r = lireRecherche(f);
  if (!r.poste || !r.contrats.length) return;
  await supabase.from("recherches").update({ ...r, mots_cles: r.poste, active: f.get("active") === "on" }).eq("id", texte(f, "id", 60)).eq("candidat_id", user.id);
  await relancer(user.id);
  revalidatePath("/espace/recherches");
}

export async function supprimerRecherche(f: FormData) {
  const { user, supabase } = await exigerUtilisateur();
  await supabase.from("recherches").delete().eq("id", texte(f, "id", 60)).eq("candidat_id", user.id);
  revalidatePath("/espace/recherches");
  revalidatePath("/espace");
}

/* ---------- Pistes proposées par MagnusMatch ---------- */

export async function adopterPiste(f: FormData) {
  const { user, supabase } = await exigerUtilisateur();
  const metier = texte(f, "metier", 120);
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  const piste = (c?.pistes ?? []).find((p) => p.metier === metier);
  if (!c || !piste) return;
  const { data: r, error } = await supabase
    .from("recherches")
    .insert({ candidat_id: user.id, poste: piste.metier, mots_cles: piste.mots_cles || piste.metier, contrats: c.contrats, mobilite_km: c.mobilite_km })
    .select("id")
    .single();
  if (error || !r) return;
  // Les offres trouvées pour cette piste rejoignent la nouvelle recherche
  await createAdminClient().from("correspondances").update({ piste: null, recherche_id: r.id }).eq("candidat_id", user.id).eq("piste", metier);
  const pistes: Piste[] = (c.pistes ?? []).filter((p) => p.metier !== metier);
  await supabase.from("candidats").update({ pistes }).eq("user_id", user.id);
  await relancer(user.id);
  revalidatePath("/espace");
}

export async function ecarterPiste(f: FormData) {
  const { user, supabase } = await exigerUtilisateur();
  const metier = texte(f, "metier", 120);
  const { data: c } = await supabase.from("candidats").select("pistes").eq("user_id", user.id).maybeSingle();
  const pistes = ((c?.pistes ?? []) as Piste[]).map((p) => (p.metier === metier ? { ...p, ecartee: true } : p));
  await supabase.from("candidats").update({ pistes }).eq("user_id", user.id);
  revalidatePath("/espace");
}

/* ---------- Tests (DISC, style de management) ---------- */

async function passerMonTest(test: TestId, f: FormData): Promise<EtatTest> {
  const { user, supabase } = await exigerUtilisateur();
  // Un test ne se passe qu'une fois, sauf si l'équipe autorise à le repasser
  const droit = await peutPasserTest(user.id, test);
  if (!droit.peut) return { erreur: "Tu as déjà passé ce test. Pour le repasser, demande à ton conseiller." };
  const r = await enregistrerTest(user.id, test, f, "candidat");
  if (r.erreur) return r;
  if (droit.autorise) await createAdminClient().from("tests_autorisations").delete().eq("candidat_id", user.id).eq("test", test);
  // Sa couleur DISC affine les notes : on relance la notation
  if (test === "disc") {
    await supabase.from("candidats").update({ updated_at: new Date().toISOString(), recherche_en_cours: true }).eq("user_id", user.id);
    after(() => rechercherPourCandidat(user.id));
  }
  redirect(`/espace/tests?resultat=${test}`);
}
export async function passerTestDisc(_: EtatTest, f: FormData) { return passerMonTest("disc", f); }
export async function passerTestManagement(_: EtatTest, f: FormData) { return passerMonTest("management", f); }

/* ---------- CV amélioré ---------- */
export async function genererMonCvAmeliore(): Promise<{ erreur?: string }> {
  const { user } = await exigerUtilisateur();
  const r = await genererCvAmeliore(user.id);
  if (!r.erreur) revalidatePath("/espace/cv");
  return r;
}
