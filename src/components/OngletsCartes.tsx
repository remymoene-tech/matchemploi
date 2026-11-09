import Link from "next/link";

export type OngletCarte = { href: string; icone: string; label: string; sous?: string; actif: boolean };

/** Onglets en cartes avec icône (style B). */
export function OngletsCartes({ onglets, label }: { onglets: OngletCarte[]; label: string }) {
  const n = onglets.length;
  const grille = n <= 3 ? "grid-cols-3" : n === 4 ? "grid-cols-2 sm:grid-cols-4" : n === 6 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
  return (
    <nav className={`grid gap-2 sm:gap-3 ${grille}`} aria-label={label}>
      {onglets.map((o) => (
        <Link key={o.href} href={o.href} aria-current={o.actif ? "page" : undefined}
          className={`group flex min-w-0 flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition-colors sm:flex-row sm:gap-3 sm:p-3.5 sm:text-left ${
            o.actif ? "border-2 border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent"}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg sm:h-10 sm:w-10 sm:text-xl ${o.actif ? "bg-[var(--sauge)]" : "bg-bg group-hover:bg-accent-soft"}`} aria-hidden>
            {o.icone}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <b className="text-[13px] font-semibold sm:truncate sm:text-[15px]">{o.label}</b>
            {o.sous && <small className="hidden truncate text-muted sm:block sm:text-[13px]">{o.sous}</small>}
          </span>
        </Link>
      ))}
    </nav>
  );
}
