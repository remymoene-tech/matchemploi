import Link from "next/link";

/** Petits graphiques sans bibliothèque : une seule série, couleur sauge foncé, valeurs en encre. */
type Point = { label: string; valeur: number; detail?: string; href?: string };

/** Colonnes verticales (évolution dans le temps). */
export function Colonnes({ donnees, resume }: { donnees: Point[]; resume: string }) {
  const max = Math.max(1, ...donnees.map((d) => d.valeur));
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-40 items-end gap-[2px] border-b border-line" role="img" aria-label={resume}>
        {donnees.map((d) => {
          const Conteneur = d.href ? Link : "div";
          return (
          <Conteneur key={d.label} href={d.href ?? ""} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-xs font-semibold tabular-nums text-ink">{d.valeur || ""}</span>
            <div
              className="w-full max-w-10 rounded-t-[4px] bg-[var(--accent)] opacity-90 transition-opacity group-hover:opacity-100"
              style={{ height: `${(d.valeur / max) * 80}%`, minHeight: d.valeur ? 3 : 0 }}
            />
            <span className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-[var(--surface)] group-hover:block">
              {d.detail ?? `${d.label} : ${d.valeur}`}
            </span>
          </Conteneur>
          );
        })}
      </div>
      <div className="flex gap-[2px]" aria-hidden>
        {donnees.map((d) => <span key={d.label} className="min-w-0 flex-1 break-words text-center text-[10px] leading-tight text-muted sm:text-[11px]">{d.label}</span>)}
      </div>
      <table className="sr-only"><tbody>{donnees.map((d) => <tr key={d.label}><th>{d.label}</th><td>{d.valeur}</td></tr>)}</tbody></table>
    </figure>
  );
}

/** Barres horizontales (comparer des catégories). */
export function Barres({ donnees, resume }: { donnees: Point[]; resume: string }) {
  const max = Math.max(1, ...donnees.map((d) => d.valeur));
  return (
    <figure className="flex flex-col gap-2.5" role="img" aria-label={resume}>
      {donnees.map((d) => {
        const Conteneur = d.href ? Link : "div";
        return (
        <Conteneur key={d.label} href={d.href ?? ""} className={`group flex flex-col gap-1 rounded-lg text-sm ${d.href ? "-mx-2 px-2 py-1 hover:bg-bg" : ""}`} title={d.detail ?? `${d.label} : ${d.valeur}`}>
          <div className="flex justify-between gap-2"><span>{d.label}{d.href ? <span className="ml-1 text-muted opacity-0 group-hover:opacity-100">→</span> : null}</span><b className="tabular-nums">{d.valeur}</b></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-[var(--accent)] opacity-90 transition-opacity group-hover:opacity-100" style={{ width: `${(d.valeur / max) * 100}%` }} />
          </div>
        </Conteneur>
        );
      })}
    </figure>
  );
}
