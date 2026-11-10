import Link from "next/link";

/** Pages de 50 lignes sous un tableau (les filtres sont gardés). */
export function Pagination({ total, page, parPage, lien }: { total: number; page: number; parPage: number; lien: (p: number) => string }) {
  const pages = Math.ceil(total / parPage);
  if (pages <= 1) return null;
  const autour = [...new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))].sort((a, b) => a - b);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 text-sm" aria-label="Pages">
      <span className="text-muted">{(page - 1) * parPage + 1}–{Math.min(page * parPage, total)} sur {total}</span>
      <span className="flex flex-wrap items-center gap-1">
        {page > 1 && <Link href={lien(page - 1)} className="btn btn-sm">← Précédent</Link>}
        {autour.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && p - autour[i - 1] > 1 && <span className="text-muted">…</span>}
            <Link href={lien(p)} aria-current={p === page ? "page" : undefined} className={`btn btn-sm min-w-9 justify-center ${p === page ? "btn-primary" : ""}`}>{p}</Link>
          </span>
        ))}
        {page < pages && <Link href={lien(page + 1)} className="btn btn-sm">Suivant →</Link>}
      </span>
    </nav>
  );
}
