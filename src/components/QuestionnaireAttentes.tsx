import { QUESTIONS_ATTENTES, type Attentes, type CleAttente } from "@/lib/attentes";

/** Questionnaire des attentes de l'entreprise (formulaire d'offre de l'équipe). */
export function QuestionnaireAttentes({ a, ouvert, titre = "Les attentes de l'entreprise", sousTitre = "(facultatif, 2 minutes : MagnusMatch rapproche mieux l'offre de vos étudiants)" }: { a?: Attentes | null; ouvert?: boolean; titre?: string; sousTitre?: string }) {
  const bloc = (cle: CleAttente, extra?: React.ReactNode) => {
    const q = QUESTIONS_ATTENTES[cle];
    const coches = a?.[cle] ?? [];
    return (
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-semibold">{q.label}</legend>
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type={q.type === "choix" ? "radio" : "checkbox"} name={`att_${cle}`} value={o} defaultChecked={coches.includes(o)} className="accent-[var(--accent)]" />
              {o}
            </label>
          ))}
        </div>
        {extra}
      </fieldset>
    );
  };
  const petit = (nom: string, placeholder: string, valeur?: string) => (
    <input className="input mt-1 max-w-sm text-sm" name={`att_${nom}`} defaultValue={valeur ?? ""} placeholder={placeholder} />
  );
  return (
    <details className="rounded-xl border border-line bg-bg p-4" open={ouvert || !!a}>
      <summary className="cursor-pointer">
        <span className="font-semibold">{titre}</span>{" "}
        <span className="text-sm text-muted">{sousTitre}</span>
      </summary>
      <div className="mt-4 flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h3 className="eyebrow">1 · Le profil</h3>
          {bloc("diplomes")}
          {bloc("experience")}
          {bloc("permis")}
          {bloc("langues", petit("langue_autre", "Autre langue…", a?.langue_autre))}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="eyebrow">2 · Le rythme</h3>
          {bloc("rythmes", petit("rythme_autre", "Autre rythme…", a?.rythme_autre))}
          {bloc("demarrage", petit("date_debut", "Date précise, ex. 1er septembre", a?.date_debut))}
          {bloc("horaires")}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="eyebrow">3 · Le poste</h3>
          {bloc("taille")}
          {bloc("contact_client")}
          {bloc("missions")}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="eyebrow">4 · L&apos;ambiance et la personnalité</h3>
          {bloc("rythme_travail")}
          {bloc("reussite")}
          {bloc("personnalite", <p className="hint">Ces réponses sont rapprochées du test DISC des étudiants.</p>)}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="eyebrow">5 · Les qualités</h3>
          {bloc("qualites", <p className="hint">3 maximum : au-delà, seules les 3 premières sont gardées.</p>)}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="eyebrow">6 · Le tuteur</h3>
          {bloc("encadrement", <p className="hint">Rapproché du test de management des étudiants.</p>)}
        </section>
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow">7 · En quelques mots</h3>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Ce qui ferait dire non tout de suite</span>
            <input className="input" name="att_redhibitoire" defaultValue={a?.redhibitoire ?? ""} placeholder="ex. retards répétés, refus de travailler le samedi…" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Ce que l&apos;entreprise apporte</span>
            <input className="input" name="att_apporte" defaultValue={a?.apporte ?? ""} placeholder="ex. primes, formation interne, embauche possible en CDI…" />
          </label>
        </section>
        <p className="text-xs text-muted">Ces réponses restent internes à l&apos;école : elles servent à vous présenter les étudiants qui vous correspondent.</p>
      </div>
    </details>
  );
}
