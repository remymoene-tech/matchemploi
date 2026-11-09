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
export function SelectEnregistrer({ name, defaultValue, options, label, motif, date }: {
  name: string; defaultValue: string; options: readonly { id: string; label: string }[]; label: string;
  /** Statuts qui demandent un motif écrit (ex. « perdu »), nom du champ et suggestions. */
  motif?: { pour: string[]; champ: string; actuel?: string; suggestions?: readonly string[] };
  /** Statuts qui demandent une date et une heure (ex. « convoqué au concours »). */
  date?: { pour: string[]; champ: string; actuelle?: string; aide?: string };
}) {
  const [valeur, setValeur] = useState(defaultValue);
  const demandeMotif = !!motif && motif.pour.includes(valeur) && valeur !== defaultValue;
  const demandeDate = !!date && date.pour.includes(valeur) && valeur !== defaultValue;
  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2">
        <select aria-label={label} name={name} value={valeur} onChange={(e) => setValeur(e.target.value)} className="input min-w-[10rem] py-1.5 text-sm">
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <Bouton modifie={valeur !== defaultValue} />
      </span>
      {demandeDate && date && (
        <>
          <input className="input py-1.5 text-sm" type="datetime-local" name={date.champ} required defaultValue={date.actuelle ?? ""} aria-label="Date et heure (obligatoire)" />
          {date.aide && <span className="text-xs text-muted">{date.aide}</span>}
        </>
      )}
      {demandeMotif && motif && (
        <>
          <input className="input py-1.5 text-sm" name={motif.champ} required minLength={3} autoFocus defaultValue={motif.actuel ?? ""}
            placeholder="Motif (obligatoire)" list={`${motif.champ}-suggestions`} aria-label="Motif" />
          {motif.suggestions && <datalist id={`${motif.champ}-suggestions`}>{motif.suggestions.map((x) => <option key={x} value={x} />)}</datalist>}
        </>
      )}
    </span>
  );
}
