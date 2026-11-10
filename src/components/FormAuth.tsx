"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
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
  if (etat.info) return <p className="rounded-lg bg-good-soft p-4 text-good">{etat.info}</p>;
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {ecole && <input type="hidden" name="ecole" value={ecole} />}
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={email} />
      </div>
      <ChampMotDePasse nouveau={nouveauMotDePasse} aide={nouveauMotDePasse ? "8 caractères minimum" : undefined} />
      {!nouveauMotDePasse && <Link href="/mot-de-passe-oublie" className="-mt-2 self-end text-sm text-accent hover:underline">Mot de passe oublié ?</Link>}
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      <button className="btn btn-primary" disabled={enCours}>{enCours ? "Un instant…" : bouton}</button>
    </form>
  );
}
