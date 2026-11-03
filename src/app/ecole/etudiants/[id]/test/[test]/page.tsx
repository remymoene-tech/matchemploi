import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerResponsable } from "@/lib/ecoles";
import { createAdminClient } from "@/lib/supabase/admin";
import { TESTS } from "@/lib/tests";
import { FormTestDisc, FormTestManagement } from "@/components/FormTests";
import { passerTestDiscEcole, passerTestManagementEcole } from "../../../../actions";
import type { Candidat } from "@/lib/types";

export const metadata = { title: "Faire passer un test · MagnusJob" };

export default async function Page({ params }: { params: Promise<{ id: string; test: string }> }) {
  const { ecole } = await exigerResponsable();
  const { id, test } = await params;
  const t = TESTS.find((x) => x.id === test);
  const { data: c } = await createAdminClient().from("candidats").select("*").eq("user_id", id).maybeSingle<Candidat>();
  if (!t || !c) notFound();
  if (c.ecole_id !== ecole.id) notFound();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href={`/ecole/etudiants/${id}?onglet=suivi`} className="text-sm text-muted">← Fiche de {c.nom || c.email}</Link>
      <div>
        <span className="eyebrow">Test passé avec un conseiller</span>
        <h1 className="text-3xl font-extrabold">{t.nom} · {c.nom || c.email}</h1>
        <p className="text-muted">Lis les questions avec l&apos;étudiant et coche ses réponses.</p>
      </div>
      {t.id === "disc" ? <FormTestDisc action={passerTestDiscEcole} candidatId={id} /> : <FormTestManagement action={passerTestManagementEcole} candidatId={id} />}
    </div>
  );
}
