import { TYPES_ECHANGE, echeance, maintenantMs, type Echange } from "@/lib/echanges";

/** Historique des échanges (téléphone, email, rendez-vous…) avec les rappels. Réservé à l'équipe. */
export function JournalEchanges({ echanges, champ, cibleId, actionFaite, supprimer }: {
  echanges: Echange[];
  champ: "candidat_id" | "entreprise_id" | "lead_id";
  cibleId: string;
  actionFaite: (f: FormData) => Promise<void>;
  /** Absent : pas de bouton de suppression (réservé à l'administrateur). */
  supprimer?: (f: FormData) => Promise<void>;
}) {
  const maintenant = maintenantMs();
  const dateRelance = (e: Echange) => {
    const d = echeance(e);
    return d ? d.toLocaleString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris", ...(e.action_a ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "";
  };
  if (!echanges.length) return <p className="text-sm text-muted">Aucun échange noté pour l&apos;instant.</p>;
  return (
    <ol className="flex flex-col">
      {echanges.map((e) => {
        const t = TYPES_ECHANGE.find((x) => x.id === e.type) ?? TYPES_ECHANGE[4];
        const d = echeance(e);
        const enRetard = !!e.action && !e.action_faite && !!d && d.getTime() <= maintenant;
        return (
          <li key={e.id} className="relative flex gap-3 border-l-2 border-line pb-5 pl-5 last:pb-0">
            <span className="absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-xs" aria-hidden>{t.icone}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm">
                <b>{t.label}</b>
                <span className="text-muted"> · {new Date(e.date_echange).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}{e.auteur ? ` · ${e.auteur}` : ""}</span>
              </p>
              <p className="whitespace-pre-line text-sm">{e.resume}</p>
              {e.action && (
                <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${e.action_faite ? "bg-bg text-muted line-through" : enRetard ? "bg-bad-soft" : "bg-accent-soft"}`}>
                  <span>⏰ {e.action}{d ? ` · le ${dateRelance(e)}` : ""}{enRetard ? " (en retard)" : ""}</span>
                  {!e.action_faite && (
                    <span className="flex items-center gap-2">
                      {d && <a href={`/api/relances/${e.id}/ics`} className="text-xs text-accent hover:underline">📅 Ajouter à mon agenda</a>}
                      <form action={actionFaite}>
                        <input type="hidden" name={champ} value={cibleId} />
                        <input type="hidden" name="id" value={e.id} />
                        <button className="btn btn-sm">Fait ✓</button>
                      </form>
                    </span>
                  )}
                </div>
              )}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted">Supprimer</summary>
                {supprimer && (<form action={supprimer} className="mt-1">
                  <input type="hidden" name={champ} value={cibleId} />
                  <input type="hidden" name="id" value={e.id} />
                  <button className="btn btn-sm text-bad">Confirmer la suppression</button>
                </form>)}
              </details>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
