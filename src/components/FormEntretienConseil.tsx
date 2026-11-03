"use client";

import { useActionState, useState } from "react";
import { BILANS, REPONSES_QUESTION, SECTIONS, type EntretienConseil, type Reponses } from "@/lib/entretien-conseil";

export type EtatEntretien = { erreur?: string; ok?: string };

/** Fiche d'entretien conseiller : cocher une case ouvre un champ « Préciser » juste en dessous. */
export function FormEntretienConseil({ initial, action, nomEtudiant, candidatId }: {
  candidatId: string;
  initial: Partial<EntretienConseil> & { reponses: Reponses };
  action: (e: EtatEntretien, f: FormData) => Promise<EtatEntretien>;
  nomEtudiant: string;
}) {
  const [etat, envoyer, enCours] = useActionState<EtatEntretien, FormData>(action, {});
  const [coches, setCoches] = useState<Record<string, boolean>>(
    // Anciennes fiches : un « Oui » à une question vaut une case cochée
    () => Object.fromEntries(Object.entries(initial.reponses).map(([k, v]) => [k, Boolean(v.coche) || v.reponse === "Oui"])),
  );

  return (
    <form action={envoyer} className="flex flex-col gap-5">
      <input type="hidden" name="candidat_id" value={candidatId} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="eyebrow">MagnusMatch — fiche d&apos;entretien alternance</span>
          <h2 className="text-2xl font-extrabold">{nomEtudiant}</h2>
        </div>
        {[
          ["formation", "Formation", initial.formation],
          ["conseiller", "Conseiller", initial.conseiller],
          ["zone", "Zone de recherche", initial.zone],
        ].map(([n, l, v]) => (
          <div key={n} className="flex flex-col gap-1">
            <label className="label" htmlFor={n!}>{l}</label>
            <input className="input" id={n!} name={n!} defaultValue={v ?? ""} />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="date_entretien">Date</label>
          <input className="input" id="date_entretien" name="date_entretien" type="date" defaultValue={initial.date_entretien} />
        </div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.id} className="card flex flex-col gap-3 p-5">
          <h3 className="text-lg font-semibold">{s.titre}</h3>
          {s.type === "cases" ? (
            <ul className="flex flex-col gap-2">
              {s.items.map((it) => (
                <li key={it.id} className="flex flex-col gap-1.5">
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input
                      type="checkbox" name={`c_${it.id}`} defaultChecked={coches[it.id]}
                      onChange={(e) => setCoches((p) => ({ ...p, [it.id]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span>{it.label}</span>
                  </label>
                  {coches[it.id] && (
                    <textarea
                      name={`p_${it.id}`} defaultValue={initial.reponses[it.id]?.precision ?? ""} rows={2}
                      placeholder="Préciser (facultatif)…" aria-label={`Préciser : ${it.label}`}
                      className="input ml-7 min-h-0 text-sm" style={{ width: "calc(100% - 1.75rem)" }}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-3">
              {s.items.map((it) => (
                <li key={it.id} className="grid gap-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_13rem]">
                  <label className="text-sm" htmlFor={`q_${it.id}`}>{it.label}</label>
                  <select className="input py-1.5 text-sm" id={`q_${it.id}`} name={`q_${it.id}`} defaultValue={initial.reponses[it.id]?.reponse ?? "Non renseigné"}>
                    {REPONSES_QUESTION.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <input
                    className="input text-sm sm:col-span-2" name={`p_${it.id}`} defaultValue={initial.reponses[it.id]?.precision ?? ""}
                    placeholder="Commentaire (facultatif)" aria-label={`Commentaire : ${it.label}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="card flex flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold">Autres remarques (facultatif)</h3>
        {[
          ["qualites", "Autres qualités", initial.qualites, "Une qualité qui n'est pas dans la liste…"],
          ["points_faibles", "Autres points à travailler", initial.points_faibles, "Un point qui n'est pas dans la liste, et comment l'aider…"],
        ].map(([n, t, v, ph]) => (
          <div key={n} className="flex flex-col gap-1">
            <label className="label" htmlFor={n!}>{t}</label>
            <textarea className="input min-h-20 text-sm" id={n!} name={n!} defaultValue={v ?? ""} placeholder={ph} />
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold">8. Bilan</h3>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Bilan</legend>
          {BILANS.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="radio" name="bilan" value={b.id} defaultChecked={initial.bilan === b.id} className="accent-[var(--accent)]" />
              {b.label}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="observations">Observations</label>
          <textarea className="input min-h-24 text-sm" id="observations" name="observations" defaultValue={initial.observations ?? ""} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="prochaine_etape">Prochaine étape</label>
          <textarea className="input min-h-20 text-sm" id="prochaine_etape" name="prochaine_etape" defaultValue={initial.prochaine_etape ?? ""} placeholder="Ex. refaire le CV avant le 15/11, RDV de suivi le 20/11, positionner sur 3 offres…" />
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <p className="text-sm text-muted">Cette fiche reste confidentielle : seuls l&apos;admin et le responsable de l&apos;école la voient.</p>
        {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
        {etat.ok && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{etat.ok}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn print:hidden" onClick={() => window.print()}>Imprimer</button>
          <button className="btn btn-primary" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer la fiche"}</button>
        </div>
      </section>
    </form>
  );
}
