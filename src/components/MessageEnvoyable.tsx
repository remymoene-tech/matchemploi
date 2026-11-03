"use client";

import { useActionState, useRef, useState } from "react";
import type { EtatEnvoi } from "@/lib/envoi-message";

/** Message modifiable : on peut le copier, ou l'envoyer directement depuis MagnusJob. */
export function MessageEnvoyable({
  titre, cible, candidatId, offreId, email, autresCoordonnees, objet, texte, action, envoiPossible,
}: {
  titre: string;
  cible: "etudiant" | "entreprise";
  candidatId: string;
  offreId: string;
  email: string;
  autresCoordonnees: string;
  objet: string;
  texte: string;
  action: (e: EtatEnvoi, f: FormData) => Promise<EtatEnvoi>;
  envoiPossible: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState<EtatEnvoi, FormData>(action, {});
  const zone = useRef<HTMLTextAreaElement>(null);
  const [copie, setCopie] = useState(false);
  const id = `${cible}-${candidatId}-${offreId}`;

  return (
    <form action={envoyer} className="flex min-w-0 flex-col gap-2">
      <span className="eyebrow">{titre}</span>
      <input type="hidden" name="cible" value={cible} />
      <input type="hidden" name="candidat_id" value={candidatId} />
      <input type="hidden" name="offre_id" value={offreId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">À</span>
        <input className="input py-1.5 text-sm" name="a" type="email" defaultValue={email} placeholder="adresse@email.fr" id={`a-${id}`} />
      </label>
      {autresCoordonnees && <p className="text-xs text-muted">{autresCoordonnees}</p>}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Objet</span>
        <input className="input py-1.5 text-sm" name="objet" defaultValue={objet} id={`o-${id}`} />
      </label>
      <textarea ref={zone} className="input min-h-56 text-sm leading-relaxed" name="texte" defaultValue={texte} id={`t-${id}`} aria-label="Message" />
      <div className="flex flex-wrap items-center gap-2">
        {envoiPossible && (
          <button className="btn btn-primary btn-sm" disabled={enCours || Boolean(etat.envoye)}>
            {enCours ? "Envoi…" : etat.envoye ? "Envoyé ✓" : "Envoyer"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(zone.current?.value ?? texte);
              setCopie(true);
              setTimeout(() => setCopie(false), 2000);
            } catch { /* texte sélectionnable à la main */ }
          }}
        >
          {copie ? "Copié ✓" : "Copier le texte"}
        </button>
      </div>
      {etat.envoye && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{etat.envoye}</p>}
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
    </form>
  );
}
