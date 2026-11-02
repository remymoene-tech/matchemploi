import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import type { Candidat } from "@/lib/types";
import { Copier } from "@/components/Copier";

export const metadata = { title: "Mon CV · MatchEmploi" };

export default async function MonCV({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const { nouveau } = await searchParams;
  const { user, supabase } = await exigerUtilisateur();
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  const k = c?.cv_conseils;

  if (!k) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Mon CV</h1>
        <div className="card flex flex-col items-start gap-3 border-dashed p-6">
          <h2 className="text-lg font-semibold">Fais relire ton CV par l&apos;IA</h2>
          <p className="max-w-[60ch] text-sm text-muted">
            Dépose ton CV en PDF dans ton profil : tu recevras une note, tes points forts et des conseils concrets
            pour l&apos;améliorer (expériences, compétences, orthographe, présentation, photo).
          </p>
          <Link className="btn btn-primary" href="/espace/profil">Déposer mon CV</Link>
        </div>
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
              </article>
            ))}
          </section>
        ) : null,
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-muted">Tu as amélioré ton CV ? Dépose la nouvelle version : tu auras un nouvel avis et des offres mieux notées.</p>
        <Link className="btn btn-primary" href="/espace/profil">Déposer mon nouveau CV</Link>
      </div>
      <p className="hint">Conseils générés par une IA : garde ton esprit critique. En France, la photo sur un CV est facultative.</p>
    </div>
  );
}
