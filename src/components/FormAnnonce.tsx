"use client";

import { useActionState } from "react";
import { importerAnnonce, type EtatAnnonce } from "@/app/admin/actions";

export function FormAnnonce({ action: actionServeur = importerAnnonce }: { action?: (e: EtatAnnonce, f: FormData) => Promise<EtatAnnonce> }) {
  const [etat, action, enCours] = useActionState<EtatAnnonce, FormData>(actionServeur, {});
  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="lien">Lien de l&apos;annonce (facultatif)</label>
        <input className="input" id="lien" name="lien" type="url" placeholder="https://fr.indeed.com/…" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="texte">Texte de l&apos;annonce</label>
        <textarea className="input min-h-64" id="texte" name="texte" placeholder="Colle ici tout le texte de l'annonce" required />
      </div>
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={enCours}>{enCours ? "Lecture de l'annonce…" : "Créer la fiche"}</button>
      </div>
    </form>
  );
}
