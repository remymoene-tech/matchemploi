import type { CvAmeliore } from "@/lib/ia";

function Titre({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 border-b pb-1 text-xs font-bold uppercase tracking-[.12em]" style={{ color: "#56664b", borderColor: "#dfe4d8" }}>{children}</h2>;
}

/** Le CV amélioré, mis en page sobrement (une colonne, une couleur), prêt à imprimer. */
export function CvRendu({ cv, compact }: { cv: CvAmeliore; compact?: boolean }) {
  const marque = (t: string) =>
    t.split(/(\[à compléter\])/g).map((m, i) =>
      m === "[à compléter]" ? <mark key={i} className="rounded bg-warn-soft px-1 text-warn print:bg-transparent print:text-inherit">à compléter</mark> : m,
    );
  return (
    <article className={`cv-papier mx-auto flex w-full max-w-[800px] flex-col gap-5 bg-white text-[#111111] ${compact ? "p-5 text-[13px]" : "p-10 text-[14px]"}`}
      style={{ fontFamily: "var(--font-figtree), Arial, sans-serif", lineHeight: 1.45 }}>
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold leading-tight" style={{ fontFamily: "var(--font-bricolage), Arial, sans-serif" }}>{cv.nom}</h1>
        <p className="text-[15px] font-semibold" style={{ color: "#56664b" }}>{marque(cv.titre)}</p>
        <p className="text-[12.5px] text-[#5e6358]">{marque(cv.coordonnees.join(" · "))}</p>
      </header>
      <p className="rounded-md p-3" style={{ background: "#f1f3ee" }}>{marque(cv.accroche)}</p>

      {!!cv.experiences.length && (
        <section>
          <Titre>Expériences</Titre>
          <div className="flex flex-col gap-3">
            {cv.experiences.map((e, i) => (
              <div key={i} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-bold">{marque(e.poste)} <span className="font-normal">– {marque(e.entreprise)}{e.lieu ? <>, {marque(e.lieu)}</> : null}</span></p>
                  <p className="text-[12.5px] text-[#5e6358]">{marque(e.dates)}</p>
                </div>
                <ul className="ml-4 mt-1 list-disc">{e.missions.map((m, j) => <li key={j}>{marque(m)}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!cv.formations.length && (
        <section>
          <Titre>Formation</Titre>
          <div className="flex flex-col gap-1.5">
            {cv.formations.map((f, i) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p><b>{marque(f.diplome)}</b> – {marque(f.etablissement)}</p>
                <p className="text-[12.5px] text-[#5e6358]">{marque(f.dates)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!cv.competences.length && (
        <section>
          <Titre>Compétences</Titre>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {cv.competences.map((c, i) => (
              <div key={i} className="contents"><dt className="font-semibold">{c.categorie}</dt><dd>{marque(c.elements.join(", "))}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {!!cv.centres_interet.length && (
        <section>
          <Titre>Centres d&apos;intérêt</Titre>
          <p>{cv.centres_interet.join(" · ")}</p>
        </section>
      )}
    </article>
  );
}
