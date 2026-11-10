import Link from "next/link";
import { LEGAL, SOUS_TRAITANTS } from "@/lib/legal";

export const metadata = { title: "Politique de confidentialité · MagnusMatch", description: "Quelles données nous collectons, pourquoi, combien de temps, et vos droits (RGPD)." };

const AC = <span className="rounded bg-warn-soft px-1.5 text-warn">à compléter</span>;

const TRAITEMENTS = [
  {
    qui: "🧲 Demande de brochure et admission (prospects)",
    donnees: "Prénom, nom, email, téléphone, formation visée, année de rentrée, échanges avec l'équipe, entretien d'admission.",
    pourquoi: "Vous envoyer la brochure, vous recontacter, organiser l'entretien d'admission.",
    base: "Votre consentement (case cochée dans le formulaire), puis mesures précontractuelles pour l'admission.",
    duree: "3 ans après le dernier contact, puis suppression.",
  },
  {
    qui: "🎓 Étudiants admis (espace MagnusMatch)",
    donnees: "Identité et coordonnées, formation, CV, profil LinkedIn (si vous le donnez), préférences, tests (DISC, management), offres consultées, prospections, carte de visite.",
    pourquoi: "Vous proposer des offres adaptées, vous aider à améliorer votre CV, vous mettre en relation avec des entreprises.",
    base: "Votre consentement et l'exécution de votre formation au Campus.",
    duree: "Pendant votre formation, puis 3 ans. Vous pouvez supprimer votre compte à tout moment.",
  },
  {
    qui: "🎓 Alumni",
    donnees: "Coordonnées, diplôme, parcours professionnel, entreprise, souhait d'aider le Campus.",
    pourquoi: "Garder le lien, proposer des offres, faciliter les échanges avec les étudiants et les entreprises.",
    base: "Votre consentement.",
    duree: "Tant que vous gardez votre espace ; un email par an vous propose de mettre à jour vos informations. Suppression sur simple demande.",
  },
  {
    qui: "🧑‍🏫 Intervenants",
    donnees: "Coordonnées, spécialités, situation, entreprise, présentation, CV, disponibilités.",
    pourquoi: "Vous proposer des interventions au Campus.",
    base: "Votre consentement (case cochée dans le questionnaire).",
    duree: "3 ans après le dernier contact, puis suppression.",
  },
  {
    qui: "🏢 Contacts en entreprise",
    donnees: "Nom, fonction, coordonnées professionnelles, besoins de recrutement, échanges.",
    pourquoi: "Développer les partenariats, l'alternance et le placement des étudiants.",
    base: "Intérêt légitime du Campus (relation professionnelle).",
    duree: "3 ans après le dernier contact.",
  },
] as const;

export default function Confidentialite() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 text-[15px] leading-relaxed">
      <header>
        <span className="eyebrow">RGPD</span>
        <h1 className="text-3xl font-extrabold">Politique de confidentialité</h1>
        <p className="text-sm text-muted">Dernière mise à jour : {LEGAL.miseAJour}</p>
      </header>

      <p>Cette page explique, simplement, quelles données personnelles le site <b>{LEGAL.site}</b> collecte, pourquoi, combien de temps nous les gardons, et comment exercer vos droits.</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">1. Qui est responsable de vos données ?</h2>
        <p>{LEGAL.editeur}, {LEGAL.adresse}.</p>
        <p>Délégué à la protection des données (DPO) : {LEGAL.emailDpo ? <a href={`mailto:${LEGAL.emailDpo}`} className="text-accent underline">{LEGAL.emailDpo}</a> : AC}.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">2. Quelles données, pourquoi, et combien de temps ?</h2>
        {TRAITEMENTS.map((t) => (
          <div key={t.qui} className="card flex flex-col gap-1.5 p-4 text-sm">
            <p className="text-base font-semibold">{t.qui}</p>
            <p><b>Données :</b> {t.donnees}</p>
            <p><b>Pourquoi :</b> {t.pourquoi}</p>
            <p><b>Base légale :</b> {t.base}</p>
            <p><b>Durée de conservation :</b> {t.duree}</p>
          </div>
        ))}
        <p className="text-sm text-muted">Nous ne collectons que les données utiles. Nous ne demandons jamais d&apos;informations sur votre santé, vos origines, vos opinions ou votre religion.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">3. Qui peut voir vos données ?</h2>
        <ul className="ml-5 list-disc">
          <li><b>L&apos;équipe du Campus Magnus</b>, chacun selon son rôle (admissions, relations entreprises, pédagogie, direction).</li>
          <li><b>Les entreprises</b> : votre profil n&apos;est transmis à une entreprise <b>qu&apos;avec votre accord</b>. Les notes d&apos;entretien, les résultats de tests et les échanges internes ne leur sont jamais montrés.</li>
          <li><b>Votre carte de visite</b> (étudiants et alumni) : les informations que vous choisissez d&apos;y afficher sont visibles par toute personne qui scanne votre QR code. Vous pouvez la désactiver à tout moment.</li>
          <li><b>Nos prestataires techniques</b>, uniquement pour faire fonctionner le site :</li>
        </ul>
        <ul className="ml-10 list-[circle] text-sm">
          {SOUS_TRAITANTS.map((s) => <li key={s.nom}><b>{s.nom}</b> · {s.role} · {s.lieu}</li>)}
        </ul>
        <p className="text-sm">Certains prestataires sont situés aux <b>États-Unis</b>. Ces transferts sont encadrés par les garanties prévues par le RGPD (clauses contractuelles types de la Commission européenne ou cadre de protection des données UE–États-Unis). Nous ne vendons jamais vos données.</p>
        <p className="text-sm">Pour chercher des offres, le site envoie aux sites d&apos;emploi (France Travail, Adzuna, La bonne alternance) des mots-clés et une ville, <b>jamais votre nom ni vos coordonnées</b>.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">4. Intelligence artificielle</h2>
        <p>Votre CV et les offres peuvent être analysés par une intelligence artificielle (service d&apos;Anthropic) pour calculer une note de correspondance et vous donner des conseils. Ces notes sont une <b>aide</b> : aucune décision d&apos;admission, de recrutement ou de placement n&apos;est prise automatiquement, c&apos;est toujours une personne de l&apos;équipe qui décide. L&apos;âge, le sexe, l&apos;origine ou la photo ne sont jamais pris en compte.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">5. Cookies</h2>
        <p>Le site n&apos;utilise <b>aucun cookie publicitaire ni de mesure d&apos;audience</b>. Il utilise seulement :</p>
        <ul className="ml-5 list-disc">
          <li>un <b>cookie de connexion</b>, indispensable pour rester connecté à votre espace ;</li>
          <li>un petit <b>stockage local</b> dans votre navigateur pour retenir des préférences d&apos;affichage (par exemple les étapes LinkedIn déjà faites).</li>
        </ul>
        <p className="text-sm text-muted">Ces éléments sont strictement nécessaires : ils ne demandent pas de consentement.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">6. Vos droits</h2>
        <p>Vous pouvez à tout moment demander à <b>accéder</b> à vos données, les <b>corriger</b>, les <b>supprimer</b>, en <b>limiter</b> l&apos;utilisation, vous <b>opposer</b> à leur utilisation, les <b>récupérer</b> (portabilité) ou <b>retirer votre consentement</b>.</p>
        <ul className="ml-5 list-disc">
          <li>Étudiants et alumni : vous pouvez modifier votre profil et <b>supprimer votre compte</b> vous-même dans <Link href="/espace/profil" className="text-accent underline">Mon profil</Link>.</li>
          <li>Pour toute autre demande : écrivez à {LEGAL.emailDpo ? <a href={`mailto:${LEGAL.emailDpo}`} className="text-accent underline">{LEGAL.emailDpo}</a> : <a href={`mailto:${LEGAL.emailContact}`} className="text-accent underline">{LEGAL.emailContact}</a>}. Nous répondons sous un mois.</li>
        </ul>
        <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la <b>CNIL</b> (www.cnil.fr).</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">7. Sécurité</h2>
        <p>Les données sont protégées par des accès personnels. Les CV sont stockés dans un espace privé et ne s&apos;ouvrent que par des liens temporaires. Chaque membre de l&apos;équipe n&apos;accède qu&apos;aux parties utiles à son rôle.</p>
      </section>

      <p className="text-sm text-muted">Voir aussi les <Link href="/mentions-legales" className="text-accent underline">mentions légales</Link>.</p>
    </article>
  );
}
