import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { FormNouvelleRecherche } from "@/components/FormRecherche";
import { modifierRecherche, supprimerRecherche } from "../actions";
import { CONTRATS, MAX_RECHERCHES, contratLabel, type Candidat, type Recherche } from "@/lib/types";

export const metadata = { title: "Mes recherches · MagnusJob" };
export const maxDuration = 300;

export default async function MesRecherches() {
  const { user, supabase } = await exigerUtilisateur();
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  if (!c) redirect("/espace/profil");
  const { data, error } = await supabase.from("recherches").select("*").eq("candidat_id", user.id).order("created_at");
  const recherches = (data ?? []) as Recherche[];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/espace" className="text-sm text-muted">← Mes offres</Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Mes recherches</h1>
        <p className="text-muted">Tu peux chercher plusieurs métiers en même temps : MagnusJob cherche les offres pour chacun.</p>
      </div>

      {error && (
        <p className="rounded-xl bg-warn-soft p-4 text-sm">Les recherches multiples ne sont pas encore activées sur le site. Ton école doit faire une mise à jour.</p>
      )}

      <section className="card flex flex-col gap-2 p-5" style={{ borderColor: "var(--accent)" }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="eyebrow">Recherche principale</span>
            <h2 className="text-lg font-semibold">{c.poste_vise || "Métier non précisé"}</h2>
            <p className="text-sm text-muted">{c.contrats.map(contratLabel).join(", ")} · {c.mobilite_km} km autour de {c.ville || c.code_postal}</p>
          </div>
          <Link href="/espace/profil" className="btn btn-sm">Modifier dans mon profil</Link>
        </div>
      </section>

      {recherches.map((r) => (
        <form key={r.id} action={modifierRecherche} className={`card flex flex-col gap-3 p-5 ${r.active ? "" : "opacity-70"}`}>
          <input type="hidden" name="id" value={r.id} />
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor={`p-${r.id}`}>Métier</label>
              <input className="input" id={`p-${r.id}`} name="poste" defaultValue={r.poste} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor={`k-${r.id}`}>Distance (km)</label>
              <input className="input" id={`k-${r.id}`} name="mobilite_km" type="number" min={1} max={200} defaultValue={r.mobilite_km} />
            </div>
          </div>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Types de contrat</legend>
            {CONTRATS.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="checkbox" name={`contrat_${t.id}`} defaultChecked={r.contrats.includes(t.id)} className="accent-[var(--accent)]" />
                {t.label}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={r.active} className="accent-[var(--accent)]" />
              Recherche active
            </label>
            <div className="flex gap-2">
              <button formAction={supprimerRecherche} className="btn btn-sm btn-ghost text-bad">Supprimer</button>
              <button className="btn btn-sm btn-primary">Enregistrer</button>
            </div>
          </div>
        </form>
      ))}

      {recherches.length < MAX_RECHERCHES ? (
        <FormNouvelleRecherche contratsParDefaut={c.contrats} distanceParDefaut={c.mobilite_km} />
      ) : (
        <p className="text-sm text-muted">Tu as atteint le maximum de {MAX_RECHERCHES} recherches en plus de ta recherche principale.</p>
      )}

      <p className="hint">
        Astuce : MagnusJob te propose aussi des métiers voisins de ton expérience, dans « Mes offres ». Un clic suffit pour les ajouter ici.
      </p>
    </div>
  );
}
