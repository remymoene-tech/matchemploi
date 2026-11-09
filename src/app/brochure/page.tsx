import Link from "next/link";
import { Logo } from "@/components/Logo";
import { formationsDeLEcole, ecoleParCode } from "@/lib/ecoles";
import { INTITULES } from "@/lib/formations";
import { evenementParCode } from "@/lib/evenements";
import { demanderBrochure } from "./actions";

export const metadata = { title: "Recevoir la brochure · Campus Magnus", description: "Recevez la brochure de nos formations par email." };

type SP = { alumni?: string; evenement?: string; formation?: string; ecole?: string; origine?: string; erreur?: string; merci?: string; prenom?: string; envoye?: string; lien?: string };

/** Page publique : demande de brochure (lien à mettre sur le bouton « Brochure » du site de l'école). */
export default async function Brochure({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ecole = sp.ecole ? await ecoleParCode(sp.ecole).catch(() => null) : null;
  const evenement = sp.evenement ? await evenementParCode(sp.evenement).catch(() => null) : null;
  const formations = await formationsDeLEcole(ecole?.id);
  // Rentrées proposées : la prochaine rentrée de septembre puis les 5 suivantes (la liste avance d'un an chaque septembre)
  const [an, mois] = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }).split("-").map(Number);
  const premiere = mois >= 9 ? an + 1 : an;
  const rentrees = Array.from({ length: 6 }, (_, i) => premiere + i);
  const lienSur = sp.lien && /^https:\/\//.test(sp.lien) ? sp.lien : null;

  if (sp.merci) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-10 text-center">
        <Logo taille="lg" />
        <h1 className="text-3xl font-extrabold">Merci {sp.prenom ?? ""} 🙌</h1>
        {sp.alumni ? (
          <p className="text-lg">🎓 C&apos;est noté ! L&apos;équipe du Campus Magnus revient vers vous très vite. Merci de garder le lien avec nous.</p>
        ) : sp.envoye ? (
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
    alumni: "Alumni : merci d'indiquer votre prénom, votre nom, un email valide et le diplôme obtenu au Campus.",
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
          <span className="eyebrow">{evenement ? `${evenement.nom} · Campus Magnus` : "Campus Magnus · Arles"}</span>
          <h1 className="text-3xl font-extrabold">{evenement ? "Bienvenue ! Recevez la brochure de nos formations" : "Recevez la brochure de nos formations"}</h1>
          <p className="text-muted">Remplissez ce court formulaire : la brochure arrive directement dans votre boîte mail.</p>
        </div>
      </div>
      <Link href="/intervenant" className="mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-ink">
        🧑‍🏫 <span>Vous êtes <b>intervenant(e)</b> ? Proposez-nous votre profil →</span>
      </Link>
      {sp.erreur && erreurs[sp.erreur] && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad" role="alert">{erreurs[sp.erreur]}</p>}
      <form action={demanderBrochure} className="card flex flex-col gap-5 p-6 [&:has(input[value=alumni-ancien]:checked)_.si-alumni]:flex [&:has(input[value=alumni-ancien]:checked)_.si-prospect]:hidden">
        <input type="hidden" name="ecole" value={sp.ecole ?? ""} />
        <input type="hidden" name="origine" value={sp.origine ?? ""} />
        <input type="hidden" name="evenement" value={evenement?.code ?? ""} />
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
                <label key={x.nom} className="flex min-w-[200px] flex-1 cursor-pointer flex-col gap-0.5 rounded-xl border border-line px-4 py-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)]">
                  <input type="radio" name="formation" value={x.nom} defaultChecked={sp.formation === x.nom} required className="sr-only" />
                  <b>{x.nom} · {x.duree} an{x.duree > 1 ? "s" : ""}</b>
                  {INTITULES[x.nom] && <span className="text-xs text-muted">{INTITULES[x.nom]}</span>}
                </label>
              ))}
              <label className="flex min-w-[200px] flex-1 cursor-pointer flex-col gap-0.5 rounded-xl border border-dashed border-line px-4 py-3 text-sm has-[:checked]:border-solid has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)]">
                <input type="radio" name="formation" value="alumni-ancien" defaultChecked={sp.formation === "alumni-ancien"} required className="sr-only" />
                <b>🎓 Je suis alumni</b>
                <span className="text-xs text-muted">Ancien(ne) élève du Campus : être recontacté(e)</span>
              </label>
            </div>
          ) : <input className="input" name="formation" required defaultValue={sp.formation ?? ""} />}
        </fieldset>
        <div className="si-alumni hidden flex-col gap-3 rounded-xl bg-accent-soft p-4">
          <p className="text-sm font-semibold">🎓 Bienvenue ! Votre diplôme au Campus</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Diplôme obtenu <span className="text-bad">*</span></span>
              <select className="input" name="diplome_alumni" defaultValue="">
                <option value="">Choisir…</option>
                {formations.map((x) => <option key={x.nom} value={x.nom}>{x.nom}</option>)}
                <option value="Autre">Autre formation</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Année du diplôme</span><input className="input" type="number" name="promo_alumni" min={1990} max={premiere} placeholder={String(premiere - 1)} /></label>
          </div>
        </div>
        <fieldset className="si-prospect flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">📅 Année de rentrée <span className="text-bad">*</span></legend>
          <div className="flex flex-wrap gap-2">
            {rentrees.map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                <input type="radio" name="annee_rentree" value={a} className="sr-only" />
                Septembre {a}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consentement" required className="mt-1 accent-[var(--accent)]" />
          <span>J&apos;accepte que le Campus Magnus utilise ces informations pour m&apos;envoyer la brochure et me recontacter au sujet de ses formations. Je peux demander leur suppression à tout moment.</span>
        </label>
        <button className="btn btn-primary w-full sm:w-fit sm:self-end"><span className="si-prospect">📬 Recevoir la brochure</span><span className="si-alumni hidden">🎓 Être recontacté(e)</span></button>
      </form>
    </div>
  );
}
