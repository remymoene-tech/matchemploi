import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { jourParis } from "@/lib/planning";
import { nomPersonne, personnesEquipe } from "@/lib/equipe";
import { Colonnes } from "@/components/Graphiques";

type Periode = "jour" | "semaine" | "mois";

const PERIODES: { id: Periode; label: string }[] = [
  { id: "jour", label: "Jour" },
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
];

const TYPES = [
  { id: "telephone", titre: "📞 Appels", vide: "Aucun appel noté" },
  { id: "email", titre: "✉️ Mails", vide: "Aucun mail noté" },
  { id: "sms", titre: "💬 SMS", vide: "Aucun SMS noté" },
] as const;

// Dates « AAAA-MM-JJ » manipulées à midi UTC : pas de souci de changement d'heure
const d = (s: string) => new Date(`${s}T12:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);
const plusJours = (s: string, n: number) => { const x = d(s); x.setUTCDate(x.getUTCDate() + n); return iso(x); };

/** Début et fin (inclus) de la période qui contient la date. */
function bornes(periode: Periode, jour: string): [string, string] {
  if (periode === "jour") return [jour, jour];
  if (periode === "semaine") { const lundi = plusJours(jour, -((d(jour).getUTCDay() + 6) % 7)); return [lundi, plusJours(lundi, 6)]; }
  const debut = `${jour.slice(0, 7)}-01`;
  const x = d(debut); x.setUTCMonth(x.getUTCMonth() + 1); x.setUTCDate(0);
  return [debut, iso(x)];
}

function decaler(periode: Periode, jour: string, sens: 1 | -1) {
  if (periode === "jour") return plusJours(jour, sens);
  if (periode === "semaine") return plusJours(jour, 7 * sens);
  const x = d(`${jour.slice(0, 7)}-15`); x.setUTCMonth(x.getUTCMonth() + sens); return iso(x);
}

function titrePeriode(periode: Periode, [debut, fin]: [string, string], aujourdhui: string) {
  const f = (s: string, o: Intl.DateTimeFormatOptions) => d(s).toLocaleDateString("fr-FR", { ...o, timeZone: "UTC" });
  if (periode === "jour") return debut === aujourdhui ? "Aujourd'hui" : f(debut, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (periode === "semaine") return `${aujourdhui >= debut && aujourdhui <= fin ? "Cette semaine · " : ""}du ${f(debut, { day: "numeric", month: "short" })} au ${f(fin, { day: "numeric", month: "short", year: "numeric" })}`;
  return f(debut, { month: "long", year: "numeric" });
}

/**
 * Activité de l'équipe : appels, mails et SMS notés dans les échanges (leads, candidats, entreprises),
 * par personne, sur un jour, une semaine ou un mois. L'administrateur peut remonter dans l'historique.
 */
export async function ActiviteEquipe({ periode: p, date, historique, leads }: {
  periode?: string; date?: string; historique: boolean;
  leads: { attribue_a?: string | null; statut: string }[] | null;
}) {
  const periode: Periode = p === "jour" || p === "mois" ? p : "semaine";
  const aujourdhui = jourParis(new Date());
  const jour = historique && date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= aujourdhui ? date : aujourdhui;
  const [debut, fin] = bornes(periode, jour);

  const db = createAdminClient();
  const { data } = await db.from("echanges").select("auteur, type, date_echange")
    .in("type", TYPES.map((t) => t.id)).neq("auteur", "")
    .gte("date_echange", `${plusJours(debut, -1)}T00:00:00Z`).lte("date_echange", `${plusJours(fin, 1)}T23:59:59Z`)
    .limit(20000);
  const echanges = ((data ?? []) as { auteur: string; type: string; date_echange: string }[])
    .filter((e) => { const j = jourParis(e.date_echange); return j >= debut && j <= fin; });

  const personnes = await personnesEquipe();
  const nom = (email: string) => nomPersonne(personnes.find((x) => x.email === email.toLowerCase()), email);
  const parPersonne = (liste: string[]) => {
    const n = new Map<string, number>();
    for (const e of liste) n.set(e.toLowerCase(), (n.get(e.toLowerCase()) ?? 0) + 1);
    return [...n.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  };

  // Leads suivis par personne (ceux qui en ont au moins un) ; « en cours » = ni perdus ni admis
  const suivis = new Map<string, { total: number; enCours: number }>();
  for (const l of leads ?? []) {
    if (!l.attribue_a) continue;
    const s = suivis.get(l.attribue_a) ?? { total: 0, enCours: 0 };
    s.total++;
    if (!["perdu", "admis", "inscrit"].includes(l.statut)) s.enCours++;
    suivis.set(l.attribue_a, s);
  }
  const lignesLeads = [...suivis.entries()].sort((a, b) => b[1].total - a[1].total);

  const url = (per: Periode, dt?: string) => `/admin?${new URLSearchParams({ aperiode: per, ...(dt && dt !== aujourdhui ? { adate: dt } : {}) })}#activite`;
  const precedent = decaler(periode, jour, -1);
  const suivant = decaler(periode, jour, 1);

  return (
    <section id="activite" className="card flex scroll-mt-6 flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">📊 Activité de l&apos;équipe</h2>
          <p className="text-sm text-muted">Appels, mails et SMS notés dans les échanges · {titrePeriode(periode, [debut, fin], aujourdhui)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {historique && <Link href={url(periode, precedent)} className="btn btn-sm" aria-label="Période précédente">←</Link>}
          <nav className="flex gap-1 rounded-full border border-line p-1 text-sm" aria-label="Période">
            {PERIODES.map((x) => (
              <Link key={x.id} href={url(x.id, jour)} aria-current={periode === x.id ? "page" : undefined}
                className={`rounded-full px-3 py-1 font-semibold ${periode === x.id ? "bg-[var(--sauge)] text-ink" : "text-muted hover:text-ink"}`}>{x.label}</Link>
            ))}
          </nav>
          {historique && suivant <= aujourdhui && <Link href={url(periode, suivant)} className="btn btn-sm" aria-label="Période suivante">→</Link>}
          {historique && jour !== aujourdhui && <Link href={url(periode)} className="btn btn-sm btn-ghost">Aujourd&apos;hui</Link>}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {TYPES.map((t) => {
          const lignes = parPersonne(echanges.filter((e) => e.type === t.id).map((e) => e.auteur));
          const total = lignes.reduce((s, [, v]) => s + v, 0);
          return (
            <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <p className="flex items-baseline justify-between gap-2"><span className="font-semibold">{t.titre}</span><span className="font-mono text-xl font-bold tabular-nums">{total}</span></p>
              {lignes.length
                ? <Colonnes resume={`${t.titre} par personne`} donnees={lignes.map(([email, v]) => ({ label: nom(email), valeur: v }))} />
                : <p className="text-sm text-muted">{t.vide} sur cette période.</p>}
            </div>
          );
        })}
        <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <p className="flex items-baseline justify-between gap-2"><span className="font-semibold">🧲 Leads suivis</span><span className="font-mono text-xl font-bold tabular-nums">{lignesLeads.reduce((s, [, v]) => s + v.total, 0)}</span></p>
          {lignesLeads.length
            ? <Colonnes resume="Leads suivis par personne" donnees={lignesLeads.map(([email, v]) => ({ label: nom(email), valeur: v.total, detail: `${nom(email)} : ${v.total} lead${v.total > 1 ? "s" : ""}, dont ${v.enCours} en cours`, href: `/admin?vue=leads&lsuivi=${encodeURIComponent(email)}` }))} />
            : <p className="text-sm text-muted">Aucun lead attribué pour le moment.</p>}
          <p className="text-xs text-muted">Tous les leads attribués, toutes périodes.</p>
        </div>
      </div>
      {!historique && <p className="text-xs text-muted">L&apos;historique des périodes passées est réservé à l&apos;administrateur.</p>}
    </section>
  );
}
