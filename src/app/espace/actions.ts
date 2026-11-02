"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigerUtilisateur } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, lireCV, motsClesDepuisProfil } from "@/lib/ia";
import { rechercherPourCandidat } from "@/lib/matching";
import { AVIS, CONTRATS, type Candidat } from "@/lib/types";

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
    updated_at: new Date().toISOString(),
  };

  if (!donnees.nom || !donnees.poste_vise) return { erreur: "Indique au moins ton nom et le poste que tu vises." };
  if (!contrats.length) return { erreur: "Choisis au moins un type de contrat." };
  if (!donnees.consentement) return { erreur: "Coche la case d'accord pour que l'on puisse chercher des offres pour toi." };

  // CV en PDF : stocké en privé puis lu par l'IA
  const cv = f.get("cv");
  if (cv instanceof File && cv.size > 0) {
    if (cv.type !== "application/pdf") return { erreur: "Le CV doit être un fichier PDF." };
    if (cv.size > 3.5 * 1024 * 1024) return { erreur: "Le CV dépasse 3,5 Mo. Exporte-le en PDF plus léger." };
    const octets = Buffer.from(await cv.arrayBuffer());
    const chemin = `${user.id}/cv.pdf`;
    const { error } = await createAdminClient().storage.from("cv").upload(chemin, octets, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) return { erreur: "L'envoi du CV a échoué. Réessaie." };
    donnees.cv_chemin = chemin;
    if (iaConfiguree()) try {
      const lu = await lireCV(octets.toString("base64"), donnees.poste_vise);
      Object.assign(donnees, {
        cv_texte: lu.texte.slice(0, 6000),
        competences: lu.competences.slice(0, 10),
        mots_cles: lu.mots_cles,
      });
    } catch {
      return { erreur: "Nous n'avons pas réussi à lire ce CV. Vérifie que le PDF s'ouvre bien, puis réessaie." };
    }
  }
  if (!iaConfiguree()) {
    donnees.mots_cles ||= donnees.poste_vise;
  } else if (!(cv instanceof File && cv.size > 0) && (!donnees.mots_cles || avant?.poste_vise !== donnees.poste_vise)) {
    try {
      donnees.mots_cles = await motsClesDepuisProfil(donnees);
    } catch {
      donnees.mots_cles = donnees.poste_vise;
    }
  }

  const { error } = await supabase
    .from("candidats")
    .upsert({ ...donnees, recherche_en_cours: true }, { onConflict: "user_id" });
  if (error) return { erreur: "L'enregistrement a échoué. Réessaie dans un instant." };

  after(() => rechercherPourCandidat(user.id));
  redirect("/espace");
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
  await supabase
    .from("correspondances")
    .update({ avis_candidat: avis })
    .eq("candidat_id", user.id)
    .eq("offre_id", String(f.get("offre_id")));
  revalidatePath("/espace");
}

export async function supprimerCompte() {
  const { user } = await exigerUtilisateur();
  const admin = createAdminClient();
  await admin.storage.from("cv").remove([`${user.id}/cv.pdf`]);
  await admin.auth.admin.deleteUser(user.id); // supprime aussi le profil et les correspondances
  redirect("/");
}
