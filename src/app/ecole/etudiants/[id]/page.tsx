import { notFound } from "next/navigation";
import { exigerResponsable } from "@/lib/ecoles";
import { createAdminClient } from "@/lib/supabase/admin";
import { FicheCandidat } from "@/components/FicheCandidat";
import { autoriserTestEcole, changerSuiviEcole, ajouterEchangeEcole, actionFaiteEcole, genererCvAmelioreEcole, supprimerEchangeEcole, genererSyntheseEcole } from "../../actions";

export const metadata = { title: "Fiche étudiant · MagnusMatch" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  const { ecole } = await exigerResponsable();
  const { id } = await params;
  // Une école ne voit que ses propres étudiants
  const { data } = await createAdminClient().from("candidats").select("user_id").eq("user_id", id).eq("ecole_id", ecole.id).maybeSingle();
  if (!data) notFound();
  return (
    <FicheCandidat
      candidatId={id}
      autoriserTest={autoriserTestEcole}
      genererSynthese={genererSyntheseEcole}
      genererCvAmeliore={genererCvAmelioreEcole}
      ajouterEchange={ajouterEchangeEcole}
      supprimerEchange={supprimerEchangeEcole}
      actionFaite={actionFaiteEcole}
      onglet={onglet === "suivi" || onglet === "cv" || onglet === "offres" || onglet === "echanges" ? onglet : "profil"}
      baseFiche={`/ecole/etudiants/${id}`}
      cheminCV={`/ecole/cv/${id}`}
      retour={{ href: "/ecole?vue=etudiants", libelle: "Tous mes étudiants" }}
      changerSuivi={changerSuiviEcole}
    />
  );
}
