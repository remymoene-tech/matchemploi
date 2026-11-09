import Link from "next/link";
import { Carrousel } from "@/components/accueil/Carrousel";
import { ApercuAlerte, ApercuApprend, ApercuCarte, ApercuCV } from "@/components/accueil/Apercus";
import { dateEvenementTexte, listeEvenements, type Evenement } from "@/lib/evenements";
import { jourParis } from "@/lib/planning";

export const revalidate = 300;

const ORIGINE = "Site MagnusMatch";
const brochure = (formation?: string) =>
  `/brochure?${new URLSearchParams({ origine: ORIGINE, ...(formation ? { formation } : {}) })}`;

const DIAPOS = [
  { titre: "Les entreprises autour de chez toi, notées sur 100", contenu: <ApercuCarte /> },
  { titre: "L'avis de MagnusMatch sur ton CV, avec des exemples", contenu: <ApercuCV /> },
  { titre: "« Pas pour moi » : MagnusMatch apprend tes préférences", contenu: <ApercuApprend /> },
  { titre: "Une alerte dès qu'une offre te correspond", contenu: <ApercuAlerte /> },
];

const PROFILS = [
  { icone: "🎒", t: "Je suis lycéen(ne)", d: "Bac en poche bientôt ? Découvre nos formations après le bac.", href: "#formations" },
  { icone: "🎓", t: "Je suis étudiant(e)", d: "Poursuis tes études en alternance, payées par l'entreprise.", href: "#formations" },
  { icone: "🔄", t: "Je suis en reconversion", d: "Salarié ou demandeur d'emploi : formations accessibles aussi par la VAE.", href: brochure() },
  { icone: "🏢", t: "Je suis une entreprise", d: "Vous cherchez un alternant ? On vous présente des profils.", href: "#entreprises" },
];

type Formation = {
  sigle: string; nom: string; niveau: string; duree: string; rythme: string; prix: string;
  points: string[]; metiers: string[]; couleur: string;
};

const FORMATIONS: Formation[] = [
  {
    sigle: "EGC", nom: "EGC Business School · Bachelor", niveau: "Bachelor · Bac+3", duree: "3 ans",
    rythme: "1re année en formation initiale, 2e et 3e années en alternance", prix: "Alternance gratuite pour l'étudiant",
    points: ["Marketing, communication digitale", "Politique commerciale et négociation", "Gestion, finance, management d'équipe", "Entrepreneuriat, anglais et TOEIC"],
    metiers: ["Chargé(e) de développement commercial", "Chef(fe) de projet marketing", "Créateur·rice d'entreprise"],
    couleur: "var(--jaune)",
  },
  {
    sigle: "GUC", nom: "Gestionnaire d'Unité Commerciale", niveau: "Bac+2 · RNCP 36141 niveau 5", duree: "2 ans",
    rythme: "2 jours par semaine au centre, 3 jours en entreprise", prix: "0 € en apprentissage ou alternance",
    points: ["Actions commerciales et marketing « phygital »", "Vente et relation client omnicanale", "Suivi des ventes et gestion des stocks", "Organisation et animation d'équipe"],
    metiers: ["Responsable de rayon", "Manager des ventes", "Assistant(e) directeur·rice de magasin"],
    couleur: "var(--sauge)",
  },
  {
    sigle: "AMLHR", nom: "Assistant(e) Manager Loisirs Hébergement Restauration", niveau: "Bac+2 · RNCP 38039 niveau 5", duree: "2 ans",
    rythme: "1 semaine par mois au CFA, ou 2 j / 3 j selon la saison", prix: "0 € en apprentissage ou alternance",
    points: ["Piloter l'activité d'un établissement", "Accueil et relation client, en plusieurs langues", "Encadrer et animer une équipe", "Promotion, communication, e-réputation"],
    metiers: ["Assistant(e) manager", "Adjoint(e) de direction", "Chef(fe) de service hébergement ou restauration"],
    couleur: "var(--rose)",
  },
];

/** Sur l'accueil : seulement les événements cochés « Mettre sur la page d'accueil ». */
const surAccueil = (e: Evenement) => e.sur_accueil === true;

async function prochainsEvenements(): Promise<Evenement[]> {
  try {
    const aujourdhui = jourParis(new Date());
    const liste = (await listeEvenements()) ?? [];
    return liste.filter((e) => e.date >= aujourdhui && surAccueil(e)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  } catch {
    return [];
  }
}

function Titre({ sur, children }: { sur?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {sur && <span className="eyebrow">{sur}</span>}
      <h2 className="font-display text-3xl font-medium uppercase tracking-[.06em]">{children}</h2>
    </div>
  );
}

export default async function Accueil() {
  const evenements = await prochainsEvenements();
  return (
    <div className="flex flex-col gap-20">
      {/* Accroche : bloc noir, comme le site du Campus */}
      <section>
        <div className="monte relative z-10 flex flex-col justify-center gap-5 bg-[#111] p-8 text-white sm:p-12 lg:px-16 lg:py-14">
          <span className="text-xs font-semibold uppercase tracking-[.2em] text-[#c3cdb8]">Campus Magnus · Arles</span>
          <h1 className="font-display text-4xl font-medium uppercase leading-[1.05] tracking-[.04em] sm:text-5xl">
            Ta formation <span className="text-[#c3cdb8]">et ton alternance</span>, au même endroit.
          </h1>
          <p className="max-w-[52ch] text-[#d6d9d1]">
            EGC Business School et le CFA Négoventis de la CCI du Pays d&apos;Arles forment aux métiers du commerce, du management
            et du tourisme. Avec MagnusMatch, on t&apos;aide aussi à trouver l&apos;entreprise qui t&apos;accueillera.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={brochure()} className="btn btn-primary px-5 py-2.5 text-base">📬 Clique pour avoir ta brochure</Link>
            <Link href="#formations" className="btn border-white/40 bg-transparent px-5 py-2.5 text-base text-white hover:bg-white/10">Voir les formations</Link>
          </div>
        </div>
      </section>

      {/* Je suis… */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROFILS.map((p) => (
          <Link key={p.t} href={p.href} className="group flex flex-col gap-2 rounded-xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-ink">
            <span className="text-3xl" aria-hidden>{p.icone}</span>
            <span className="flex items-center justify-between gap-2 text-sm font-semibold uppercase tracking-[.08em]">
              {p.t} <span className="transition group-hover:translate-x-1" aria-hidden>›</span>
            </span>
            <span className="text-sm text-muted">{p.d}</span>
          </Link>
        ))}
      </section>

      {/* Formations */}
      <section id="formations" className="flex scroll-mt-6 flex-col gap-6">
        <Titre sur="Nos formations">Trois parcours, un même campus</Titre>
        <div className="grid gap-5 lg:grid-cols-3">
          {FORMATIONS.map((f) => (
            <article key={f.sigle} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
              <div className="h-2" style={{ background: f.couleur }} aria-hidden />
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div>
                  <p className="font-display text-3xl font-semibold tracking-[.08em]">{f.sigle}</p>
                  <h3 className="font-semibold leading-snug">{f.nom}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-muted">{f.niveau} · {f.duree}</p>
                </div>
                <dl className="grid gap-2 text-sm">
                  <div><dt className="font-semibold">📅 Rythme</dt><dd className="text-muted">{f.rythme}</dd></div>
                  <div><dt className="font-semibold">💶 Prix</dt><dd className="text-muted">{f.prix}</dd></div>
                </dl>
                <div className="text-sm">
                  <p className="font-semibold">Au programme</p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-muted">{f.points.map((x) => <li key={x}>· {x}</li>)}</ul>
                </div>
                <div className="flex flex-wrap gap-1.5">{f.metiers.map((m) => <span key={m} className="chip text-xs">{m}</span>)}</div>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link href={brochure(f.sigle)} className="btn btn-primary btn-sm">📬 Télécharge ta brochure {f.sigle}</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="text-sm text-muted">
          Formations accessibles aux jeunes en apprentissage ou en contrat pro, aux salariés et demandeurs d&apos;emploi, et par la VAE.
          Locaux adaptés et référent handicap. Préinscription possible toute l&apos;année.
        </p>
      </section>

      {/* Agenda + MagnusMatch */}
      <section className="grid grid-cols-[minmax(0,1fr)] gap-0 overflow-hidden rounded-xl border border-line lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4 bg-[#111] p-8 text-white">
          <h2 className="font-display text-2xl font-medium uppercase tracking-[.08em]">Journées portes ouvertes</h2>
          {evenements.length ? (
            <ul className="flex flex-col divide-y divide-white/15">
              {evenements.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{e.nom}</p>
                    <p className="text-sm capitalize text-[#c9ccc4]">📅 {dateEvenementTexte(e.date)}{e.lieu ? ` · ${e.lieu}` : ""}</p>
                  </div>
                  <Link href={`/brochure?evenement=${e.code}`} className="btn btn-sm border-white/40 bg-transparent text-white hover:bg-white/10">Je viens ›</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#c9ccc4]">Les prochaines journées portes ouvertes arrivent bientôt : demande ta brochure pour être tenu(e) au courant.</p>
          )}
        </div>
        <div className="flex flex-col gap-4 bg-surface p-8">
          <span className="eyebrow">Une fois admis(e)</span>
          <h2 className="font-display text-2xl font-medium uppercase tracking-[.06em]">MagnusMatch t&apos;aide à trouver ton entreprise</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>✓ Ton CV relu, avec des conseils concrets et des exemples</li>
            <li>✓ Des offres d&apos;alternance autour de chez toi, notées sur 100</li>
            <li>✓ Les entreprises partenaires de l&apos;école, présentées par l&apos;équipe</li>
            <li>✓ Une alerte dès qu&apos;une offre te correspond</li>
          </ul>
          <div className="min-w-0"><Carrousel diapos={DIAPOS} /></div>
          <p className="text-sm text-muted">
            Tu as reçu ton lien d&apos;admission ? <Link href="/inscription" className="font-semibold text-accent">Crée ton espace</Link> ou{" "}
            <Link href="/connexion" className="font-semibold text-accent">connecte-toi</Link>.
          </p>
        </div>
      </section>

      {/* Entreprises */}
      <section id="entreprises" className="grid scroll-mt-6 items-center gap-8 rounded-xl p-8 sm:p-10 lg:grid-cols-[1.3fr_1fr]" style={{ background: "var(--accent-soft)" }}>
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Entreprises</span>
          <h2 className="font-display text-3xl font-medium uppercase tracking-[.06em]">Vous recrutez un alternant ?</h2>
          <p className="max-w-[60ch] text-muted">
            Dites-nous ce que vous cherchez : poste, missions, rythme, profil. L&apos;équipe vous présente les étudiants qui correspondent
            et vous accompagne pour le contrat d&apos;apprentissage ou de professionnalisation.
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            <li>✓ Un interlocuteur unique au Campus</li>
            <li>✓ Des candidats déjà formés aux bases du métier</li>
            <li>✓ Une fiche de poste rédigée avec vous</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-xl bg-surface p-6">
          <p className="font-semibold">Parlons de votre besoin</p>
          <a href="tel:0490990808" className="btn justify-start">📞 04 90 99 08 08</a>
          <a href="mailto:cfa@arles.cci.fr?subject=Recrutement%20d%27un%20alternant" className="btn btn-primary justify-start">✉️ cfa@arles.cci.fr</a>
        </div>
      </section>

      {/* Contact */}
      <section className="grid gap-6 border-t-2 pt-8 sm:grid-cols-3" style={{ borderColor: "var(--ink)" }}>
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-display text-lg font-medium uppercase tracking-[.1em]">Campus Magnus</p>
          <p className="text-muted">Business School et formations en alternance · CCI du Pays d&apos;Arles</p>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold">📍 Nous trouver</p>
          <p className="text-muted">45 Bd Marcellin Berthelot, 13200 Arles</p>
          <p className="text-muted">Lundi au vendredi, 8 h – 18 h</p>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold">☎️ Nous contacter</p>
          <a href="tel:0490990808" className="text-muted hover:text-ink">04 90 99 08 08</a>
          <a href="mailto:egc@arles.cci.fr" className="text-muted hover:text-ink">egc@arles.cci.fr (EGC)</a>
          <a href="mailto:cfa@arles.cci.fr" className="text-muted hover:text-ink">cfa@arles.cci.fr (GUC, AMLHR)</a>
        </div>
      </section>
    </div>
  );
}
