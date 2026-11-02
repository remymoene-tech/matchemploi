"use client";

import { useActionState } from "react";
import { deposerCV, relancerAnalyseCV, type EtatCV } from "@/app/espace/actions";

function Message({ etat }: { etat: EtatCV }) {
  if (etat.erreur) return <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>;
  if (etat.info) return <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm">{etat.info}</p>;
  return null;
}

export function FormCV({ dejaDepose }: { dejaDepose: boolean }) {
  const [etat, action, enCours] = useActionState<EtatCV, FormData>(deposerCV, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="input w-full sm:max-w-sm sm:flex-1 file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:font-semibold file:text-accent"
          type="file" name="cv" accept="application/pdf" aria-label="Fichier PDF du CV" required
        />
        <button className={`btn w-full sm:w-auto ${dejaDepose ? "" : "btn-primary"}`} disabled={enCours}>
          {enCours ? "Envoi et analyse… (30 s environ)" : dejaDepose ? "Remplacer et analyser" : "Déposer et analyser"}
        </button>
      </div>
      <span className="hint">PDF, 3,5 Mo maximum.</span>
      <Message etat={etat} />
    </form>
  );
}

export function BoutonAnalyser() {
  const [etat, action, enCours] = useActionState<EtatCV, FormData>(relancerAnalyseCV, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <button className="btn btn-primary w-fit" disabled={enCours}>{enCours ? "Analyse en cours… (30 s environ)" : "Analyser mon CV"}</button>
      <Message etat={etat} />
    </form>
  );
}
