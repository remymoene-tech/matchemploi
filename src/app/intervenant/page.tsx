import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FormIntervenant } from "@/components/FormIntervenant";

export const metadata = { title: "Intervenant · Campus Magnus", description: "Proposez votre profil d'intervenant au Campus Magnus." };

/** Page publique : un professionnel propose d'intervenir au Campus (carnet d'adresses des intervenants). */
export default function Intervenant() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo taille="lg" />
        <div>
          <span className="eyebrow">Campus Magnus · Arles</span>
          <h1 className="text-3xl font-extrabold">🧑‍🏫 Devenir intervenant(e)</h1>
          <p className="text-muted">Professionnel(le) de votre domaine ? Partagez votre expérience avec nos étudiants. Déposez votre profil et votre CV : l&apos;équipe pédagogique vous recontacte.</p>
        </div>
      </div>
      <FormIntervenant />
      <Link href="/brochure" className="mx-auto text-sm text-muted hover:text-ink">← Vous cherchez plutôt une formation ? Recevoir la brochure</Link>
    </div>
  );
}
