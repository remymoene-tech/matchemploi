"use client";

import { useActionState, useState } from "react";
import { creerProspection, majProspection, type EtatProspection } from "@/app/espace/prospections/actions";

const TYPES = [
  { id: "visite", label: "Visite sur place", icone: "🚶" },
  { id: "telephone", label: "Téléphone", icone: "📞" },
  { id: "email", label: "Email", icone: "✉️" },
  { id: "autre", label: "Autre", icone: "📝" },
];

type Valeurs = { entretien_a?: string | null; id?: string; entreprise?: string; ville?: string; contact_nom?: string; contact_tel?: string; contact_email?: string; recrute?: string; justification?: string };

const maintenant = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** Ajout (ou modification) d'une entreprise prospectée par l'étudiant. */
export function FormProspection({ v }: { v?: Valeurs }) {
  const edition = !!v?.id;
  const [etat, action, enCours] = useActionState<EtatProspection, FormData>(edition ? majProspection : creerProspection, {});
  const [relance, setRelance] = useState(false);
  const [entretien, setEntretien] = useState(!!v?.entretien_a);
  // Date de l'entretien au format du champ (heure locale du navigateur)
  const entretienLocal = (() => {
    if (!v?.entretien_a) return "";
    const d = new Date(v.entretien_a);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })();
  const champ = (nom: keyof Valeurs, label: string, ph: string, type = "text", requis = false) => (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-semibold">{label}{requis && <span className="text-bad"> *</span>}</span>
      <input className="input" name={nom} type={type} defaultValue={v?.[nom] ?? ""} placeholder={ph} required={requis} />
    </label>
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      {edition && <input type="hidden" name="id" value={v!.id} />}
      <input type="hidden" name="tz" value={new Date().getTimezoneOffset()} suppressHydrationWarning />

      {!edition && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">📅 Le contact</legend>
          <div className="flex flex-wrap gap-2">
            {TYPES.slice(0, 3).map((t, i) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="type" value={t.id} defaultChecked={i === 0} className="sr-only" />
                <span aria-hidden>{t.icone}</span>{t.label}
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm sm:w-64">
            <span className="font-semibold">Date et heure</span>
            <input className="input" name="date_echange" type="datetime-local" defaultValue={maintenant()} suppressHydrationWarning />
          </label>
        </fieldset>
      )}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">🏢 L&apos;entreprise</legend>
        {champ("entreprise", "Nom de l'entreprise", "Boulangerie Martin", "text", true)}
        {champ("ville", "Ville", "Salon-de-Provence")}
        {champ("contact_nom", "Nom du responsable", "M. Martin, gérant")}
        {champ("contact_tel", "Téléphone", "06 00 00 00 00", "tel")}
        {champ("contact_email", "Email", "contact@entreprise.fr", "email")}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">🤔 Elle recrute ? <span className="text-bad">*</span></legend>
        <div className="flex flex-wrap gap-2">
          {[["oui", "✅ Oui, elle recrute"], ["non", "❌ Non, pas pour l'instant"]].map(([id, label]) => (
            <label key={id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="radio" name="recrute" value={id} defaultChecked={v?.recrute === id} required className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Pourquoi ? <span className="text-bad">*</span></span>
          <textarea className="input min-h-20" name="justification" required minLength={5} defaultValue={v?.justification ?? ""}
            placeholder="Ex. Le gérant cherche un apprenti vendeur pour septembre, il veut mon CV par mail. / Ils ont déjà leur alternant jusqu'en 2027." />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="entretien" checked={entretien} onChange={(e) => setEntretien(e.target.checked)} className="accent-[var(--accent)]" />
          🤝 J&apos;ai un entretien avec cette entreprise
        </label>
        {entretien && (
          <label className="flex flex-col gap-1 text-sm sm:w-72">
            <span>Date et heure de l&apos;entretien <span className="text-bad">*</span></span>
            <input className="input" name="entretien_a" type="datetime-local" required defaultValue={entretienLocal} suppressHydrationWarning />
            <span className="hint">🔔 Tu recevras une notification la veille.</span>
          </label>
        )}
      </fieldset>

      {!edition && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Ce qui s&apos;est dit (facultatif)</span>
            <textarea className="input min-h-16" name="resume" placeholder="Ex. J'ai laissé mon CV à l'accueil, la responsable sera là mardi." />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={relance} onChange={(e) => setRelance(e.target.checked)} className="accent-[var(--accent)]" />
            ⏰ Prévoir une relance (tu recevras une notification 🔔)
          </label>
          {relance && (
            <div className="grid gap-3 sm:grid-cols-[1fr_15rem]">
              <input className="input" name="action" required placeholder="Ex. Rappeler la responsable pour savoir si elle a lu mon CV" />
              <input className="input" name="action_a" type="datetime-local" required />
            </div>
          )}
        </>
      )}

      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{etat.erreur}</p>}
      {etat.ok && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">Enregistré ✓</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={enCours}>{enCours ? "Enregistrement…" : edition ? "Enregistrer" : "➕ Ajouter l'entreprise"}</button>
      </div>
    </form>
  );
}
