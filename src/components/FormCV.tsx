"use client";

import { startTransition, useActionState, useState } from "react";
import { envoyerCV } from "@/lib/depot-cv-client";
import { deposerCV, relancerAnalyseCV, type EtatCV } from "@/app/espace/actions";

function Message({ etat }: { etat: EtatCV }) {
  if (etat.erreur) return <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>;
  if (etat.info) return <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm">{etat.info}</p>;
  return null;
}

export function FormCV({ dejaDepose }: { dejaDepose: boolean }) {
  const [etat, action, enCours] = useActionState<EtatCV, FormData>(deposerCV, {});
  const [envoi, setEnvoi] = useState(false);
  const [erreurLocale, setErreurLocale] = useState("");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setErreurLocale("");
        const cv = new FormData(e.currentTarget).get("cv");
        if (!(cv instanceof File) || !cv.size) { setErreurLocale("Choisis d'abord ton CV en PDF."); return; }
        setEnvoi(true);
        const err = await envoyerCV(cv);
        setEnvoi(false);
        if (err) { setErreurLocale(err); return; }
        const fd = new FormData();
        fd.set("cv_depose", "1");
        startTransition(() => action(fd));
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="input w-full sm:max-w-sm sm:flex-1 file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:font-semibold file:text-accent"
          type="file" name="cv" accept="application/pdf" aria-label="Fichier PDF du CV" required
        />
        <button className={`btn w-full sm:w-auto ${dejaDepose ? "" : "btn-primary"}`} disabled={enCours || envoi}>
          {envoi ? "Envoi du CV…" : enCours ? "Analyse… (30 s environ)" : dejaDepose ? "Remplacer et analyser" : "Déposer et analyser"}
        </button>
      </div>
      <span className="hint">PDF, 10 Mo maximum.</span>
      {erreurLocale ? <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{erreurLocale}</p> : <Message etat={etat} />}
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
