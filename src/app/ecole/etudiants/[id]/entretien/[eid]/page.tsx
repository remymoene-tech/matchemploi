import { notFound } from "next/navigation";
import { exigerResponsable } from "@/lib/ecoles";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageEntretienConseil } from "@/components/PageEntretienConseil";
import { enregistrerEntretienEcole } from "../../../../actions";

export const metadata = { title: "Fiche d'entretien · Jobaprox" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; eid: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { user, ecole } = await exigerResponsable();
  const { id, eid } = await params;
  const { ok } = await searchParams;
  const db = createAdminClient();
  const { data } = await db.from("candidats").select("user_id").eq("user_id", id).eq("ecole_id", ecole.id).maybeSingle();
  if (!data) notFound();
  const { data: r } = await db.from("responsables").select("nom").eq("email", user.email!.toLowerCase()).maybeSingle();
  return (
    <PageEntretienConseil
      candidatId={id} eid={eid} ok={Boolean(ok)}
      conseillerParDefaut={r?.nom || ""}
      retour={`/ecole/etudiants/${id}?onglet=suivi`}
      action={enregistrerEntretienEcole}
    />
  );
}
