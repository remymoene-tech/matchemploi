import { BILANS, SECTIONS, type EntretienConseil } from "@/lib/entretien-conseil";

const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/** Fiche d'entretien en lecture seule (pour l'étudiant, ou à imprimer). */
export function VueEntretienConseil({ e, nomEtudiant }: { e: EntretienConseil; nomEtudiant: string }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-2 p-5">
        <span className="eyebrow">MagnusMatch — fiche d&apos;entretien alternance</span>
        <h1 className="text-2xl font-extrabold">{nomEtudiant}</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Formation</dt><dd>{e.formation || "—"}</dd>
          <dt className="text-muted">Date</dt><dd>{dateFr(e.date_entretien)}</dd>
          <dt className="text-muted">Conseiller</dt><dd>{e.conseiller || "—"}</dd>
          <dt className="text-muted">Zone de recherche</dt><dd>{e.zone || "—"}</dd>
        </dl>
      </section>
      {SECTIONS.map((s) => (
        <section key={s.id} className="card flex flex-col gap-2 p-5 break-inside-avoid">
          <h2 className="text-lg font-semibold">{s.titre}</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {s.items.map((it) => {
              const r = e.reponses[it.id];
              const coche = Boolean(r?.coche) || r?.reponse === "Oui";
              return s.type === "cases" ? (
                <li key={it.id} className="flex flex-col">
                  <span className={coche ? "" : "text-muted"}>{coche ? "☑" : "☐"} {it.label}</span>
                  {coche && r?.precision && <span className="ml-5 text-muted">{r.precision}</span>}
                </li>
              ) : (
                <li key={it.id} className="flex flex-col">
                  <span>{it.label} : <b>{r?.reponse ?? "Non renseigné"}</b></span>
                  {r?.precision && <span className="ml-3 text-muted">{r.precision}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {(e.qualites || e.points_faibles) && (
        <section className="card flex flex-col gap-2 p-5 break-inside-avoid">
          <h2 className="text-lg font-semibold">Autres remarques</h2>
          {e.qualites && <p className="whitespace-pre-line text-sm"><span className="text-muted">Qualités : </span>{e.qualites}</p>}
          {e.points_faibles && <p className="whitespace-pre-line text-sm"><span className="text-muted">Points à travailler : </span>{e.points_faibles}</p>}
        </section>
      )}
      <section className="card flex flex-col gap-2 p-5 break-inside-avoid">
        <h2 className="text-lg font-semibold">8. Bilan</h2>
        <p className="text-sm"><b>{BILANS.find((b) => b.id === e.bilan)?.label ?? "—"}</b></p>
        <p className="text-sm"><span className="text-muted">Observations : </span><span className="whitespace-pre-line">{e.observations || "—"}</span></p>
        <p className="text-sm"><span className="text-muted">Prochaine étape : </span><span className="whitespace-pre-line">{e.prochaine_etape || "—"}</span></p>
      </section>
    </div>
  );
}
