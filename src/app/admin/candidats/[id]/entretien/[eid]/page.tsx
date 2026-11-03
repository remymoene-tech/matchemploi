import { exigerAdmin } from "@/lib/auth";
import { PageEntretienConseil } from "@/components/PageEntretienConseil";
import { enregistrerEntretienAdmin } from "../../../../actions";

export const metadata = { title: "Fiche d'entretien · MagnusMatch" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; eid: string }>; searchParams: Promise<{ ok?: string }> }) {
  await exigerAdmin();
  const { id, eid } = await params;
  const { ok } = await searchParams;
  return (
    <PageEntretienConseil
      candidatId={id} eid={eid} ok={Boolean(ok)}
      conseillerParDefaut={process.env.NOM_EXPEDITEUR?.split("–")[0].trim() || ""}
      retour={`/admin/candidats/${id}?onglet=suivi`}
      action={enregistrerEntretienAdmin}
    />
  );
}
