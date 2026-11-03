import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormEntretienConseil, type EtatEntretien } from "@/components/FormEntretienConseil";
import type { EntretienConseil, Reponses } from "@/lib/entretien-conseil";
import type { Candidat } from "@/lib/types";

/** Page « fiche d'entretien » commune à l'admin et à l'école (droits vérifiés par la page appelante). */
export async function PageEntretienConseil({ candidatId, eid, conseillerParDefaut, retour, action, ok }: {
  candidatId: string;
  eid: string;
  conseillerParDefaut: string;
  retour: string;
  action: (e: EtatEntretien, f: FormData) => Promise<EtatEntretien>;
  ok?: boolean;
}) {
  const db = createAdminClient();
  const { data: c } = await db.from("candidats").select("*").eq("user_id", candidatId).maybeSingle<Candidat>();
  if (!c) notFound();

  let initial: Partial<EntretienConseil> & { reponses: Reponses };
  if (eid !== "nouveau") {
    const { data } = await db.from("entretiens_conseil").select("*").eq("id", eid).eq("candidat_id", candidatId).maybeSingle<EntretienConseil>();
    if (!data) notFound();
    initial = data;
  } else {
    // Pré-remplissage à partir du profil
    const reponses: Reponses = {};
    if (c.cv_chemin) reponses.cv_a_jour = { coche: true, precision: "" };
    if (c.permis === "permis" || c.permis === "permis_vehicule") reponses.permis_b = { coche: true, precision: "" };
    if (c.permis === "permis_vehicule") reponses.vehicule = { coche: true, precision: "" };
    if (c.mobilite_km >= 20) reponses.mobile_20 = { coche: true, precision: "" };
    if (c.mobilite_km >= 50) reponses.mobile_50 = { coche: true, precision: "" };
    if (c.poste_vise) reponses.metier_identifie = { coche: true, precision: c.poste_vise };
    initial = {
      date_entretien: new Date().toISOString().slice(0, 10),
      formation: c.formation,
      conseiller: conseillerParDefaut,
      zone: [c.ville, c.code_postal].filter(Boolean).join(" ") + (c.mobilite_km ? ` · ${c.mobilite_km} km` : ""),
      reponses,
      partage: false,
    };
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href={retour} className="text-sm text-muted print:hidden">← Fiche de {c.nom || c.email}</Link>
      {ok && <p className="rounded-xl bg-good-soft p-4 text-sm text-good print:hidden">Fiche enregistrée.</p>}
      <FormEntretienConseil initial={initial} action={action} nomEtudiant={c.nom || c.email} candidatId={candidatId} />
    </div>
  );
}
