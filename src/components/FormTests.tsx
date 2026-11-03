"use client";

import { useActionState, useState } from "react";
import { QUESTIONS_DISC, SERIES_MANAGEMENT } from "@/lib/tests";

export type EtatTest = { erreur?: string };
type Action = (e: EtatTest, f: FormData) => Promise<EtatTest>;

function Envoi({ etat, enCours, pret, libelle }: { etat: EtatTest; enCours: boolean; pret: boolean; libelle: string }) {
  return (
    <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-bg py-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}>
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      <button className="btn btn-primary w-full sm:w-auto sm:self-end" disabled={enCours || !pret}>{enCours ? "Calcul…" : libelle}</button>
    </div>
  );
}

/** Questionnaire DISC : 15 questions, une réponse par question. */
export function FormTestDisc({ action, candidatId }: { action: Action; candidatId?: string }) {
  const [etat, envoyer, enCours] = useActionState<EtatTest, FormData>(action, {});
  const [reponses, setReponses] = useState<Record<number, string>>({});
  const n = Object.keys(reponses).length;
  return (
    <form action={envoyer} className="flex flex-col gap-4">
      {candidatId && <input type="hidden" name="candidat_id" value={candidatId} />}
      <div className="flex items-center gap-3 text-sm">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent transition-all" style={{ width: `${(n / 15) * 100}%` }} /></div>
        <span className="font-mono">{n} / 15</span>
      </div>
      <p className="text-sm text-muted">Choisis la réponse qui te ressemble le plus. Fais confiance à ta première intuition.</p>
      {QUESTIONS_DISC.map((q, i) => (
        <fieldset key={i} className="card flex flex-col gap-2 p-4">
          <legend className="mb-1 px-1 text-sm font-semibold">Question {i + 1}. {q.q}</legend>
          {q.choix.map((c, j) => {
            const l = "abcd"[j];
            return (
              <label key={l} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name={`q${i}`} value={l} required onChange={() => setReponses((p) => ({ ...p, [i]: l }))} className="mt-0.5 accent-[var(--accent)]" />
                <span><b className="mr-1">{l}.</b>{c}</span>
              </label>
            );
          })}
        </fieldset>
      ))}
      <Envoi etat={etat} enCours={enCours} pret={n === 15} libelle={n === 15 ? "Voir mes couleurs" : `Encore ${15 - n} question${15 - n > 1 ? "s" : ""}`} />
    </form>
  );
}

/** Style de management : classer les 4 phrases de chaque série de 1 à 4 (4 = me ressemble le plus). */
export function FormTestManagement({ action, candidatId }: { action: Action; candidatId?: string }) {
  const [etat, envoyer, enCours] = useActionState<EtatTest, FormData>(action, {});
  const [rangs, setRangs] = useState<Record<string, number>>({});
  const serieOk = (i: number) => [0, 1, 2, 3].map((j) => rangs[`${i}_${j}`]).filter(Boolean).sort().join() === "1,2,3,4";
  const nOk = SERIES_MANAGEMENT.filter((_, i) => serieOk(i)).length;
  return (
    <form action={envoyer} className="flex flex-col gap-4">
      {candidatId && <input type="hidden" name="candidat_id" value={candidatId} />}
      <div className="flex items-center gap-3 text-sm">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent transition-all" style={{ width: `${(nOk / 10) * 100}%` }} /></div>
        <span className="font-mono">{nOk} / 10</span>
      </div>
      <p className="rounded-lg bg-accent-soft p-3 text-sm">
        Dans chaque série, <b>classe les 4 phrases</b> : <b>4</b> pour celle qui te ressemble le plus, <b>1</b> pour celle qui te ressemble le moins.
        Chaque chiffre ne s&apos;utilise qu&apos;une fois par série.
      </p>
      {SERIES_MANAGEMENT.map((s, i) => {
        const pris = new Set([0, 1, 2, 3].map((j) => rangs[`${i}_${j}`]).filter(Boolean));
        return (
          <fieldset key={i} className={`card flex flex-col gap-2 p-4 ${serieOk(i) ? "border-accent" : ""}`}>
            <legend className="mb-1 px-1 text-sm font-semibold">Série {i + 1} · {s.theme} {serieOk(i) && <span className="text-accent">✓</span>}</legend>
            {s.phrases.map((p, j) => (
              <div key={j} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-line p-2.5 text-sm">
                <span>{p.texte}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={`Classement de la phrase ${j + 1}`}>
                  {[1, 2, 3, 4].map((r) => {
                    const choisi = rangs[`${i}_${j}`] === r;
                    return (
                      <label key={r} className={`grid h-8 w-8 cursor-pointer place-items-center rounded-md border font-mono text-sm font-bold ${choisi ? "border-accent bg-accent text-accent-ink" : pris.has(r) ? "border-line text-line" : "border-line hover:border-accent"}`}>
                        <input type="radio" name={`s${i}_${j}`} value={r} className="sr-only" checked={choisi}
                          onChange={() => setRangs((prev) => {
                            const n = { ...prev };
                            for (let k = 0; k < 4; k++) if (n[`${i}_${k}`] === r) delete n[`${i}_${k}`]; // un chiffre par série
                            n[`${i}_${j}`] = r;
                            return n;
                          })} />
                        {r}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>
        );
      })}
      <Envoi etat={etat} enCours={enCours} pret={nOk === 10} libelle={nOk === 10 ? "Voir mon style" : `Encore ${10 - nOk} série${10 - nOk > 1 ? "s" : ""} à classer`} />
    </form>
  );
}
