"use client";

import { useCallback, useMemo, useState } from "react";
import { Carte, type Domicile, type PointOffre } from "@/components/Carte";
import { Chips, Score } from "@/components/Score";
import { donnerAvis } from "@/app/espace/actions";
import { RAISONS_REFUS } from "@/lib/types";

export type LigneOffre = {
  offre_id: string;
  score: number;
  forts: string[];
  manques: string[];
  resume: string;
  avis_candidat: string;
  raison_refus: string;
  source: string;
  sourceLabel: string;
  entreprise: string;
  intitule: string;
  contrat: string;
  lieu: string;
  salaire: string;
  lien: string;
  latitude: number | null;
  longitude: number | null;
};

const AVIS = [
  { id: "interesse", label: "Ça m'intéresse" },
  { id: "postule", label: "J'ai postulé" },
  { id: "pas_interesse", label: "Pas pour moi" },
];

/** Carte et liste des offres côte à côte, reliées entre elles. */
export function OffresEspace({ lignes, seuil, domicile }: { lignes: LigneOffre[]; seuil: number; domicile: Domicile | null }) {
  const [selection, setSelection] = useState<string | null>(null);
  const [refusOuvert, setRefusOuvert] = useState<string | null>(null);

  // Mémorisé : la carte n'est reconstruite que si les offres changent (pas à chaque clic)
  const points: PointOffre[] = useMemo(
    () =>
      lignes
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => ({
          id: l.offre_id, latitude: l.latitude!, longitude: l.longitude!, score: l.score,
          intitule: l.intitule, entreprise: l.entreprise, lieu: l.lieu, contrat: l.contrat, lien: l.lien,
        })),
    [lignes],
  );
  const sansPosition = lignes.length - points.length;

  // Clic sur une pastille de la carte : on montre l'offre dans la liste
  const depuisCarte = useCallback((id: string) => {
    setSelection(id);
    document.getElementById(`offre-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
        <Carte
          offres={points}
          seuil={seuil}
          domicile={domicile}
          selection={selection}
          onSelect={depuisCarte}
          className="h-[50vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-line lg:h-[calc(100vh-2rem)] lg:max-h-[760px]"
        />
        <p className="hint">
          Zoome pour séparer les offres regroupées. Clique sur une pastille pour retrouver l&apos;offre dans la liste.
          {!domicile && " Ta commune n'a pas pu être placée : vérifie ton code postal dans ton profil."}
          {sansPosition > 0 && ` ${sansPosition} offre${sansPosition > 1 ? "s" : ""} sans adresse précise n'apparai${sansPosition > 1 ? "ssent" : "t"} que dans la liste.`}
        </p>
      </div>

      <ul className="flex flex-col gap-2 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1" aria-label="Offres notées">
        {lignes.map((l) => {
          const choisie = selection === l.offre_id;
          const aPosition = l.latitude != null && l.longitude != null;
          return (
            <li
              key={l.offre_id}
              id={`offre-${l.offre_id}`}
              className={`card flex scroll-mt-4 flex-col gap-2 p-4 transition ${choisie ? "border-accent ring-2 ring-accent/30" : ""} ${l.score < seuil || l.avis_candidat === "pas_interesse" ? "opacity-75" : ""}`}
            >
              <div className="flex gap-3">
                <Score score={l.score} seuil={seuil} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h2 className="text-base font-semibold leading-snug">{l.intitule}</h2>
                  <p className="text-sm text-muted">{[l.entreprise, l.lieu, l.contrat, l.salaire].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              {l.resume && <p className="text-sm">{l.resume}</p>}
              <Chips forts={l.forts} manques={l.manques} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="chip">{l.sourceLabel}</span>
                {aPosition && (
                  <button
                    type="button"
                    className="font-semibold text-accent"
                    onClick={() => {
                      setSelection(l.offre_id);
                      // Sur téléphone, la carte est au-dessus : on remonte jusqu'à elle
                      if (window.innerWidth < 1024) document.querySelector('[aria-label="Carte des offres"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    Voir sur la carte
                  </button>
                )}
                {l.lien ? (
                  <a className="font-semibold text-accent" href={l.lien} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce</a>
                ) : (
                  <span className="text-muted">Ton école fait le lien avec l&apos;entreprise</span>
                )}
              </div>
              {l.avis_candidat === "pas_interesse" && l.raison_refus && (
                <p className="text-sm text-muted">Écartée : {l.raison_refus}</p>
              )}
              <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                {AVIS.map((a) =>
                  a.id === "pas_interesse" ? (
                    <button
                      key={a.id}
                      type="button"
                      className={`btn btn-sm ${l.avis_candidat === a.id ? "border-accent bg-accent-soft text-accent" : ""}`}
                      aria-pressed={l.avis_candidat === a.id}
                      aria-expanded={refusOuvert === l.offre_id}
                      onClick={() => setRefusOuvert(refusOuvert === l.offre_id ? null : l.offre_id)}
                    >
                      {a.label}
                    </button>
                  ) : (
                    <form key={a.id} action={donnerAvis}>
                      <input type="hidden" name="offre_id" value={l.offre_id} />
                      <input type="hidden" name="avis" value={a.id} />
                      <button className={`btn btn-sm ${l.avis_candidat === a.id ? "border-accent bg-accent-soft text-accent" : ""}`} aria-pressed={l.avis_candidat === a.id}>
                        {a.label}
                      </button>
                    </form>
                  ),
                )}
              </div>
              {refusOuvert === l.offre_id && (
                <form action={donnerAvis} onSubmit={() => setRefusOuvert(null)} className="flex flex-col gap-3 rounded-lg border border-line bg-bg p-3">
                  <input type="hidden" name="offre_id" value={l.offre_id} />
                  <input type="hidden" name="avis" value="pas_interesse" />
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-sm font-semibold">Pourquoi cette offre n&apos;est pas pour toi ?</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {RAISONS_REFUS.map((r) => (
                        <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
                          <input type="checkbox" name="raison" value={r} className="sr-only" />
                          {r}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm" htmlFor={`precision-${l.offre_id}`}>Tu veux préciser ? (facultatif)</label>
                    <input className="input" id={`precision-${l.offre_id}`} name="precision" maxLength={300} placeholder="Ex. je ne veux pas travailler le week-end" />
                  </div>
                  <p className="hint">L&apos;IA en tiendra compte pour mieux noter tes prochaines offres.</p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRefusOuvert(null)}>Annuler</button>
                    <button className="btn btn-sm btn-primary">Écarter cette offre</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
