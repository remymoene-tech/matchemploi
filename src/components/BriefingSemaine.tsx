import Link from "next/link";
import type { LigneBriefing } from "@/lib/briefing";

/** Briefing hebdomadaire : une carte par étudiant, les inactifs à part. */
export function BriefingSemaine({ lignes, base }: { lignes: LigneBriefing[]; base: string }) {
  const actifs = lignes.filter((l) => l.contacts || l.nouvelles.length || l.entretiens.length);
  const calmes = lignes.filter((l) => !l.contacts && !l.nouvelles.length && !l.entretiens.length);
  const total = (k: "contacts" | "recrutent" | "enRetard") => lignes.reduce((s, l) => s + l[k], 0);
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "jamais");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="eyebrow">📋 Briefing de la semaine</span>
        <h2 className="text-2xl font-extrabold">Ce que tes étudiants ont fait ces 7 derniers jours</h2>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["🔥 Actifs", `${actifs.length}/${lignes.length}`], ["🚪 Nouvelles entreprises", lignes.reduce((s, l) => s + l.nouvelles.length, 0)], ["💬 Contacts notés", total("contacts")], ["🤝 Entretiens à venir", lignes.reduce((s, l) => s + l.entretiens.length, 0)]] as const).map(([l, v]) => (
          <div key={l} className="card flex flex-col p-4"><span className="eyebrow">{l}</span><b className="text-3xl font-semibold tabular-nums">{v}</b></div>
        ))}
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {actifs.map((l) => (
          <Link key={l.id} href={`${base}/${l.id}?onglet=prospections`} className="card flex flex-col gap-2 p-5 transition-colors hover:border-accent">
            <div className="flex items-center justify-between gap-2">
              <b className="text-lg">👤 {l.nom}</b>
              {l.enRetard > 0 && <span className="chip chip-minus">⏰ {l.enRetard} en retard</span>}
            </div>
            <p className="text-sm">
              🚪 <b>{l.nouvelles.length}</b> nouvelle{l.nouvelles.length > 1 ? "s" : ""} entreprise{l.nouvelles.length > 1 ? "s" : ""}
              {l.recrutent ? <> dont <b>{l.recrutent}</b> qui recrute{l.recrutent > 1 ? "nt" : ""} ✅</> : null}
              {" · "}💬 <b>{l.contacts}</b> contact{l.contacts > 1 ? "s" : ""}
            </p>
            {!!l.nouvelles.length && <p className="truncate text-xs text-muted">{l.nouvelles.join(" · ")}</p>}
            {l.entretiens.map((x) => (
              <p key={x.entreprise + x.date} className="rounded-lg bg-good-soft px-2 py-1 text-sm">🤝 Entretien chez <b>{x.entreprise}</b> le {new Date(x.date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</p>
            ))}
            <p className="text-xs text-muted">💼 {l.interesses} offre{l.interesses > 1 ? "s" : ""} « ça m&apos;intéresse » · {l.postules} candidature{l.postules > 1 ? "s" : ""} · {l.totalProspections} entreprise{l.totalProspections > 1 ? "s" : ""} prospectée{l.totalProspections > 1 ? "s" : ""} au total</p>
          </Link>
        ))}
      </div>
      {!!calmes.length && (
        <section className="card flex flex-col gap-2 p-5">
          <h3 className="font-semibold">😴 Sans activité cette semaine ({calmes.length})</h3>
          <ul className="flex flex-col divide-y divide-line">
            {calmes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <Link href={`${base}/${l.id}?onglet=prospections`} className="font-semibold hover:text-accent hover:underline">{l.nom}</Link>
                <span className="flex flex-wrap items-center gap-2 text-muted">
                  {l.enRetard > 0 && <span className="chip chip-minus">⏰ {l.enRetard} en retard</span>}
                  Dernière activité : {date(l.derniere)}
                  <Link href={`${base}/${l.id}?onglet=echanges`} className="btn btn-sm">📞 Le relancer</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
