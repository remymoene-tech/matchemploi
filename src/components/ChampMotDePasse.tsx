"use client";

import { useState } from "react";

/** Champ mot de passe avec un œil pour l'afficher ou le masquer. */
export function ChampMotDePasse({ id = "password", name = "password", label = "Mot de passe", nouveau = false, aide }: { id?: string; name?: string; label?: string; nouveau?: boolean; aide?: string }) {
  const [voir, setVoir] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input className="input w-full pr-12" id={id} name={name} type={voir ? "text" : "password"} minLength={8}
          autoComplete={nouveau ? "new-password" : "current-password"} required />
        <button type="button" onClick={() => setVoir((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted hover:text-ink"
          aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={voir}
          title={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
          {voir ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>
      {aide && <span className="hint">{aide}</span>}
    </div>
  );
}
