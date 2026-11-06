import { exigerAdmin } from "@/lib/auth";
import { FicheCandidat } from "@/components/FicheCandidat";
import { changerDiplomeAdmin, changerAdmissionAdmin, autoriserTestAdmin, changerSuivi, ajouterEchangeAdmin, actionFaiteAdmin, genererCvAmelioreAdmin, supprimerEchangeAdmin, genererSyntheseAdmin } from "../../actions";

export const metadata = { title: "Fiche candidat · MagnusMatch" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  await exigerAdmin();
  const { id } = await params;
  return (
    <FicheCandidat
      candidatId={id}
      autoriserTest={autoriserTestAdmin}
      genererSynthese={genererSyntheseAdmin}
      genererCvAmeliore={genererCvAmelioreAdmin}
      ajouterEchange={ajouterEchangeAdmin}
      supprimerEchange={supprimerEchangeAdmin}
      changerAdmission={changerAdmissionAdmin}
      changerDiplome={changerDiplomeAdmin}
      actionFaite={actionFaiteAdmin}
      onglet={onglet === "suivi" || onglet === "cv" || onglet === "offres" || onglet === "echanges" ? onglet : "profil"}
      baseFiche={`/admin/candidats/${id}`}
      cheminCV={`/admin/cv/${id}`}
      retour={{ href: "/admin?vue=candidats", libelle: "Tous les candidats" }}
      changerSuivi={changerSuivi}
    />
  );
}
