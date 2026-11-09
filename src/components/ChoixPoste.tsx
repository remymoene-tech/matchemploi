"use client";

import { useState } from "react";

/** Intitulé de poste : liste de choix, ou « Autre » avec un texte libre. */
export function ChoixPoste({ postes, actuel = "" }: { postes: readonly string[]; actuel?: string }) {
  const connu = !actuel || postes.includes(actuel);
  const [choix, setChoix] = useState(connu ? actuel || postes[0] : "autre");
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="font-semibold" htmlFor="poste_choix">Intitulé de poste</label>
      <select id="poste_choix" className="input" name="poste_choix" value={choix} onChange={(e) => setChoix(e.target.value)}>
        {postes.map((p) => <option key={p} value={p}>{p}</option>)}
        <option value="autre">Autre…</option>
      </select>
      {choix === "autre" && (
        <input className="input" name="poste_autre" maxLength={120} required defaultValue={connu ? "" : actuel} placeholder="Écris l'intitulé du poste" autoFocus />
      )}
    </div>
  );
}
