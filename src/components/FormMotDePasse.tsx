"use client";

import { useActionState } from "react";
import type { EtatForm } from "@/app/(auth)/actions";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";

/** Petits formulaires « mot de passe oublié » (email) et « nouveau mot de passe » (deux champs). */
export function FormMotDePasse({ action, mode }: { action: (e: EtatForm, f: FormData) => Promise<EtatForm>; mode: "oubli" | "nouveau" }) {
  const [etat, formAction, enCours] = useActionState(action, {});
  if (etat.info) return <p className="rounded-lg bg-good-soft px-3 py-3 text-sm text-good">📬 {etat.info}</p>;
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "oubli" ? (
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="email">Ton adresse email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
      ) : (
        <>
          <ChampMotDePasse label="Nouveau mot de passe" nouveau aide="8 caractères minimum" />
          <ChampMotDePasse id="confirmation" name="confirmation" label="Confirme le mot de passe" nouveau />
        </>
      )}
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      <button className="btn btn-primary" disabled={enCours}>{enCours ? "Un instant…" : mode === "oubli" ? "📧 Recevoir le lien" : "Enregistrer mon nouveau mot de passe"}</button>
    </form>
  );
}
