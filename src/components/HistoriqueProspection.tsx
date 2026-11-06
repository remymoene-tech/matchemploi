import { echeance, maintenantMs } from "@/lib/echanges";
import { TYPES_PROSPECTION, type EchangeProspection } from "@/lib/prospections";

/** Historique des contacts d'un étudiant avec une entreprise. Sans actions = lecture seule (équipe). */
export function HistoriqueProspection({ echanges, prospectionId, relanceFaite, supprimer }: {
  echanges: EchangeProspection[];
  prospectionId: string;
  relanceFaite?: (f: FormData) => Promise<void>;
  supprimer?: (f: FormData) => Promise<void>;
}) {
  const maintenant = maintenantMs();
  if (!echanges.length) return <p className="text-sm text-muted">Aucun contact noté.</p>;
  return (
    <ol className="flex flex-col">
      {echanges.map((e) => {
        const t = TYPES_PROSPECTION.find((x) => x.id === e.type) ?? TYPES_PROSPECTION[3];
        const d = echeance(e);
        const retard = !!e.action && !e.action_faite && !!d && +d <= maintenant;
        return (
          <li key={e.id} className="relative flex gap-3 border-l-2 border-line pb-4 pl-5 last:pb-0">
            <span className="absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-xs" aria-hidden>{t.icone}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm"><b>{t.label}</b><span className="text-muted"> · {new Date(e.date_echange).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</span></p>
              {e.resume && <p className="whitespace-pre-line text-sm">{e.resume}</p>}
              {e.action && (
                <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${e.action_faite ? "bg-bg text-muted line-through" : retard ? "bg-bad-soft" : "bg-accent-soft"}`}>
                  <span>⏰ {e.action}{d ? ` · le ${d.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : ""}{retard ? " (en retard)" : ""}</span>
                  {!e.action_faite && relanceFaite && (
                    <form action={relanceFaite}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="prospection_id" value={prospectionId} />
                      <button className="btn btn-sm">Fait ✓</button>
                    </form>
                  )}
                </div>
              )}
              {supprimer && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted">Supprimer</summary>
                  <form action={supprimer} className="mt-1">
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="prospection_id" value={prospectionId} />
                    <button className="btn btn-sm text-bad">Confirmer la suppression</button>
                  </form>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
