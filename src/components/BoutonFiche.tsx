"use client";

import { useActionState } from "react";
import { preparerFiche, type EtatFiche } from "@/app/entretien/actions";

export function BoutonFiche({ candidat, offre, forcer, libelle }: { candidat: string; offre: string; forcer?: boolean; libelle: string }) {
  const [etat, action, enCours] = useActionState<EtatFiche, FormData>(preparerFiche, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="candidat_id" value={candidat} />
      <input type="hidden" name="offre_id" value={offre} />
      {forcer && <input type="hidden" name="forcer" value="1" />}
      <button className={`btn w-fit ${forcer ? "btn-sm" : "btn-primary"}`} disabled={enCours}>
        {enCours ? "MagnusMatch prépare la fiche… (30 s environ)" : libelle}
      </button>
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
    </form>
  );
}

export function BoutonImprimer({ libelle = "Imprimer la fiche" }: { libelle?: string }) {
  return <button type="button" className="btn btn-sm print:hidden" onClick={() => window.print()}>{libelle}</button>;
}
