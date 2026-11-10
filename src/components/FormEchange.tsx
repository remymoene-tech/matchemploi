"use client";

import { useActionState, useRef, useState } from "react";
import { EnvoiMessage, EnvoiSms, type Messagerie } from "@/components/EnvoiMessage";

const TYPES = [
  { id: "telephone", label: "Téléphone", icone: "📞" },
  { id: "email", label: "Email", icone: "✉️" },
  { id: "sms", label: "SMS", icone: "💬" },
  { id: "rdv", label: "Rendez-vous", icone: "🤝" },
  { id: "autre", label: "Autre", icone: "📝" },
];

/** Formulaire « Noter un échange » : type, date, ce qui s'est dit, prochaine action facultative. */
export function FormEchange({ candidatId, action, champ = "candidat_id", exemple, types = TYPES, exempleRelance, messages }: {
  candidatId: string;
  /** Modèles d'emails et de SMS (SMS ou Email choisi) : envoi de l'email par le site, SMS par l'iPhone. */
  messages?: Messagerie;
  /** Champ caché : « candidat_id » (fiche candidat) ou « entreprise_id » (fiche entreprise). */
  champ?: string;
  exemple?: string;
  types?: readonly { id: string; label: string; icone: string }[];
  exempleRelance?: string;
  action: (e: { erreur?: string; ok?: boolean }, f: FormData) => Promise<{ erreur?: string; ok?: boolean }>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [relance, setRelance] = useState(false);
  const [type, setType] = useState(types[0]?.id ?? "");
  const [texte, setTexte] = useState("");
  const [sujet, setSujet] = useState("");
  const [envoyerEmail, setEnvoyerEmail] = useState(false);
  const [etat, envoyer, enCours] = useActionState(async (e: { erreur?: string; ok?: boolean; envoye?: boolean }, f: FormData): Promise<{ erreur?: string; ok?: boolean; envoye?: boolean }> => {
    const r = await action(e, f);
    if (r.ok) { form.current?.reset(); setRelance(false); setTexte(""); setSujet(""); setType(types[0]?.id ?? ""); return { ...r, envoye: f.get("envoyer") === "1" }; }
    return r;
  }, {});
  const avecMessages = messages && (type === "sms" || type === "email");
  const emailParLeSite = avecMessages && type === "email" && envoyerEmail && !!messages.email;
  const maintenant = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  return (
    <form ref={form} action={envoyer} className="flex flex-col gap-3">
      <input type="hidden" name={champ} value={candidatId} />
      <input type="hidden" name="tz" value={new Date().getTimezoneOffset()} suppressHydrationWarning />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Type d&apos;échange</legend>
        {types.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
            <input type="radio" name="type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} className="sr-only" />
            <span aria-hidden>{t.icone}</span>{t.label}
          </label>
        ))}
      </fieldset>
      <div className={avecMessages ? "grid gap-3 lg:grid-cols-[16rem_1fr]" : ""}>
        <div className="flex flex-col gap-1 sm:w-64">
          <label className="label" htmlFor="date_echange">Date et heure</label>
          <input className="input" id="date_echange" name="date_echange" type="datetime-local" defaultValue={maintenant()} suppressHydrationWarning />
        </div>
        {avecMessages && (
          <EnvoiMessage key={type} messages={messages} canal={type as "sms" | "email"} onModele={(t, s) => { setTexte(t); setSujet(s); if (type === "email") setEnvoyerEmail(true); }} />
        )}
      </div>
      {avecMessages && type === "email" && (
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
          {messages.email ? (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="envoyer" value="1" checked={envoyerEmail} onChange={(e) => setEnvoyerEmail(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              ✉️ Envoyer cet email à {messages.email} depuis le site
            </label>
          ) : <p className="text-sm text-muted">Pas d&apos;adresse email sur la fiche : l&apos;email ne peut pas partir du site.</p>}
          {emailParLeSite && (
            <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Objet</span>
              <input className="input" name="sujet" required value={sujet} onChange={(e) => setSujet(e.target.value)} maxLength={200} />
            </label>
          )}
          {emailParLeSite && <p className="text-xs text-muted">Les réponses arriveront dans ta boîte mail.</p>}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="label" htmlFor="resume">{emailParLeSite ? "Message" : type === "sms" && avecMessages ? "Message du SMS (ou ce qui s'est dit)" : "Ce qui s'est dit"}</label>
        <textarea className={`input text-sm ${avecMessages ? "min-h-40" : "min-h-24"}`} id="resume" name="resume" required value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={exemple ?? "Ex. A envoyé 3 candidatures cette semaine, entretien chez Leclerc jeudi. Hésite encore entre vente et accueil."} />
        {avecMessages && /\{\w+\}/.test(texte) && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm">✏️ À compléter dans le texte : {[...new Set(texte.match(/\{\w+\}/g))].join(", ")}</p>}
        {avecMessages && type === "sms" && messages.telephone && texte && <EnvoiSms telephone={messages.telephone} texte={texte} />}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={relance} onChange={(e) => setRelance(e.target.checked)} className="accent-[var(--accent)]" />
        Prévoir une relance (tu recevras une notification 🔔 à l&apos;heure prévue)
      </label>
      {relance && (
        <div className="grid gap-3 sm:grid-cols-[1fr_15rem]">
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="action">Prochaine action</label>
            <input className="input" id="action" name="action" required placeholder={exempleRelance ?? "Ex. Le rappeler pour savoir comment s'est passé l'entretien"} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="action_a">Le (date et heure)</label>
            <input className="input" id="action_a" name="action_a" type="datetime-local" required />
          </div>
        </div>
      )}
      {etat.erreur && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>}
      {etat.ok && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{etat.envoye ? "✉️ Email envoyé et noté dans les échanges." : "Échange enregistré."}</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={enCours}>{enCours ? "Enregistrement…" : emailParLeSite ? "✉️ Envoyer et enregistrer" : "Enregistrer l'échange"}</button>
      </div>
    </form>
  );
}
