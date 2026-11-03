import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoutonFiche, BoutonImprimer } from "@/components/BoutonFiche";
import { accesFiche } from "../../acces";
import type { FichePreparation } from "@/lib/preparation";

export const metadata = { title: "Préparer mon entretien · MagnusMatch" };
export const maxDuration = 300;

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-5 break-inside-avoid">
      <h2 className="text-lg font-semibold">{titre}</h2>
      {children}
    </section>
  );
}

const Liste = ({ items }: { items: string[] }) => (
  <ul className="flex flex-col gap-1.5 text-sm">{items.map((x) => <li key={x} className="flex gap-2"><span className="text-accent">•</span><span>{x}</span></li>)}</ul>
);

export default async function FicheEntretien({ params }: { params: Promise<{ candidat: string; offre: string }> }) {
  const { candidat, offre } = await params;
  const acces = await accesFiche(candidat);
  if (!acces) notFound();

  const db = createAdminClient();
  const { data: m } = await db.from("correspondances").select("*").eq("candidat_id", candidat).eq("offre_id", offre).maybeSingle();
  if (!m) notFound();
  const f = (m.preparation ?? null) as FichePreparation | null;
  const retour = acces.retour;
  const { data: c } = await db.from("candidats").select("nom").eq("user_id", candidat).maybeSingle();

  if (!f) {
    // Le candidat ne voit pas encore une offre de l'équipe tant qu'il n'y a pas de fiche
    const { data: o } = acces.role === "equipe" ? await db.from("offres").select("intitule, entreprise").eq("id", offre).maybeSingle() : { data: null };
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link href={retour} className="text-sm text-muted">← Retour</Link>
        <h1 className="text-3xl font-extrabold">Préparer l&apos;entretien</h1>
        <div className="card flex flex-col items-start gap-3 p-6">
          {o && <p className="text-sm text-muted">{c?.nom} → {o.intitule} chez {o.entreprise}</p>}
          <p className="max-w-[60ch]">
            MagnusMatch fait des recherches sur l&apos;entreprise, puis prépare une fiche : ce qu&apos;il faut savoir, la présentation en 30 secondes,
            les questions probables avec des pistes de réponse, et les questions à poser.
          </p>
          <BoutonFiche candidat={candidat} offre={offre} libelle="Préparer la fiche d'entretien" />
          <p className="hint">Si la fiche vient d&apos;être demandée, elle peut déjà être en cours : actualise la page dans une minute.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={retour} className="text-sm text-muted">← Retour</Link>
        <div className="flex flex-wrap gap-2">
          <BoutonImprimer />
          <BoutonFiche candidat={candidat} offre={offre} forcer libelle="Mettre à jour la fiche" />
        </div>
      </div>

      <header className="flex flex-col gap-1">
        <span className="eyebrow">Préparer mon entretien{acces.role === "equipe" && c?.nom ? ` · ${c.nom}` : ""}</span>
        <h1 className="text-3xl font-extrabold">{f.meta.intitule}</h1>
        <p className="text-muted">{[f.meta.entreprise, f.meta.lieu, f.meta.contrat].filter(Boolean).join(" · ")}</p>
        {f.meta.lien && <a className="w-fit text-sm font-semibold text-accent print:hidden" href={f.meta.lien} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce</a>}
      </header>

      <Section titre="L'entreprise en bref">
        <p className="text-sm">{f.entreprise.resume}</p>
        {!!f.entreprise.a_savoir.length && <><span className="eyebrow">À savoir</span><Liste items={f.entreprise.a_savoir} /></>}
        {!!f.entreprise.a_verifier.length && <><span className="eyebrow">À vérifier avant l&apos;entretien</span><Liste items={f.entreprise.a_verifier} /></>}
        {!!f.sources?.length && (
          <div className="flex flex-col gap-1 border-t border-line pt-3">
            <span className="eyebrow">Sources consultées par MagnusMatch</span>
            <ul className="flex flex-col gap-1 text-sm">
              {f.sources.map((s) => (
                <li key={s.url} className="min-w-0 truncate"><a className="text-accent" href={s.url} target="_blank" rel="noopener noreferrer">{s.titre || s.url}</a></li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section titre="Le poste">
        <p className="text-sm">{f.poste.resume}</p>
        <Liste items={f.poste.missions} />
      </Section>

      <Section titre="Ta présentation en 30 secondes">
        <blockquote className="rounded-lg border-l-4 p-3 text-sm italic" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>{f.pitch}</blockquote>
        <p className="hint">Entraîne-toi à la dire à voix haute, avec tes mots.</p>
      </Section>

      <div className="grid gap-5 md:grid-cols-2">
        <Section titre="Tes atouts pour ce poste"><Liste items={f.mettre_en_avant} /></Section>
        <Section titre="Les points à préparer">
          <ul className="flex flex-col gap-3 text-sm">
            {f.points_a_preparer.map((p) => (
              <li key={p.point} className="flex flex-col gap-0.5"><b>{p.point}</b><span className="text-muted">{p.reponse}</span></li>
            ))}
          </ul>
        </Section>
      </div>

      <Section titre="Les questions qu'on va probablement te poser">
        <ol className="flex flex-col gap-3 text-sm">
          {f.questions_probables.map((q, i) => (
            <li key={q.question} className="flex flex-col gap-0.5">
              <b>{i + 1}. {q.question}</b>
              <span className="text-muted">Piste : {q.piste}</span>
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-5 md:grid-cols-2">
        <Section titre="Les questions à poser"><Liste items={f.questions_a_poser} /></Section>
        <Section titre="Côté pratique"><Liste items={f.pratique} /></Section>
      </div>

      <p className="hint">
        Fiche préparée par MagnusMatch (intelligence artificielle) à partir de l&apos;offre, de ton profil et de recherches sur internet.
        Vérifie les informations sur l&apos;entreprise avant l&apos;entretien. Bonne chance !
      </p>
    </div>
  );
}
