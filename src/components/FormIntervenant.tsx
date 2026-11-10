"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { deposerIntervenant, preparerDepotIntervenant } from "@/app/intervenant/actions";
import { SITUATIONS_INTERVENANT, SPECIALITES } from "@/lib/intervenants";

const TAILLE_MAX = 10 * 1024 * 1024;

export function FormIntervenant() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [fini, setFini] = useState(false);
  const [besoin, setBesoin] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();

  if (fini) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-4xl" aria-hidden>🙌</p>
        <h2 className="text-2xl font-extrabold">Merci !</h2>
        <p>Votre profil est bien arrivé. L&apos;équipe pédagogique du Campus Magnus l&apos;étudie et revient vers vous.</p>
        {besoin && (
          <div className="mt-2 flex flex-col items-center gap-2 rounded-xl bg-accent-soft p-4">
            <p className="font-semibold">🧑‍💼 Vous recrutez : décrivez votre besoin en 2 minutes</p>
            <p className="text-sm text-muted">Poste, missions, rythme… L&apos;équipe vous présente les étudiants qui correspondent.</p>
            <a href={besoin} className="btn btn-primary">📋 Remplir la fiche besoin</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      className="card flex flex-col gap-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setErreur(null);
        demarrer(async () => {
          const fichier = f.get("cv") as File | null;
          f.delete("cv");
          if (fichier && fichier.size) {
            if (fichier.type !== "application/pdf" && !/\.pdf$/i.test(fichier.name)) return setErreur("Le CV doit être un fichier PDF.");
            if (fichier.size > TAILLE_MAX) return setErreur("Votre CV dépasse 10 Mo : exportez-le à nouveau en PDF « qualité standard ».");
            const p = await preparerDepotIntervenant();
            if ("erreur" in p) return setErreur(p.erreur);
            const { error } = await createClient().storage.from("cv").uploadToSignedUrl(p.chemin, p.jeton, fichier, { contentType: "application/pdf" });
            if (error) return setErreur("L'envoi du CV a échoué. Vérifiez votre connexion et réessayez.");
            f.set("cv_chemin", p.chemin);
          }
          const r = await deposerIntervenant(f);
          if (r.erreur) setErreur(r.erreur);
          else { setBesoin(r.besoin ?? null); setFini(true); }
        });
      }}
    >
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden />
      {erreur && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad" role="alert">{erreur}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {[["prenom", "Prénom", "text", true, "given-name"], ["nom", "Nom", "text", true, "family-name"], ["email", "Email", "email", true, "email"], ["telephone", "Téléphone", "tel", false, "tel"]].map(([n, l, t, r, a]) => (
          <label key={n as string} className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">{l as string}{r && <span className="text-bad"> *</span>}</span>
            <input className="input" name={n as string} type={t as string} required={!!r} autoComplete={a as string} />
          </label>
        ))}
      </div>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-semibold">🎯 Votre ou vos spécialités <span className="text-bad">*</span></legend>
        <div className="flex flex-wrap gap-2">
          {SPECIALITES.map((x) => (
            <label key={x} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
              <input type="checkbox" name="specialites" value={x} className="sr-only" />{x}
            </label>
          ))}
        </div>
        <input className="input" name="autre_specialite" maxLength={80} placeholder="Autre spécialité (facultatif)" />
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Présentez-vous <span className="text-bad">*</span></span>
        <textarea className="input min-h-36" name="presentation" required minLength={20} maxLength={4000} placeholder="Votre parcours, votre expérience, ce que vous aimeriez transmettre aux étudiants, les formats possibles (cours, atelier, conférence…)." />
      </label>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-semibold">💼 Votre situation</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SITUATIONS_INTERVENANT).map(([id, lab]) => (
            <label key={id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
              <input type="radio" name="situation" value={id} className="sr-only" />{lab}
            </label>
          ))}
        </div>
        <label className="mt-1 flex flex-col gap-1"><span className="font-semibold">Entreprise</span><input className="input" name="entreprise" maxLength={150} placeholder="Nom de votre entreprise ou de votre activité" /></label>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-dashed border-line p-4 text-sm has-[:checked]:border-solid has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)]">
        <input type="checkbox" name="recrute" className="mt-1 h-4 w-4" />
        <span><b>🧑‍💼 Je recrute aussi !</b><span className="block text-muted">Vous cherchez un alternant ou un stagiaire ? Cochez : vous pourrez décrire votre besoin juste après.</span></span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">LinkedIn</span><input className="input" name="linkedin" type="url" placeholder="https://www.linkedin.com/in/…" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Disponibilités</span><input className="input" name="disponibilites" maxLength={300} placeholder="Ex. le jeudi, à partir de janvier" /></label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">📄 Votre CV <span className="font-normal text-muted">(PDF, 10 Mo maximum)</span></span>
        <input className="input" name="cv" type="file" accept="application/pdf,.pdf" />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consentement" required className="mt-1 accent-[var(--accent)]" />
        <span>J&apos;accepte que le Campus Magnus conserve ces informations et mon CV pour me proposer des interventions. Je peux demander leur suppression à tout moment. <a href="/confidentialite" target="_blank" className="underline">Politique de confidentialité</a>.</span>
      </label>
      <button className="btn btn-primary w-full sm:w-fit sm:self-end" disabled={envoi}>{envoi ? "Envoi en cours…" : "📨 Envoyer mon profil"}</button>
    </form>
  );
}
