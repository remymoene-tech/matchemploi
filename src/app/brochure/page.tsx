import { Logo } from "@/components/Logo";
import { formationsDeLEcole, ecoleParCode } from "@/lib/ecoles";
import { demanderBrochure } from "./actions";

export const metadata = { title: "Recevoir la brochure · Campus Magnus", description: "Recevez la brochure de nos formations par email." };

type SP = { formation?: string; ecole?: string; origine?: string; erreur?: string; merci?: string; prenom?: string; envoye?: string; lien?: string };

/** Page publique : demande de brochure (lien à mettre sur le bouton « Brochure » du site de l'école). */
export default async function Brochure({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ecole = sp.ecole ? await ecoleParCode(sp.ecole).catch(() => null) : null;
  const formations = await formationsDeLEcole(ecole?.id);
  const annee = new Date().getFullYear();
  const lienSur = sp.lien && /^https:\/\//.test(sp.lien) ? sp.lien : null;

  if (sp.merci) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-10 text-center">
        <Logo taille="lg" />
        <h1 className="text-3xl font-extrabold">Merci {sp.prenom ?? ""} 🙌</h1>
        {sp.envoye ? (
          <p className="text-lg">📬 Votre brochure vient de partir : <b>vérifiez votre boîte mail</b> (et les courriers indésirables).</p>
        ) : lienSur ? (
          <>
            <p className="text-lg">Votre demande est bien enregistrée. Voici votre brochure :</p>
            <a href={lienSur} target="_blank" rel="noopener" className="btn btn-primary">📄 Télécharger la brochure</a>
          </>
        ) : (
          <p className="text-lg">Votre demande est bien enregistrée : notre équipe vous envoie la brochure très vite.</p>
        )}
        <p className="text-muted">Un conseiller du Campus Magnus vous recontacte pour répondre à vos questions.</p>
      </div>
    );
  }

  const erreurs: Record<string, string> = {
    champs: "Merci de remplir votre prénom, votre nom, un email valide, le diplôme visé et l'année de rentrée.",
    rgpd: "Merci de cocher la case d'accord pour que nous puissions vous envoyer la brochure.",
    base: "Le service est momentanément indisponible. Merci de réessayer dans quelques minutes.",
  };
  const champ = (nom: string, label: string, type = "text", requis = true, auto = "") => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}{requis && <span className="text-bad"> *</span>}</span>
      <input className="input" name={nom} type={type} required={requis} autoComplete={auto || undefined} />
    </label>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo taille="lg" />
        <div>
          <span className="eyebrow">Campus Magnus · Arles</span>
          <h1 className="text-3xl font-extrabold">Recevez la brochure de nos formations</h1>
          <p className="text-muted">Remplissez ce court formulaire : la brochure arrive directement dans votre boîte mail.</p>
        </div>
      </div>
      {sp.erreur && erreurs[sp.erreur] && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad" role="alert">{erreurs[sp.erreur]}</p>}
      <form action={demanderBrochure} className="card flex flex-col gap-5 p-6">
        <input type="hidden" name="ecole" value={sp.ecole ?? ""} />
        <input type="hidden" name="origine" value={sp.origine ?? ""} />
        {/* Champ piège pour les robots (invisible) */}
        <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden />
        <div className="grid gap-4 sm:grid-cols-2">
          {champ("prenom", "Prénom", "text", true, "given-name")}
          {champ("nom", "Nom", "text", true, "family-name")}
          {champ("email", "Email", "email", true, "email")}
          {champ("telephone", "Téléphone", "tel", false, "tel")}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">🎓 Diplôme visé <span className="text-bad">*</span></legend>
          {formations.length ? (
            <div className="flex flex-wrap gap-2">
              {formations.map((x) => (
                <label key={x.nom} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                  <input type="radio" name="formation" value={x.nom} defaultChecked={sp.formation === x.nom} required className="sr-only" />
                  {x.nom} · {x.duree} an{x.duree > 1 ? "s" : ""}
                </label>
              ))}
            </div>
          ) : <input className="input" name="formation" required defaultValue={sp.formation ?? ""} />}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">📅 Année de rentrée <span className="text-bad">*</span></legend>
          <div className="flex flex-wrap gap-2">
            {[annee, annee + 1, annee + 2].map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                <input type="radio" name="annee_rentree" value={a} required className="sr-only" />
                Septembre {a}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consentement" required className="mt-1 accent-[var(--accent)]" />
          <span>J&apos;accepte que le Campus Magnus utilise ces informations pour m&apos;envoyer la brochure et me recontacter au sujet de ses formations. Je peux demander leur suppression à tout moment.</span>
        </label>
        <button className="btn btn-primary w-full sm:w-fit sm:self-end">📬 Recevoir la brochure</button>
      </form>
    </div>
  );
}
