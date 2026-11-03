"use client";

import { useActionState, useRef } from "react";
import { ajouterRecherche, type EtatRecherche } from "@/app/espace/actions";
import { CONTRATS } from "@/lib/types";

/** Ajout d'une nouvelle recherche (métier, contrats, distance). */
export function FormNouvelleRecherche({ contratsParDefaut, distanceParDefaut }: { contratsParDefaut: string[]; distanceParDefaut: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [etat, action, enCours] = useActionState<EtatRecherche, FormData>(async (e, f) => {
    const r = await ajouterRecherche(e, f);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});
  return (
    <form ref={formRef} action={action} className="card flex flex-col gap-4 p-5">
      <h2 className="text-lg font-semibold">Ajouter une recherche</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="n_poste">Métier recherché</label>
          <input className="input" id="n_poste" name="poste" placeholder="Ex. Chargé de recrutement" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="n_km">Distance (km)</label>
          <input className="input" id="n_km" name="mobilite_km" type="number" min={1} max={200} defaultValue={distanceParDefaut} />
        </div>
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="label mb-1">Types de contrat</legend>
        {CONTRATS.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
            <input type="checkbox" name={`contrat_${t.id}`} defaultChecked={contratsParDefaut.includes(t.id)} className="accent-[var(--accent)]" />
            {t.label}
          </label>
        ))}
      </fieldset>
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      {etat.ok && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">Recherche ajoutée : MagnusMatch cherche déjà les offres.</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={enCours}>{enCours ? "Ajout…" : "Ajouter cette recherche"}</button>
      </div>
    </form>
  );
}
