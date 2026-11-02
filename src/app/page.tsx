import Link from "next/link";
import { Chips, Score } from "@/components/Score";

const ETAPES = [
  { t: "Crée ton espace", d: "Un email, un mot de passe. C'est gratuit." },
  { t: "Dépose ton CV et ton projet", d: "Le poste que tu vises, ta ville, le type de contrat : alternance, CDI, CDD, intérim ou stage." },
  { t: "Reçois les bonnes offres", d: "On compare ton profil aux offres de France Travail et des entreprises partenaires. Tu es prévenu par email dès qu'une offre te correspond à 75 % ou plus." },
];

export default function Accueil() {
  return (
    <div className="flex flex-col gap-14">
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-5">
          <span className="eyebrow">Recherche d&apos;emploi et d&apos;alternance</span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Arrête d&apos;éplucher les annonces. <span className="text-accent">On les trie pour toi.</span>
          </h1>
          <p className="max-w-[56ch] text-lg text-muted">
            Dépose ton CV une fois. Chaque jour, MatchEmploi lit les nouvelles offres, les note par rapport à ton profil
            et ne te garde que celles qui te correspondent vraiment, avec l&apos;explication de la note.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/inscription" className="btn btn-primary">Créer mon espace</Link>
            <Link href="/connexion" className="btn">J&apos;ai déjà un compte</Link>
          </div>
        </div>

        <figure className="card flex flex-col gap-3 p-5 shadow-sm" aria-label="Exemple d'offre notée">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Exemple</span>
            <span className="chip">France Travail</span>
          </div>
          <div className="flex gap-4">
            <Score score={86} seuil={75} grand />
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-lg font-semibold">Négociateur·rice immobilier en alternance</h3>
              <p className="text-sm text-muted">Agence du 3e · Lyon 3e · Apprentissage · 2 j école / 3 j entreprise</p>
            </div>
          </div>
          <p className="text-sm">Profil commercial déjà passé par une agence immobilière, à 20 minutes de l&apos;offre, avec le bon diplôme.</p>
          <Chips forts={["Stage en agence immobilière", "Vente conseil", "Rythme identique"]} manques={["Prospection téléphonique"]} />
        </figure>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold">Comment ça marche</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <li key={e.t} className="card flex flex-col gap-2 p-5">
              <span className="font-mono text-sm font-bold text-accent">Étape {i + 1}</span>
              <h3 className="text-lg font-semibold">{e.t}</h3>
              <p className="text-sm text-muted">{e.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card grid gap-6 p-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Une note que tu comprends</h2>
          <p className="text-sm text-muted">
            La note sur 100 tient compte de tes compétences, de ton projet, de la distance et du type de contrat.
            L&apos;âge, le sexe, l&apos;origine ou la photo ne comptent jamais.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Tu gardes la main</h2>
          <p className="text-sm text-muted">
            Ton profil n&apos;est transmis à une entreprise partenaire qu&apos;avec ton accord. Tu peux supprimer ton compte et ton CV quand tu veux.
          </p>
        </div>
      </section>
    </div>
  );
}
