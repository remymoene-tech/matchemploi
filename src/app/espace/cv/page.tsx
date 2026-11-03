import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import type { Candidat } from "@/lib/types";
import { Copier } from "@/components/Copier";
import { BoutonAnalyser, FormCV } from "@/components/FormCV";
import { SchemaPourCategorie } from "@/components/SchemasCV";
import { BoutonSynthese } from "@/components/BoutonSynthese";
import { CvRendu } from "@/components/CvRendu";
import { genererMonCvAmeliore } from "../actions";

export const metadata = { title: "Mon CV · MagnusMatch" };
export const maxDuration = 300;

export default async function MonCV({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const { nouveau } = await searchParams;
  const { user, supabase } = await exigerUtilisateur();
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  const k = c?.cv_conseils;

  const blocCV = (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="eyebrow">Mon CV</span>
          <h2 className="text-lg font-semibold">{c?.cv_chemin ? "Ton CV est bien déposé ✓" : "Tu n'as pas encore déposé de CV"}</h2>
        </div>
        {c?.cv_chemin && (
          <a className="btn" href="/espace/cv/fichier" target="_blank" rel="noopener">Voir mon CV (PDF)</a>
        )}
      </div>
      {!!c?.competences?.length && (
        <div className="flex flex-wrap gap-1.5">{c.competences.map((x) => <span key={x} className="chip chip-tag">{x}</span>)}</div>
      )}
      <FormCV dejaDepose={!!c?.cv_chemin} />
    </section>
  );

  if (!k) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-3xl font-extrabold">Mon CV</h1>
        {nouveau && c?.cv_chemin && (
          <p className="rounded-xl bg-good-soft p-4 text-sm text-good">
            Ton profil est enregistré et la recherche d&apos;offres a démarré. <Link className="font-semibold underline" href="/espace">Voir mes offres</Link>
          </p>
        )}
        {blocCV}
        {c?.cv_chemin ? (
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">L&apos;avis sur ton CV n&apos;est pas encore prêt</h2>
            <p className="max-w-[60ch] text-sm text-muted">
              Lance l&apos;analyse : tu recevras une note, l&apos;avis sur la mise en page, une description de ton projet à mettre en haut du CV
              et des conseils concrets pour l&apos;améliorer.
            </p>
            <BoutonAnalyser />
          </section>
        ) : (
          <p className="text-sm text-muted">
            Dépose ton CV : tu recevras une note, l&apos;avis sur la mise en page, une description de ton projet et des conseils concrets pour l&apos;améliorer.
          </p>
        )}
      </div>
    );
  }

  const ton = k.note >= 8 ? "text-good" : k.note >= 5 ? "text-warn" : "text-bad";
  const importants = k.ameliorations.filter((a) => a.priorite === "important");
  const conseilles = k.ameliorations.filter((a) => a.priorite !== "important");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {nouveau && (
        <p className="rounded-xl bg-good-soft p-4 text-sm text-good">
          Ton profil est enregistré et la recherche d&apos;offres a démarré. En attendant, voici l&apos;avis sur ton CV.{" "}
          <Link className="font-semibold underline" href="/espace">Voir mes offres</Link>
        </p>
      )}

      <section className="card flex flex-wrap items-center gap-6 p-6">
        <div className="flex flex-col items-center">
          <b className={`font-mono text-5xl font-bold tabular-nums leading-none ${ton}`}>{k.note}<small className="text-xl text-muted">/10</small></b>
          <span className="eyebrow mt-2">Ton CV</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-2xl font-extrabold">L&apos;avis sur ton CV</h1>
          <p>{k.resume}</p>
          {c?.poste_vise && <p className="text-sm text-muted">Analysé pour le poste visé : {c.poste_vise}</p>}
        </div>
      </section>

      {blocCV}

      <section className="card flex flex-col gap-3 p-5" style={{ borderColor: "var(--accent)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Une vraie aide</span>
            <h2 className="text-lg font-semibold">Ton CV amélioré par MagnusMatch</h2>
            <p className="max-w-[60ch] text-sm text-muted">
              MagnusMatch réécrit ton CV en appliquant ses conseils : une description de ton projet en haut, tes expériences détaillées avec des verbes d&apos;action,
              tes compétences classées. Il n&apos;invente rien : ce qui manque est marqué « à compléter ».
            </p>
          </div>
          <BoutonSynthese candidatId={user.id} action={genererMonCvAmeliore} actif libelle={c?.cv_ameliore ? "Le refaire" : "Créer mon CV amélioré"} />
        </div>
        {c?.cv_ameliore && (
          <>
            {!!c.cv_ameliore.a_completer?.length && (
              <p className="rounded-lg bg-warn-soft p-3 text-sm"><b>À compléter :</b> {c.cv_ameliore.a_completer.join(" · ")}</p>
            )}
            <div className="max-h-[520px] overflow-auto rounded-lg border border-line"><CvRendu cv={c.cv_ameliore} compact /></div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn btn-primary" href={`/cv/${user.id}`}>Voir en grand et l&apos;enregistrer en PDF</Link>
            </div>
            <p className="hint">Relis-le, complète ce qui manque et adapte-le avec tes mots avant de l&apos;envoyer.</p>
          </>
        )}
      </section>

      {(k.mise_en_page || k.description_proposee) && (
        <section className="grid gap-3 md:grid-cols-2">
          {k.mise_en_page && (
            <article className="card flex flex-col gap-2 p-5">
              <span className="eyebrow">Mise en page</span>
              <span className={`chip w-fit ${k.mise_en_page.avis === "personnalisée" ? "chip-plus" : "chip-minus"}`}>
                {k.mise_en_page.avis === "personnalisée" ? "CV personnel ✓" : `CV ${k.mise_en_page.avis}`}
              </span>
              <p className="text-sm">{k.mise_en_page.explication}</p>
            </article>
          )}
          {k.description_proposee && (
            <article className="card flex flex-col gap-2 p-5">
              <span className="eyebrow">Ta description, à mettre en haut du CV</span>
              <p className="rounded-lg border border-line bg-bg p-3 text-sm">{k.description_proposee}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="hint">Relis-la et adapte-la avec tes mots.</span>
                <Copier texte={k.description_proposee} />
              </div>
            </article>
          )}
        </section>
      )}

      {!!k.points_forts.length && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Ce qui marche déjà</h2>
          <ul className="flex flex-col gap-1.5">
            {k.points_forts.map((p) => (
              <li key={p} className="flex gap-2 text-sm"><span className="text-good">✓</span>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {[["À corriger en priorité", importants], ["Pour aller plus loin", conseilles]].map(([titre, liste]) =>
        (liste as typeof k.ameliorations).length ? (
          <section key={titre as string} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{titre as string}</h2>
            {(liste as typeof k.ameliorations).map((a, i) => (
              <article key={i} className="card flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip chip-tag">{a.categorie}</span>
                  {a.priorite === "important" && <span className="chip chip-minus">Important</span>}
                </div>
                <p>{a.conseil}</p>
                {a.exemple && (
                  <p className="rounded-lg border border-line bg-bg p-3 text-sm whitespace-pre-line">
                    <span className="eyebrow mb-1 block">Exemple</span>
                    {a.exemple}
                  </p>
                )}
                {/* Schéma d'illustration, une seule fois par catégorie */}
                {k.ameliorations.findIndex((x) => x.categorie === a.categorie) === k.ameliorations.indexOf(a) && SchemaPourCategorie({ categorie: a.categorie }) && (
                  <details className="rounded-lg border border-line p-3" open={a.priorite === "important"}>
                    <summary className="cursor-pointer text-sm font-semibold text-accent">Voir l&apos;exemple en image</summary>
                    <div className="mt-3"><SchemaPourCategorie categorie={a.categorie} /></div>
                  </details>
                )}
              </article>
            ))}
          </section>
        ) : null,
      )}

      <p className="hint">Tu as amélioré ton CV ? Dépose la nouvelle version ci-dessus pour un nouvel avis. Conseils proposés automatiquement par MagnusMatch (intelligence artificielle) : garde ton esprit critique. En France, la photo sur un CV est facultative.</p>
    </div>
  );
}
