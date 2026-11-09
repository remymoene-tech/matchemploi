import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAcces } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITUATIONS_INTERVENANT, SPECIALITES, specialitesDe } from "@/lib/intervenants";
import { nomLead, type Lead } from "@/lib/leads";
import { enregistrerFicheIntervenant } from "../../../actions";

export const metadata = { title: "Fiche intervenant · MagnusMatch" };

/** Fiche intervenant remplie par l'équipe (juste après une requalification, ou pour la compléter). */
export default async function FicheIntervenant({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ requalifie?: string; erreur?: string }> }) {
  await exigerAcces("intervenants", "leads", "candidats");
  const { id } = await params;
  const sp = await searchParams;
  const { data } = await createAdminClient().from("leads").select("*").eq("id", id).eq("categorie", "intervenant").maybeSingle();
  if (!data) notFound();
  const l = data as Lead;
  // La présentation est rangée avec le LinkedIn et les disponibilités : on les sépare pour les champs
  const blocs = (l.message ?? "").split(/\n\n/);
  const linkedin = blocs.find((b) => b.startsWith("LinkedIn : "))?.slice(11) ?? "";
  const dispos = blocs.find((b) => b.startsWith("Disponibilités : "))?.slice(17) ?? "";
  const presentation = blocs.filter((b) => !b.startsWith("LinkedIn : ") && !b.startsWith("Disponibilités : ")).join("\n\n");
  const specs = specialitesDe(l.formation);
  const autre = specs.filter((x) => !(SPECIALITES as readonly string[]).includes(x)).join(" · ");
  const champ = (nom: string, label: string, valeur: string, type = "text", requis = false) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}{requis && <span className="text-bad"> *</span>}</span>
      <input className="input" name={nom} type={type} defaultValue={valeur} required={requis} />
    </label>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href="/admin?vue=intervenants" className="text-sm text-muted hover:text-ink">← Intervenants</Link>
      <div>
        <span className="eyebrow">🧑‍🏫 Fiche intervenant</span>
        <h1 className="text-3xl font-extrabold">{nomLead(l)}</h1>
        <p className="text-muted">{l.email}</p>
      </div>
      {sp.requalifie && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">🔁 Requalifié en intervenant ✓ Remplis sa fiche : elle arrive dans le carnet d&apos;adresses de la pédagogie.</p>}
      {sp.erreur && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Enregistrement impossible : exécute la mise à jour SQL de la page /diagnostic.</p>}

      <form action={enregistrerFicheIntervenant} className="card flex flex-col gap-5 p-6">
        <input type="hidden" name="id" value={l.id} />
        <div className="grid gap-4 sm:grid-cols-3">
          {champ("prenom", "Prénom", l.prenom)}
          {champ("nom", "Nom", l.nom)}
          {champ("telephone", "Téléphone", l.telephone, "tel")}
        </div>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-semibold">🎯 Spécialité(s)</legend>
          <div className="flex flex-wrap gap-2">
            {SPECIALITES.map((x) => (
              <label key={x} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                <input type="checkbox" name="specialites" value={x} defaultChecked={specs.includes(x)} className="sr-only" />{x}
              </label>
            ))}
          </div>
          <input className="input" name="autre_specialite" maxLength={80} defaultValue={autre} placeholder="Autre spécialité (facultatif)" />
        </fieldset>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-semibold">💼 Situation</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SITUATIONS_INTERVENANT).map(([sid, lab]) => (
              <label key={sid} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                <input type="radio" name="situation" value={sid} defaultChecked={l.situation === sid} className="sr-only" />{lab}
              </label>
            ))}
          </div>
          <label className="mt-1 flex flex-col gap-1"><span className="font-semibold">Entreprise</span><input className="input" name="entreprise" maxLength={150} defaultValue={l.entreprise ?? ""} /></label>
        </fieldset>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-dashed border-line p-4 text-sm has-[:checked]:border-solid has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)]">
          <input type="checkbox" name="recrute" defaultChecked={!!l.recrute} className="mt-1 h-4 w-4" />
          <span><b>🧑‍💼 Il recrute aussi</b><span className="block text-muted">Alternant ou stagiaire dans son entreprise.</span></span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Présentation</span>
          <textarea className="input min-h-32" name="presentation" maxLength={4000} defaultValue={presentation} placeholder="Son parcours, son expérience, ce qu'il pourrait transmettre, les formats possibles (cours, atelier, conférence…)." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {champ("linkedin", "LinkedIn", linkedin, "url")}
          {champ("disponibilites", "Disponibilités", dispos)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">{l.cv_chemin ? "📄 Son CV est déjà enregistré." : "Pas de CV : il pourra en déposer un avec le questionnaire /intervenant."}</p>
          <button className="btn btn-primary">💾 Enregistrer la fiche</button>
        </div>
      </form>
    </div>
  );
}
