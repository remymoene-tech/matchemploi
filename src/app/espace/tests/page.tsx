import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import { derniersTests } from "@/lib/tests-serveur";
import { peutPasserTest, syntheseEtudiant } from "@/lib/synthese";
import { TESTS } from "@/lib/tests";
import { ResultatDisc, ResultatManagement } from "@/components/ResultatsTests";

export const metadata = { title: "Mes tests · MagnusMatch" };

export default async function MesTests({ searchParams }: { searchParams: Promise<{ resultat?: string }> }) {
  const { resultat } = await searchParams;
  const { user } = await exigerUtilisateur();
  const t = await derniersTests(user.id);
  const droits = { disc: await peutPasserTest(user.id, "disc"), management: await peutPasserTest(user.id, "management") };
  const bilan = await syntheseEtudiant(user.id);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/espace" className="text-sm text-muted">← Mes offres</Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Mes tests et mon bilan</h1>
        <p className="text-muted">Mieux te connaître pour mieux te présenter en entretien. Ta couleur DISC aide aussi MagnusMatch à affiner tes offres.</p>
      </div>
      {resultat && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Merci ! Voici ton résultat. Il est aussi visible par ton conseiller.</p>}
      {bilan && (
        <section className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--accent-soft)" }}>
          <div>
            <span className="eyebrow">Mon bilan MagnusMatch</span>
            <h2 className="text-xl font-extrabold">Ce qui ressort de ton profil</h2>
          </div>
          <p>{bilan.message}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {([["Tes atouts", bilan.points_forts], ["Pour progresser", bilan.axes_progres], ["Des postes qui te correspondent", bilan.postes_adaptes], ["Nos conseils", bilan.conseils]] as const).map(([titre, items]) => (
              <div key={titre} className="card flex flex-col gap-2 p-4">
                <h3 className="font-semibold">{titre}</h3>
                <ul className="flex flex-col gap-1 text-sm">{items.map((x) => <li key={x}>• {x}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {TESTS.map((x) => {
        const r = x.id === "disc" ? t.disc : t.management;
        return (
          <section key={x.id} className="card flex flex-col gap-4 p-5" id={x.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{x.nom}</h2>
                <p className="text-sm text-muted">{x.description} · {x.duree}</p>
              </div>
              {droits[x.id].peut ? (
                <Link href={`/espace/tests/${x.id}`} className={`btn ${r ? "btn-sm" : "btn-primary"}`}>{r ? "Repasser le test" : "Commencer le test"}</Link>
              ) : (
                <span className="text-xs text-muted">Test passé · pour le repasser, demande à ton conseiller</span>
              )}
            </div>
            {x.id === "disc" ? <ResultatDisc r={r} /> : <ResultatManagement r={r} />}
          </section>
        );
      })}
      <p className="hint">Ces tests t&apos;aident à te connaître : il n&apos;y a pas de bonne ou de mauvaise couleur. Ils ne sont jamais transmis à une entreprise sans ton accord.</p>
    </div>
  );
}
