import Link from "next/link";
import { evenementsEntre, jourParis, type Evenement } from "@/lib/planning";

type Vue = "jour" | "semaine" | "mois";
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Jours manipulés à midi UTC : pas de souci d'heure d'été. */
const versDate = (j: string) => new Date(`${j}T12:00:00Z`);
const versJour = (d: Date) => d.toISOString().slice(0, 10);
const ajouter = (j: string, n: number) => versJour(new Date(versDate(j).getTime() + n * 864e5));
const lundi = (j: string) => ajouter(j, -((versDate(j).getUTCDay() + 6) % 7));

/** Planning des entretiens : vue jour, semaine ou mois. */
export async function Planning({ vue = "semaine", date, maintenant, filtre }: { vue?: Vue; date?: string; maintenant: number; filtre?: string }) {
  const aujourdhui = jourParis(new Date(maintenant));
  const ref = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : aujourdhui;
  let debut = ref, fin = ref;
  if (vue === "semaine") { debut = lundi(ref); fin = ajouter(debut, 6); }
  if (vue === "mois") {
    const premier = `${ref.slice(0, 8)}01`;
    debut = lundi(premier);
    const dernier = versJour(new Date(Date.UTC(+ref.slice(0, 4), +ref.slice(5, 7), 0, 12)));
    fin = ajouter(lundi(dernier), 6);
  }
  const tous = await evenementsEntre(debut, fin);
  const evs = filtre === "admission" || filtre === "entreprise" ? tous.filter((e) => e.type === filtre) : tous;
  const parJour = new Map<string, Evenement[]>();
  for (const e of evs) { const j = jourParis(e.quand); parJour.set(j, [...(parJour.get(j) ?? []), e]); }

  const pas = vue === "jour" ? 1 : vue === "semaine" ? 7 : 0;
  const precedent = vue === "mois" ? versJour(new Date(Date.UTC(+ref.slice(0, 4), +ref.slice(5, 7) - 2, 1, 12))) : ajouter(ref, -pas);
  const suivant = vue === "mois" ? versJour(new Date(Date.UTC(+ref.slice(0, 4), +ref.slice(5, 7), 1, 12))) : ajouter(ref, pas);
  const lien = (o: { vue?: Vue; date?: string; filtre?: string }) => {
    const p = new URLSearchParams({ vue: "planning", pvue: o.vue ?? vue, pdate: o.date ?? ref, ...((o.filtre ?? filtre) ? { pfiltre: o.filtre ?? filtre! } : {}) });
    return `/admin?${p}`;
  };
  const titre = vue === "jour"
    ? versDate(ref).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : vue === "semaine"
      ? `Semaine du ${versDate(debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" })} au ${versDate(fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`
      : versDate(ref).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const couleur = (e: Evenement) => (e.type === "admission" ? "border-l-[var(--accent)] bg-accent-soft" : "border-l-[#455198] bg-[#eef0fa] dark:bg-[#23284a]");

  const carte = (e: Evenement, compact = false) => (
    <Link key={e.id} href={e.lien} className={`block rounded-md border-l-4 px-2 py-1 text-xs hover:underline ${couleur(e)}`} title={`${e.titre} · ${e.detail}`}>
      <b>{heure(e.quand)}</b> {e.titre}{!compact && <span className="block text-muted">{e.detail}{e.statut ? ` · ${e.statut}` : ""}</span>}
    </Link>
  );

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={lien({ date: precedent })} className="btn btn-sm" aria-label="Précédent">←</Link>
          <Link href={lien({ date: aujourdhui })} className="btn btn-sm">Aujourd&apos;hui</Link>
          <Link href={lien({ date: suivant })} className="btn btn-sm" aria-label="Suivant">→</Link>
          <h2 className="ml-2 text-lg font-semibold first-letter:uppercase">{titre}</h2>
        </div>
        <nav className="flex rounded-full bg-accent-soft p-1 text-sm" aria-label="Vue du planning">
          {(["jour", "semaine", "mois"] as const).map((v) => (
            <Link key={v} href={lien({ vue: v })} className={`rounded-full px-4 py-1.5 font-semibold ${vue === v ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
              {v === "jour" ? "Jour" : v === "semaine" ? "Semaine" : "Mois"}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {([["", `Tous (${tous.length})`], ["admission", `🗣️ Entretiens d'admission (${tous.filter((e) => e.type === "admission").length})`], ["entreprise", `🏢 Entretiens en entreprise (${tous.filter((e) => e.type === "entreprise").length})`]] as const).map(([id, l]) => (
          <Link key={id} href={lien({ filtre: id || "tous" })} className={`chip ${(filtre ?? "") === id || (!id && filtre === "tous") ? "chip-plus" : ""}`}>{l}</Link>
        ))}
      </div>

      {vue === "jour" && (
        <div className="flex flex-col gap-2">
          {!(parJour.get(ref) ?? []).length && <p className="text-sm text-muted">Aucun entretien ce jour-là.</p>}
          {(parJour.get(ref) ?? []).map((e) => (
            <Link key={e.id} href={e.lien} className={`flex items-center gap-4 rounded-xl border-l-4 p-3 hover:underline ${couleur(e)}`}>
              <b className="w-14 text-lg tabular-nums">{heure(e.quand)}</b>
              <span><b>{e.titre}</b><span className="block text-sm text-muted">{e.detail}{e.statut ? ` · ${e.statut}` : ""}</span></span>
            </Link>
          ))}
        </div>
      )}

      {vue !== "jour" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7 gap-1">
            {JOURS.map((j) => <div key={j} className="px-1 text-xs font-semibold uppercase text-muted">{j}</div>)}
            {Array.from({ length: Math.round((versDate(fin).getTime() - versDate(debut).getTime()) / 864e5) + 1 }, (_, i) => ajouter(debut, i)).map((j) => {
              const hors = vue === "mois" && j.slice(0, 7) !== ref.slice(0, 7);
              const evsJ = parJour.get(j) ?? [];
              return (
                <div key={j} className={`flex flex-col gap-1 rounded-lg border p-1.5 ${vue === "semaine" ? "min-h-48" : "min-h-24"} ${j === aujourdhui ? "border-accent" : "border-line"} ${hors ? "opacity-40" : ""}`}>
                  <Link href={lien({ vue: "jour", date: j })} className={`text-xs font-semibold hover:underline ${j === aujourdhui ? "text-accent" : "text-muted"}`}>{+j.slice(8)}</Link>
                  {evsJ.slice(0, vue === "mois" ? 3 : 20).map((e) => carte(e, vue === "mois"))}
                  {vue === "mois" && evsJ.length > 3 && <Link href={lien({ vue: "jour", date: j })} className="text-xs text-accent">+{evsJ.length - 3} autres</Link>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-xs text-muted">🗣️ en vert : entretiens d&apos;admission (leads) · 🏢 en bleu : entretiens des étudiants en entreprise. Clique sur un entretien pour ouvrir la fiche.</p>
    </section>
  );
}
