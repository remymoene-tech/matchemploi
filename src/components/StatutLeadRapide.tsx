"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Statut = { id: string; label: string };

function Bouton({ actif }: { actif: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary btn-sm" disabled={!actif || pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>;
}

/** Barre de statut en haut de la fiche lead : les champs utiles apparaissent selon le statut choisi. */
export function StatutLeadRapide({ id, statut, statuts, motifs, motifActuel, entretienLocal, email, action }: {
  id: string;
  statut: string;
  statuts: readonly Statut[];
  motifs: readonly string[];
  motifActuel: string;
  entretienLocal: string;
  email: string;
  action: (f: FormData) => Promise<void>;
}) {
  const [choix, setChoix] = useState(statut);
  const change = choix !== statut;
  return (
    <form action={action} className={`flex flex-col gap-3 rounded-2xl border-2 p-3 ${choix === "perdu" ? "border-bad bg-bad-soft" : choix === "admis" ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Où on en est :</span>
        {statuts.map((s) => (
          <label key={s.id} className="flex cursor-pointer items-center rounded-full border border-line bg-surface px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
            <input type="radio" name="statut" value={s.id} checked={choix === s.id} onChange={() => setChoix(s.id)} className="sr-only" />
            {s.label}
          </label>
        ))}
      </div>

      {choix === "convoque" && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">📅 Date et heure de l&apos;entretien d&apos;admission <span className="text-bad">*</span></span>
            <input className="input" type="datetime-local" name="entretien_a" required defaultValue={entretienLocal} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="convocation" defaultChecked className="accent-[var(--accent)]" />
            ✉️ Envoyer la convocation à {email || "(pas d'email)"}
          </label>
          <span className="w-full text-xs text-muted">Rappel par email la veille pour le lead, et rappel 🔔 une heure avant pour toi.</span>
        </div>
      )}

      {choix === "perdu" && (
        <label className="flex flex-col gap-1 rounded-xl bg-surface p-3 text-sm">
          <span className="font-semibold">Motif <span className="text-bad">*</span></span>
          <input className="input" name="motif_perte" required minLength={3} list="motifs-rapide" defaultValue={motifActuel} placeholder="Ex. A choisi une autre école" />
          <datalist id="motifs-rapide">{motifs.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
      )}

      {choix === "admis" && change && (
        <p className="rounded-xl bg-surface p-3 text-sm">🎉 En enregistrant, il reçoit par email son lien pour créer son espace MagnusMatch (tests, matching entreprises).</p>
      )}

      <div className="flex justify-end"><Bouton actif={change || choix === "convoque"} /></div>
    </form>
  );
}
