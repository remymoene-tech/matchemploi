import Link from "next/link";
import { Carrousel } from "@/components/accueil/Carrousel";
import { ApercuAlerte, ApercuApprend, ApercuCarte, ApercuCV, ApercuEcole } from "@/components/accueil/Apercus";

const DIAPOS = [
  { titre: "Les offres autour de chez toi, notées sur 100", contenu: <ApercuCarte /> },
  { titre: "L'avis de Jobaprox sur ton CV, avec des exemples", contenu: <ApercuCV /> },
  { titre: "« Pas pour moi » : Jobaprox apprend tes préférences", contenu: <ApercuApprend /> },
  { titre: "L'espace École fait le lien avec les entreprises", contenu: <ApercuEcole /> },
  { titre: "Une alerte dès qu'une offre te correspond", contenu: <ApercuAlerte /> },
];

const METIERS = [
  "Alternance commerce", "Assistant RH", "Conseiller clientèle", "Comptabilité", "Logistique", "Développeur web",
  "Négociateur immobilier", "Accueil", "Vendeur", "Assistant de gestion", "Marketing digital", "Chargé de recrutement",
  "Hôtellerie", "Petite enfance", "Secrétariat médical", "Électricien", "Banque", "Communication",
];

const ETAPES = [
  { t: "Crée ton espace", d: "Un email, un mot de passe. C'est gratuit, et ton école peut te donner son code." },
  { t: "Dépose ton CV", d: "Jobaprox le lit, lui donne une note et te montre en images comment l'améliorer." },
  { t: "Découvre tes offres", d: "Sur une carte autour de chez toi, chacune avec son % et l'explication de la note." },
  { t: "Affine et postule", d: "Dis « ça m'intéresse » ou « pas pour moi » : les prochaines offres seront encore plus justes." },
];

const ATOUTS = [
  { icone: "◎", t: "Une carte, pas une liste interminable", d: "Ta ville au centre, ton rayon de recherche, et chaque offre avec sa note. Zoome, clique, postule." },
  { icone: "%", t: "Une note que tu comprends", d: "Compétences, projet, distance, contrat : la note sur 100 explique ce qui colle et ce qui manque." },
  { icone: "✎", t: "Ton CV relu, en images", d: "Mise en page, description, expériences, photo : des conseils concrets avec des exemples avant / après." },
  { icone: "↻", t: "Jobaprox apprend de toi", d: "Trop loin ? Mauvais horaires ? Chaque « pas pour moi » rend les prochaines notes plus justes." },
  { icone: "⊕", t: "Toutes les offres au même endroit", d: "France Travail, Adzuna et les entreprises partenaires de ton école, dans un rayon autour de chez toi." },
  { icone: "✉", t: "Prévenu au bon moment", d: "Un email dès qu'une nouvelle offre te correspond à 75 % ou plus. Rien d'autre." },
];

export default function Accueil() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <div className="flex flex-col gap-20">
      {/* Accroche + carrousel */}
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div className="monte flex flex-col gap-5">
          <span className="chip chip-tag w-fit">Emploi · Alternance · Stage</span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Les offres qui te correspondent, <span className="text-accent">près de chez toi.</span>
          </h1>
          <p className="max-w-[54ch] text-lg text-muted">
            Dépose ton CV une fois. Jobaprox cherche chaque jour les offres autour de toi, les note sur 100 par rapport à ton
            profil, et t&apos;aide à améliorer ton CV pour décrocher l&apos;entretien.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/inscription" className="btn btn-primary px-5 py-2.5 text-base">Créer mon espace gratuit</Link>
            <Link href="/connexion" className="btn px-5 py-2.5 text-base">J&apos;ai déjà un compte</Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <li>✓ Gratuit pour les candidats</li>
            <li>✓ Offres France Travail et Adzuna</li>
            <li>✓ Sans discrimination</li>
          </ul>
        </div>
        <div className="monte min-w-0" style={{ animationDelay: ".15s" }}>
          <Carrousel diapos={DIAPOS} />
        </div>
      </section>

      {/* Bandeau de métiers qui défile */}
      <section aria-label="Exemples de métiers" className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-line bg-surface py-4">
        <div className="bandeau flex w-max gap-3">
          {[...METIERS, ...METIERS].map((m, i) => (
            <span key={i} className="chip whitespace-nowrap px-4 py-1.5 text-sm" aria-hidden={i >= METIERS.length}>{m}</span>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Comment ça marche</span>
          <h2 className="text-3xl font-extrabold">Quatre étapes, et c&apos;est Jobaprox qui cherche</h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES.map((e, i) => (
            <li key={e.t} className="card flex flex-col gap-2 p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full font-mono font-bold" style={{ background: "var(--primary-bg)", color: "var(--primary-ink)" }}>{i + 1}</span>
              <h3 className="text-lg font-semibold">{e.t}</h3>
              <p className="text-sm text-muted">{e.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Atouts */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Ce que Jobaprox fait pour toi</span>
          <h2 className="text-3xl font-extrabold">Moins de temps à chercher, plus de temps pour postuler</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ATOUTS.map((a) => (
            <article key={a.t} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent">
              <span className="grid h-10 w-10 place-items-center rounded-lg text-lg font-bold text-accent" style={{ background: "var(--accent-soft)" }} aria-hidden>{a.icone}</span>
              <h3 className="text-lg font-semibold">{a.t}</h3>
              <p className="text-sm text-muted">{a.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pour les écoles */}
      <section className="grid items-center gap-8 rounded-2xl p-6 sm:p-10 lg:grid-cols-2" style={{ background: "var(--accent-soft)" }}>
        <div className="flex flex-col gap-4">
          <span className="eyebrow">Pour les écoles et centres de formation</span>
          <h2 className="text-3xl font-extrabold">Vos étudiants, vos entreprises partenaires, un seul tableau de bord</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>✓ Vos étudiants s&apos;inscrivent avec le code de l&apos;école</li>
            <li>✓ Vos offres partenaires sont comparées à leurs profils, sans être visibles par eux</li>
            <li>✓ Vous recevez les correspondances à traiter, avec un message prêt pour l&apos;étudiant et pour l&apos;entreprise</li>
            <li>✓ Vous suivez chaque mise en relation jusqu&apos;à l&apos;embauche</li>
          </ul>
          {contact ? (
            <p className="text-sm">Votre école veut rejoindre Jobaprox ? Écrivez-nous : <a className="font-semibold text-accent" href={`mailto:${contact}`}>{contact}</a></p>
          ) : (
            <p className="text-sm text-muted">Votre école veut rejoindre Jobaprox ? Contactez l&apos;équipe qui vous a fait découvrir le site.</p>
          )}
        </div>
        <div className="min-w-0"><ApercuEcole /></div>
      </section>

      {/* Engagements */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Tes données t'appartiennent", "Ton profil n'est transmis à une entreprise qu'avec ton accord. Tu supprimes ton compte et ton CV quand tu veux."],
          ["Une note juste et transparente", "L'âge, le sexe, l'origine ou la photo ne comptent jamais dans la note. Jobaprox s'appuie sur l'intelligence artificielle pour lire les CV et les offres, et t'explique toujours sa note."],
          ["Gratuit pour toi", "Jobaprox est gratuit pour les candidats. Les offres viennent de sources officielles et des écoles partenaires."],
        ].map(([t, d]) => (
          <div key={t} className="flex flex-col gap-2 border-t-2 pt-4" style={{ borderColor: "var(--accent)" }}>
            <h3 className="text-lg font-semibold">{t}</h3>
            <p className="text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>

      {/* Appel final */}
      <section className="card flex flex-col items-center gap-4 p-10 text-center">
        <h2 className="text-3xl font-extrabold">Prêt à trouver ton prochain poste ?</h2>
        <p className="max-w-[50ch] text-muted">Crée ton espace en une minute. Ta première sélection d&apos;offres arrive dès que ton CV est déposé.</p>
        <Link href="/inscription" className="btn btn-primary px-6 py-3 text-base">Créer mon espace gratuit</Link>
      </section>
    </div>
  );
}
