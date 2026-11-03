import { Copier } from "@/components/Copier";
import { Checklist } from "@/components/FormLinkedin";
import type { AnalyseLinkedin } from "@/lib/ia";

/** Affichage de l'analyse LinkedIn (ou du kit de création). `staff` : version courte pour la fiche candidat. */
export function ResultatLinkedin({ a, le, staff }: { a: AnalyseLinkedin; le?: string | null; staff?: boolean }) {
  const ton = a.note >= 8 ? "text-good" : a.note >= 5 ? "text-warn" : "text-bad";
  const importants = a.ameliorations.filter((x) => x.priorite === "important");
  const conseilles = a.ameliorations.filter((x) => x.priorite !== "important");
  const date = le ? new Date(le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }) : "";
  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-wrap items-center gap-6 p-5">
        {a.mode === "analyse" ? (
          <div className="flex flex-col items-center">
            <b className={`font-mono text-5xl font-bold tabular-nums leading-none ${ton}`}>{a.note}<small className="text-xl text-muted">/10</small></b>
            <span className="eyebrow mt-2">LinkedIn</span>
          </div>
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-3xl" aria-hidden>🚀</span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-xl font-extrabold">{a.mode === "analyse" ? "L'avis sur ton profil LinkedIn" : "Ton kit de départ LinkedIn"}</h2>
          <p>{a.resume}</p>
          {date && <p className="text-xs text-muted">{a.mode === "analyse" ? "Analysé" : "Préparé"} le {date}</p>}
        </div>
      </section>

      {!!a.points_forts.length && (
        <section className="card flex flex-col gap-2 p-5">
          <h3 className="font-semibold">Ce qui est déjà bien</h3>
          <ul className="flex flex-col gap-1 text-sm">{a.points_forts.map((p) => <li key={p}>✓ {p}</li>)}</ul>
        </section>
      )}

      {a.photo_banniere && (
        <section className="card flex flex-col gap-1 p-5">
          <h3 className="font-semibold">Photo et bannière</h3>
          <p className="text-sm">{a.photo_banniere}</p>
        </section>
      )}

      <section className="card flex flex-col gap-4 p-5">
        <h3 className="font-semibold">À copier dans ton profil</h3>
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Titre proposé</span>
          <p className="rounded-lg bg-accent-soft p-3 font-semibold">{a.titre_propose}</p>
          {!staff && <Copier texte={a.titre_propose} />}
        </div>
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Section « Infos » proposée</span>
          <p className="whitespace-pre-line rounded-lg bg-accent-soft p-3 text-sm">{a.infos_proposee}</p>
          {!staff && <Copier texte={a.infos_proposee} />}
        </div>
        {!!a.competences_a_mettre.length && (
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Tes 5 compétences à mettre en avant</span>
            <div className="flex flex-wrap gap-1.5">{a.competences_a_mettre.map((x) => <span key={x} className="chip chip-tag">{x}</span>)}</div>
          </div>
        )}
        {!staff && <p className="text-xs text-muted">Remplace les « [à compléter] » par tes vraies infos et relis avant de publier.</p>}
      </section>

      {([["À faire en priorité", importants], ["Pour aller plus loin", conseilles]] as const).map(([titre, liste]) => !!liste.length && (
        <section key={titre} className="card flex flex-col gap-3 p-5">
          <h3 className="font-semibold">{titre}</h3>
          <ul className="flex flex-col gap-3">
            {liste.map((x, i) => (
              <li key={i} className="flex flex-col gap-1 border-l-2 border-[var(--sauge)] pl-3">
                <span className="eyebrow">{x.categorie}</span>
                <p className="text-sm">{x.conseil}</p>
                {x.exemple && <p className="rounded-md bg-bg px-2 py-1 text-xs text-muted">Exemple : {x.exemple}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!!a.mots_cles_manquants.length && (
        <section className="card flex flex-col gap-2 p-5">
          <h3 className="font-semibold">Mots-clés qui manquent</h3>
          <p className="text-sm text-muted">Les recruteurs tapent ces mots pour ton métier : glisse-les dans ton titre, tes Infos ou tes compétences.</p>
          <div className="flex flex-wrap gap-1.5">{a.mots_cles_manquants.map((x) => <span key={x} className="chip">{x}</span>)}</div>
        </section>
      )}

      {!!a.ecarts_cv.length && (
        <section className="card flex flex-col gap-2 p-5">
          <h3 className="font-semibold">Différences avec ton CV</h3>
          <ul className="flex flex-col gap-1 text-sm">{a.ecarts_cv.map((x) => <li key={x}>• {x}</li>)}</ul>
        </section>
      )}

      {!staff && !!a.ameliorations.length && (
        <section className="card flex flex-col gap-2 p-5">
          <h3 className="font-semibold">Ma liste de corrections</h3>
          <Checklist id={`linkedin-${le ?? ""}`} items={a.ameliorations.map((x) => `${x.categorie} : ${x.conseil}`)} />
        </section>
      )}
    </div>
  );
}
