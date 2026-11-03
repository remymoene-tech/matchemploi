"use client";

import { startTransition, useActionState, useState } from "react";
import { envoyerCV } from "@/lib/depot-cv-client";
import { enregistrerProfil, type EtatProfil } from "@/app/espace/actions";
import { CONTRATS, type Candidat } from "@/lib/types";

function Champ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function FormProfil({ c, codeEcole, nomEcole }: { c: Partial<Candidat>; codeEcole?: string; nomEcole?: string }) {
  const [etat, action, enCours] = useActionState<EtatProfil, FormData>(enregistrerProfil, {});
  const [alternance, setAlternance] = useState(c.contrats?.includes("alternance") ?? false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurLocale, setErreurLocale] = useState("");

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErreurLocale("");
        const fd = new FormData(e.currentTarget);
        const cv = fd.get("cv");
        fd.delete("cv");
        if (cv instanceof File && cv.size > 0) {
          // Le CV part directement vers le stockage privé (accepte les PDF lourds, jusqu'à 10 Mo)
          setEnvoi(true);
          const err = await envoyerCV(cv);
          setEnvoi(false);
          if (err) { setErreurLocale(err); return; }
          fd.set("cv_depose", "1");
        }
        startTransition(() => action(fd));
      }}
    >
      <section className="card flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">Toi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ id="nom" label="Nom et prénom"><input className="input" id="nom" name="nom" defaultValue={c.nom} required /></Champ>
          <Champ id="telephone" label="Téléphone" hint="Facultatif"><input className="input" id="telephone" name="telephone" defaultValue={c.telephone} /></Champ>
          <Champ id="code_postal" label="Code postal"><input className="input" id="code_postal" name="code_postal" inputMode="numeric" defaultValue={c.code_postal} placeholder="69007" /></Champ>
          <Champ id="ville" label="Ville"><input className="input" id="ville" name="ville" defaultValue={c.ville} placeholder="Lyon" /></Champ>
          <Champ id="mobilite_km" label="Distance maximale (km)"><input className="input" id="mobilite_km" name="mobilite_km" type="number" min={0} max={200} defaultValue={c.mobilite_km ?? 20} /></Champ>
          <Champ id="permis" label="Permis et véhicule">
            <select className="input" id="permis" name="permis" defaultValue={c.permis ?? ""}>
              <option value="">Non précisé</option>
              <option value="permis_vehicule">Permis et véhicule</option>
              <option value="permis">Permis, sans véhicule</option>
              <option value="non">Pas de permis</option>
            </select>
          </Champ>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">Ce que tu cherches</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ id="poste_vise" label="Poste visé"><input className="input" id="poste_vise" name="poste_vise" defaultValue={c.poste_vise} placeholder="Assistant commercial" required /></Champ>
          <Champ id="formation" label="Diplôme obtenu ou en préparation"><input className="input" id="formation" name="formation" defaultValue={c.formation} placeholder="BTS NDRC" /></Champ>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-1">Types de contrat</legend>
          <div className="flex flex-wrap gap-2">
            {CONTRATS.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input
                  type="checkbox"
                  name={`contrat_${t.id}`}
                  defaultChecked={c.contrats?.includes(t.id)}
                  onChange={t.id === "alternance" ? (e) => setAlternance(e.target.checked) : undefined}
                  className="accent-[var(--accent)]"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {alternance && (
            <Champ id="rythme" label="Rythme d'alternance"><input className="input" id="rythme" name="rythme" defaultValue={c.rythme} placeholder="2 j école / 3 j entreprise" /></Champ>
          )}
          <Champ id="disponibilite" label="Disponible à partir de"><input className="input" id="disponibilite" name="disponibilite" defaultValue={c.disponibilite} placeholder="septembre 2027" /></Champ>
        </div>
        <Champ id="projet" label="Ton projet" hint="Ce que tu veux faire, le type d'entreprise qui t'attire, ce que tu veux éviter.">
          <textarea className="input min-h-28" id="projet" name="projet" defaultValue={c.projet} />
        </Champ>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">Ton école</h2>
        <Champ id="code_ecole" label="Code de ton école (facultatif)" hint={nomEcole ? `Tu es rattaché à : ${nomEcole}` : "Donné par le responsable entreprises de ton école. Il te permet de recevoir les offres de ses entreprises partenaires."}>
          <input className="input max-w-xs uppercase" id="code_ecole" name="code_ecole" defaultValue={codeEcole} placeholder="EX. IFP-SALON-4821" />
        </Champ>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">Ton CV</h2>
        {c.cv_chemin && <p className="text-sm text-muted">Un CV est déjà enregistré. Dépose un nouveau fichier pour le remplacer.</p>}
        <input className="input file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:font-semibold file:text-accent" type="file" name="cv" accept="application/pdf" />
        <span className="hint">PDF, 10 Mo maximum. Il est lu automatiquement pour repérer tes compétences.</span>
        {!!c.competences?.length && (
          <div className="flex flex-wrap gap-1.5">{c.competences.map((x) => <span key={x} className="chip chip-tag">{x}</span>)}</div>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consentement" defaultChecked={c.consentement} className="mt-1 accent-[var(--accent)]" />
          <span>J&apos;accepte que mon profil et mon CV soient analysés pour me proposer des offres, et transmis à mon école et aux entreprises partenaires uniquement pour les offres qui me correspondent.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="alertes_email" defaultChecked={c.alertes_email ?? true} className="mt-1 accent-[var(--accent)]" />
          <span>Me prévenir par email quand une nouvelle offre me correspond.</span>
        </label>
      </section>

      {(erreurLocale || etat.erreur) && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{erreurLocale || etat.erreur}</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={enCours || envoi}>
          {envoi ? "Envoi du CV…" : enCours ? "Lecture du CV et enregistrement… (jusqu'à 1 minute)" : "Enregistrer et lancer la recherche"}
        </button>
      </div>
    </form>
  );
}
