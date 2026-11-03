"use client";

import { useActionState } from "react";

export function BoutonSynthese({ candidatId, action, libelle, actif }: {
  candidatId: string;
  action: (e: { erreur?: string }, f: FormData) => Promise<{ erreur?: string }>;
  libelle: string;
  actif: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState<{ erreur?: string }, FormData>(action, {});
  return (
    <form action={envoyer} className="flex flex-col items-end gap-2">
      <input type="hidden" name="candidat_id" value={candidatId} />
      <button className="btn btn-primary btn-sm" disabled={enCours || !actif}>{enCours ? "Jobaprox rédige… (30 s environ)" : libelle}</button>
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
    </form>
  );
}
