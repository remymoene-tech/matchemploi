import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TESTS } from "@/lib/tests";
import { FormTestDisc, FormTestManagement } from "@/components/FormTests";
import { passerTestDiscAdmin, passerTestManagementAdmin } from "../../../../actions";
import type { Candidat } from "@/lib/types";

export const metadata = { title: "Faire passer un test · MagnusMatch" };

export default async function Page({ params }: { params: Promise<{ id: string; test: string }> }) {
  await exigerAdmin();
  const { id, test } = await params;
  const t = TESTS.find((x) => x.id === test);
  const { data: c } = await createAdminClient().from("candidats").select("*").eq("user_id", id).maybeSingle<Candidat>();
  if (!t || !c) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href={`/admin/candidats/${id}?onglet=suivi`} className="text-sm text-muted">← Fiche de {c.nom || c.email}</Link>
      <div>
        <span className="eyebrow">Test passé avec un conseiller</span>
        <h1 className="text-3xl font-extrabold">{t.nom} · {c.nom || c.email}</h1>
        <p className="text-muted">Lis les questions avec l&apos;étudiant et coche ses réponses.</p>
      </div>
      {t.id === "disc" ? <FormTestDisc action={passerTestDiscAdmin} candidatId={id} /> : <FormTestManagement action={passerTestManagementAdmin} candidatId={id} />}
    </div>
  );
}
