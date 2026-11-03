import { exigerAdmin } from "@/lib/auth";
import { FicheCandidat } from "@/components/FicheCandidat";
import { changerSuivi } from "../../actions";

export const metadata = { title: "Fiche candidat · Jobaprox" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  await exigerAdmin();
  const { id } = await params;
  return (
    <FicheCandidat
      candidatId={id}
      onglet={onglet === "suivi" ? "suivi" : "profil"}
      baseFiche={`/admin/candidats/${id}`}
      cheminCV={`/admin/cv/${id}`}
      retour={{ href: "/admin?vue=candidats", libelle: "Tous les candidats" }}
      changerSuivi={changerSuivi}
    />
  );
}
