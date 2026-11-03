import { exigerAdmin } from "@/lib/auth";
import { FicheCandidat } from "@/components/FicheCandidat";
import { changerSuivi } from "../../actions";

export const metadata = { title: "Fiche candidat · Jobaprox" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin();
  const { id } = await params;
  return (
    <FicheCandidat
      candidatId={id}
      cheminCV={`/admin/cv/${id}`}
      retour={{ href: "/admin?vue=candidats", libelle: "Tous les candidats" }}
      changerSuivi={changerSuivi}
    />
  );
}
