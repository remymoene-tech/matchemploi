"use client";

import { useActionState, useState } from "react";
import type { EtatForm } from "@/app/(auth)/actions";

export function FormAuth({
  action,
  bouton,
  nouveauMotDePasse,
  ecole,
  email,
}: {
  action: (etat: EtatForm, form: FormData) => Promise<EtatForm>;
  bouton: string;
  nouveauMotDePasse?: boolean;
  ecole?: string;
  /** Email pré-rempli (lien d'invitation après admission). */
  email?: string;
}) {
  const [etat, formAction, enCours] = useActionState(action, {});
  const [voir, setVoir] = useState(false);
  if (etat.info) return <p className="rounded-lg bg-good-soft p-4 text-good">{etat.info}</p>;
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {ecole && <input type="hidden" name="ecole" value={ecole} />}
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={email} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="password">Mot de passe</label>
        <div className="relative">
          <input
            className="input w-full pr-12"
            id="password"
            name="password"
            type={voir ? "text" : "password"}
            minLength={8}
            autoComplete={nouveauMotDePasse ? "new-password" : "current-password"}
            required
          />
          <button
            type="button"
            onClick={() => setVoir((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted hover:text-ink"
            aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={voir}
            title={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {voir ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
        {nouveauMotDePasse && <span className="hint">8 caractères minimum</span>}
      </div>
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      <button className="btn btn-primary" disabled={enCours}>{enCours ? "Un instant…" : bouton}</button>
    </form>
  );
}
