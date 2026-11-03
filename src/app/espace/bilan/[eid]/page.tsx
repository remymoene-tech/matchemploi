import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { VueEntretienConseil } from "@/components/VueEntretienConseil";
import { BoutonImprimer } from "@/components/BoutonFiche";
import type { EntretienConseil } from "@/lib/entretien-conseil";

export const metadata = { title: "Mon bilan · Jobaprox" };

export default async function MonBilan({ params }: { params: Promise<{ eid: string }> }) {
  const { eid } = await params;
  const { user, supabase } = await exigerUtilisateur();
  // La base ne renvoie la fiche que si elle appartient à l'étudiant ET qu'elle a été partagée
  const { data } = await supabase.from("entretiens_conseil").select("*").eq("id", eid).eq("candidat_id", user.id).maybeSingle<EntretienConseil>();
  if (!data) notFound();
  const { data: c } = await supabase.from("candidats").select("nom").eq("user_id", user.id).maybeSingle();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/espace" className="text-sm text-muted">← Mes offres</Link>
        <BoutonImprimer />
      </div>
      <VueEntretienConseil e={data} nomEtudiant={c?.nom || user.email || ""} />
    </div>
  );
}
