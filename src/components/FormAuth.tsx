"use client";

import { useActionState } from "react";
import type { EtatForm } from "@/app/(auth)/actions";

export function FormAuth({
  action,
  bouton,
  nouveauMotDePasse,
}: {
  action: (etat: EtatForm, form: FormData) => Promise<EtatForm>;
  bouton: string;
  nouveauMotDePasse?: boolean;
}) {
  const [etat, formAction, enCours] = useActionState(action, {});
  if (etat.info) return <p className="rounded-lg bg-good-soft p-4 text-good">{etat.info}</p>;
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="password">Mot de passe</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete={nouveauMotDePasse ? "new-password" : "current-password"}
          required
        />
        {nouveauMotDePasse && <span className="hint">8 caractères minimum</span>}
      </div>
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      <button className="btn btn-primary" disabled={enCours}>{enCours ? "Un instant…" : bouton}</button>
    </form>
  );
}
