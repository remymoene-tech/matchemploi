"use client";

import { useActionState, useRef, useState } from "react";

const TYPES = [
  { id: "telephone", label: "Téléphone", icone: "📞" },
  { id: "email", label: "Email", icone: "✉️" },
  { id: "sms", label: "SMS", icone: "💬" },
  { id: "rdv", label: "Rendez-vous", icone: "🤝" },
  { id: "autre", label: "Autre", icone: "📝" },
];

/** Formulaire « Noter un échange » : type, date, ce qui s'est dit, prochaine action facultative. */
export function FormEchange({ candidatId, action }: {
  candidatId: string;
  action: (e: { erreur?: string; ok?: boolean }, f: FormData) => Promise<{ erreur?: string; ok?: boolean }>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [relance, setRelance] = useState(false);
  const [etat, envoyer, enCours] = useActionState(async (e: { erreur?: string; ok?: boolean }, f: FormData) => {
    const r = await action(e, f);
    if (r.ok) { form.current?.reset(); setRelance(false); }
    return r;
  }, {});
  const maintenant = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  return (
    <form ref={form} action={envoyer} className="flex flex-col gap-3">
      <input type="hidden" name="candidat_id" value={candidatId} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Type d&apos;échange</legend>
        {TYPES.map((t, i) => (
          <label key={t.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
            <input type="radio" name="type" value={t.id} defaultChecked={i === 0} className="sr-only" />
            <span aria-hidden>{t.icone}</span>{t.label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1 sm:w-64">
        <label className="label" htmlFor="date_echange">Date et heure</label>
        <input className="input" id="date_echange" name="date_echange" type="datetime-local" defaultValue={maintenant()} suppressHydrationWarning />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="resume">Ce qui s&apos;est dit</label>
        <textarea className="input min-h-24 text-sm" id="resume" name="resume" required placeholder="Ex. A envoyé 3 candidatures cette semaine, entretien chez Leclerc jeudi. Hésite encore entre vente et accueil." />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={relance} onChange={(e) => setRelance(e.target.checked)} className="accent-[var(--accent)]" />
        Prévoir une prochaine action (relance, rappel…)
      </label>
      {relance && (
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="action">Prochaine action</label>
            <input className="input" id="action" name="action" placeholder="Ex. Le rappeler pour savoir comment s'est passé l'entretien" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="action_le">À faire le</label>
            <input className="input" id="action_le" name="action_le" type="date" />
          </div>
        </div>
      )}
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      {etat.ok && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">Échange enregistré.</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer l'échange"}</button>
      </div>
    </form>
  );
}
