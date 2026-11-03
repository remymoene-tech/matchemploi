import Link from "next/link";
import { TYPES_ECHANGE, echeance, type Relance } from "@/lib/echanges";

/** Liste des relances groupées : en retard, aujourd'hui, à venir. */
export function ListeRelances({ relances, base, voirAuteur }: { relances: Relance[]; base: string; voirAuteur?: boolean }) {
  const maintenant = new Date();
  const jour = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const aujourdHui = jour(maintenant);
  const groupes: [string, string, Relance[]][] = [
    ["En retard", "bg-bad-soft", []],
    ["Aujourd'hui", "bg-warn-soft", []],
    ["À venir", "bg-accent-soft", []],
    ["Sans date", "bg-bg", []],
  ];
  for (const r of relances) {
    const d = echeance(r);
    if (!d) groupes[3][2].push(r);
    else if (d <= maintenant) groupes[0][2].push(r);
    else if (jour(d) === aujourdHui) groupes[1][2].push(r);
    else groupes[2][2].push(r);
  }
  if (!relances.length) return <p className="card border-dashed p-6 text-sm text-muted">Aucune relance en attente. Ajoute-en une depuis l&apos;onglet « Échanges » d&apos;une fiche candidat.</p>;
  return (
    <div className="flex flex-col gap-5">
      {groupes.filter(([, , l]) => l.length).map(([titre, fond, liste]) => (
        <section key={titre} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{titre} ({liste.length})</h3>
          <ul className="flex flex-col gap-2">
            {liste.map((r) => {
              const d = echeance(r);
              const t = TYPES_ECHANGE.find((x) => x.id === r.type);
              return (
                <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm ${fond}`}>
                  <div className="min-w-0">
                    <Link href={`${base}/${r.candidat_id}?onglet=echanges`} className="font-semibold hover:text-accent hover:underline">{r.nom}</Link>
                    <span className="text-muted"> · {t?.icone} {r.action}</span>
                    <div className="text-xs text-muted">
                      {d ? d.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris", ...(r.action_a ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "Pas de date"}
                      {voirAuteur && r.auteur ? ` · ${r.auteur}` : ""}
                    </div>
                  </div>
                  <span className="flex items-center gap-3">
                    {d && <a href={`/api/relances/${r.id}/ics`} className="text-xs text-accent hover:underline">📅 Agenda</a>}
                    <Link href={`${base}/${r.candidat_id}?onglet=echanges`} className="btn btn-sm">Ouvrir la fiche</Link>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
