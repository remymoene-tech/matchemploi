import Link from "next/link";
import { LEGAL, SOUS_TRAITANTS } from "@/lib/legal";

export const metadata = { title: "Mentions légales · MagnusMatch", description: "Éditeur, hébergeur et conditions d'utilisation du site MagnusMatch." };

const AC = <span className="rounded bg-warn-soft px-1.5 text-warn">à compléter</span>;

export default function MentionsLegales() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 text-[15px] leading-relaxed">
      <header>
        <span className="eyebrow">Informations légales</span>
        <h1 className="text-3xl font-extrabold">Mentions légales</h1>
        <p className="text-sm text-muted">Dernière mise à jour : {LEGAL.miseAJour}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">1. Éditeur du site</h2>
        <p>Le site <b>{LEGAL.site}</b> ({LEGAL.url}) est édité par :</p>
        <ul className="ml-5 list-disc">
          <li>{LEGAL.editeur}</li>
          <li>Adresse : {LEGAL.adresse}</li>
          <li>Téléphone : {LEGAL.telephone}</li>
          <li>Email : <a href={`mailto:${LEGAL.emailContact}`} className="text-accent underline">{LEGAL.emailContact}</a></li>
          <li>SIRET : {LEGAL.siret ?? AC}</li>
          <li>Directeur ou directrice de la publication : {LEGAL.directeurPublication ?? AC}</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">2. Hébergement</h2>
        <ul className="ml-5 list-disc">
          {SOUS_TRAITANTS.slice(0, 2).map((s) => <li key={s.nom}><b>{s.nom}</b> · {s.role} · {s.lieu}</li>)}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">3. Objet du site</h2>
        <p>{LEGAL.site} accompagne les personnes intéressées par les formations du Campus Magnus (demande de brochure, admission) et ses étudiants dans leur recherche d&apos;alternance, de stage ou d&apos;emploi. Il permet aussi à l&apos;équipe du Campus de suivre les candidatures, les entreprises partenaires et les intervenants.</p>
        <p>Les offres d&apos;emploi affichées proviennent de sources publiques (France Travail, Adzuna, La bonne alternance) et des entreprises partenaires. Le Campus Magnus ne garantit ni leur exactitude ni leur disponibilité, et n&apos;est pas l&apos;employeur.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">4. Intelligence artificielle</h2>
        <p>Certaines fonctions utilisent l&apos;intelligence artificielle : lecture des CV, note de correspondance avec une offre, conseils pour le CV et LinkedIn, rédaction de fiches de poste. Ce sont des <b>aides</b> : elles peuvent se tromper et ne remplacent jamais la décision de l&apos;équipe. L&apos;âge, le sexe, l&apos;origine ou la photo ne sont jamais pris en compte dans les notes.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">5. Propriété intellectuelle</h2>
        <p>Les textes, la présentation et les éléments graphiques du site sont protégés. Les noms et logos du Campus Magnus, d&apos;EGC Business School, du CFA Négoventis et de la CCI du Pays d&apos;Arles appartiennent à leurs titulaires. Toute reproduction sans autorisation est interdite.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">6. Données personnelles et cookies</h2>
        <p>La façon dont nous utilisons vos données, vos droits et la liste des cookies sont expliqués dans la <Link href="/confidentialite" className="font-semibold text-accent underline">politique de confidentialité</Link>.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">7. Contact</h2>
        <p>Pour toute question sur le site : <a href={`mailto:${LEGAL.emailContact}`} className="text-accent underline">{LEGAL.emailContact}</a> · {LEGAL.telephone}.</p>
      </section>
    </article>
  );
}
