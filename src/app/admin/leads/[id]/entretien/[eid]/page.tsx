import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAcces } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormEntretienConseil } from "@/components/FormEntretienConseil";
import { leadParId, nomLead } from "@/lib/leads";
import type { EntretienConseil, Reponses } from "@/lib/entretien-conseil";
import { enregistrerEntretienLead } from "../../../../actions";

export const metadata = { title: "Entretien d'admission · MagnusMatch" };

/** Fiche d'entretien d'admission d'un lead (la même que celle des candidats ; elle le suivra dans son espace). */
export default async function EntretienLead({ params, searchParams }: { params: Promise<{ id: string; eid: string }>; searchParams: Promise<{ ok?: string }> }) {
  await exigerAcces("leads");
  const { id, eid } = await params;
  const { ok } = await searchParams;
  const l = await leadParId(id);
  if (!l) notFound();
  let initial: Partial<EntretienConseil> & { reponses: Reponses };
  if (eid !== "nouveau") {
    const { data } = await createAdminClient().from("entretiens_conseil").select("*").eq("id", eid).eq("lead_id", id).maybeSingle<EntretienConseil>();
    if (!data) notFound();
    initial = data;
  } else {
    initial = {
      date_entretien: (l.entretien_a ?? new Date().toISOString()).slice(0, 10),
      formation: l.formation,
      conseiller: process.env.NOM_EXPEDITEUR?.split("–")[0].trim() || "",
      zone: "",
      reponses: {},
    };
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href={`/admin/leads/${id}?onglet=entretien`} className="text-sm text-muted print:hidden">← Fiche de {nomLead(l)}</Link>
      {ok && <p className="rounded-xl bg-good-soft p-4 text-sm text-good print:hidden">Fiche enregistrée. Passe ensuite le lead en « ✅ Admis » s&apos;il est retenu.</p>}
      <FormEntretienConseil initial={initial} action={enregistrerEntretienLead} nomEtudiant={nomLead(l)} candidatId={id} champ="lead_id" />
    </div>
  );
}
