import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import { derniersTests } from "@/lib/tests-serveur";
import { TESTS } from "@/lib/tests";
import { ResultatDisc, ResultatManagement } from "@/components/ResultatsTests";

export const metadata = { title: "Mes tests · Jobaprox" };

export default async function MesTests({ searchParams }: { searchParams: Promise<{ resultat?: string }> }) {
  const { resultat } = await searchParams;
  const { user } = await exigerUtilisateur();
  const t = await derniersTests(user.id);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/espace" className="text-sm text-muted">← Mes offres</Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Mes tests</h1>
        <p className="text-muted">Mieux te connaître pour mieux te présenter en entretien. Ta couleur DISC aide aussi Jobaprox à affiner tes offres.</p>
      </div>
      {resultat && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Merci ! Voici ton résultat. Il est aussi visible par ton conseiller.</p>}
      {TESTS.map((x) => {
        const r = x.id === "disc" ? t.disc : t.management;
        return (
          <section key={x.id} className="card flex flex-col gap-4 p-5" id={x.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{x.nom}</h2>
                <p className="text-sm text-muted">{x.description} · {x.duree}</p>
              </div>
              <Link href={`/espace/tests/${x.id}`} className={`btn ${r ? "btn-sm" : "btn-primary"}`}>{r ? "Repasser le test" : "Commencer le test"}</Link>
            </div>
            {x.id === "disc" ? <ResultatDisc r={r} /> : <ResultatManagement r={r} />}
          </section>
        );
      })}
      <p className="hint">Ces tests t&apos;aident à te connaître : il n&apos;y a pas de bonne ou de mauvaise couleur. Ils ne sont jamais transmis à une entreprise sans ton accord.</p>
    </div>
  );
}
