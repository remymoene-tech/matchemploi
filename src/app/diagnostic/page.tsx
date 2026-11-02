import { verifierConfig } from "@/lib/config";

export const metadata = { title: "Diagnostic · MatchEmploi" };
export const dynamic = "force-dynamic";

export default function Diagnostic() {
  const { controles } = verifierConfig();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Diagnostic de configuration</h1>
        <p className="text-muted">Vérifie les variables d&apos;environnement de Vercel. Les valeurs secrètes ne sont jamais affichées.</p>
      </div>
      <ul className="card divide-y divide-line">
        {controles.map((c) => (
          <li key={c.nom} className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <code className="font-mono text-sm break-all">{c.nom}</code>
              <span className={`chip ${c.ok ? "chip-plus" : "chip-minus"}`}>{c.ok ? "OK" : "À corriger"}</span>
            </div>
            {!c.ok && <p className="text-sm text-muted">{c.aide}</p>}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Après une correction dans Vercel (Paramètres → Variables d&apos;environnement), il faut redéployer :
        Déploiements → ⋯ → Redéployer.
      </p>
    </div>
  );
}
