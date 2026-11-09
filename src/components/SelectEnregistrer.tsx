"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function Bouton({ modifie }: { modifie: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-sm whitespace-nowrap ${modifie ? "btn-primary" : ""}`} disabled={!modifie || pending}>
      {pending ? "…" : "Enregistrer"}
    </button>
  );
}

/** Liste déroulante + bouton « Enregistrer » (le choix n'est validé qu'au clic). */
export function SelectEnregistrer({ name, defaultValue, options, label }: {
  name: string; defaultValue: string; options: readonly { id: string; label: string }[]; label: string;
}) {
  const [valeur, setValeur] = useState(defaultValue);
  return (
    <span className="flex items-center gap-2">
      <select aria-label={label} name={name} value={valeur} onChange={(e) => setValeur(e.target.value)} className="input py-1.5 text-sm">
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <Bouton modifie={valeur !== defaultValue} />
    </span>
  );
}
