import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { accesFiche } from "@/app/entretien/acces";
import { CvRendu } from "@/components/CvRendu";
import { BoutonImprimer } from "@/components/BoutonFiche";
import type { Candidat } from "@/lib/types";

export const metadata = { title: "CV · Jobaprox" };

/** CV amélioré prêt à imprimer : visible par le candidat lui-même et par son équipe. */
export default async function CvImprimable({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await accesFiche(id);
  if (!acces) notFound();
  const { data: c } = await createAdminClient().from("candidats").select("nom, cv_ameliore").eq("user_id", id).maybeSingle<Pick<Candidat, "nom" | "cv_ameliore">>();
  if (!c?.cv_ameliore) notFound();
  const retour = acces.role === "candidat" ? "/espace/cv" : `${acces.retour === "/admin" ? "/admin/candidats" : "/ecole/etudiants"}/${id}?onglet=cv`;
  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-[800px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={retour} className="text-sm text-muted">← Retour</Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Dans la fenêtre d&apos;impression, choisis « Enregistrer au format PDF ».</span>
          <BoutonImprimer libelle="Imprimer ou enregistrer en PDF" />
        </div>
      </div>
      {!!c.cv_ameliore.a_completer?.length && (
        <div className="mx-auto w-full max-w-[800px] rounded-xl bg-warn-soft p-4 text-sm print:hidden">
          <b>À compléter avant d&apos;envoyer ce CV :</b> {c.cv_ameliore.a_completer.join(" · ")}
        </div>
      )}
      <div className="rounded-xl border border-line shadow-sm print:border-0 print:shadow-none"><CvRendu cv={c.cv_ameliore} /></div>
    </div>
  );
}
