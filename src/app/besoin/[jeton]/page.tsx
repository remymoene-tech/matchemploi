import { entrepriseParJeton } from "@/lib/fiche-besoin";
import { QuestionnaireAttentes } from "@/components/QuestionnaireAttentes";
import { Logo } from "@/components/Logo";
import { enregistrerBesoinEntreprise } from "./actions";

export const metadata = { title: "Fiche besoin · Magnus Campus", robots: { index: false } };

/** Page publique (lien personnel) : l'entreprise remplit sa fiche besoin, sans compte. */
export default async function FicheBesoinEntreprise({ params, searchParams }: { params: Promise<{ jeton: string }>; searchParams: Promise<{ merci?: string }> }) {
  const { jeton } = await params;
  const { merci } = await searchParams;
  const e = await entrepriseParJeton(jeton);

  if (!e) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <Logo taille="lg" />
        <h1 className="text-2xl font-extrabold">Ce lien n&apos;est plus valable</h1>
        <p className="text-muted">Il a peut-être expiré. Contactez l&apos;école Magnus Campus pour en recevoir un nouveau.</p>
      </div>
    );
  }

  if (merci) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <Logo taille="lg" />
        <h1 className="text-2xl font-extrabold">Merci {e.contact_nom || ""} 🙏</h1>
        <p>Vos besoins sont bien enregistrés. L&apos;équipe Magnus Campus revient vers vous avec des profils d&apos;étudiants adaptés.</p>
        <p className="text-sm text-muted">Vous pouvez modifier vos réponses avec le même lien pendant {60} jours.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo taille="lg" />
        <div>
          <span className="eyebrow">Fiche besoin · {e.nom}</span>
          <h1 className="text-3xl font-extrabold">Quel profil recherchez-vous ?</h1>
          <p className="mx-auto max-w-[60ch] text-muted">
            Quelques cases à cocher (2 minutes) pour que l&apos;école Magnus Campus vous présente les étudiants qui vous correspondent vraiment.
            Vos réponses restent internes à l&apos;école.
          </p>
        </div>
      </div>
      <form action={enregistrerBesoinEntreprise} className="card flex flex-col gap-4 p-5">
        <input type="hidden" name="jeton" value={jeton} />
        <QuestionnaireAttentes a={e.attentes} ouvert titre="Vos besoins" sousTitre="" />
        <div className="flex justify-end"><button className="btn btn-primary">Envoyer mes réponses</button></div>
      </form>
    </div>
  );
}
