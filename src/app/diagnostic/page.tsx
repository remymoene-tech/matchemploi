import { verifierConfig } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Diagnostic · Jobaprox" };
export const dynamic = "force-dynamic";

const SQL_MAJ = `create table if not exists public.reglages (cle text primary key, valeur text not null);
alter table public.reglages enable row level security;
insert into public.reglages (cle, valeur) values ('frequence', 'quotidienne') on conflict (cle) do nothing;
alter table public.candidats add column if not exists cv_conseils jsonb;
alter table public.candidats add column if not exists latitude double precision;
alter table public.candidats add column if not exists longitude double precision;
alter table public.candidats add column if not exists code_commune text;
alter table public.offres add column if not exists latitude double precision;
alter table public.offres add column if not exists longitude double precision;
grant select (latitude, longitude) on public.offres to authenticated;`;

async function verifierBase() {
  const db = createAdminClient();
  const essais = await Promise.all([
    db.from("candidats").select("user_id").limit(1),
    db.from("offres").select("id").limit(1),
    db.from("correspondances").select("offre_id").limit(1),
    db.from("candidats").select("cv_conseils").limit(1),
    db.from("reglages").select("cle").limit(1),
    db.storage.from("cv").list("", { limit: 1 }),
    db.from("candidats").select("latitude, longitude, code_commune").limit(1),
    db.from("offres").select("latitude, longitude").limit(1),
  ]);
  const noms = [
    "Table des candidats",
    "Table des offres",
    "Table des correspondances",
    "Colonne des conseils CV (cv_conseils)",
    "Table des réglages",
    "Espace de stockage des CV",
    "Carte : position des candidats",
    "Carte : position des offres",
  ];
  return noms.map((nom, i) => ({ nom, ok: !essais[i].error }));
}

export default async function Diagnostic() {
  const { controles, supabaseOk } = verifierConfig();
  const base = supabaseOk ? await verifierBase().catch(() => null) : null;
  const majManquante = base?.some((b, i) => i >= 3 && i !== 5 && !b.ok);
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
      <h2 className="text-xl font-semibold">Base de données Supabase</h2>
      {!base ? (
        <p className="card p-4 text-sm text-muted">
          {supabaseOk ? "Impossible de joindre Supabase : vérifie les clés ci-dessus." : "Corrige d'abord les variables Supabase ci-dessus."}
        </p>
      ) : (
        <ul className="card divide-y divide-line">
          {base.map((b) => (
            <li key={b.nom} className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm">{b.nom}</span>
              <span className={`chip ${b.ok ? "chip-plus" : "chip-minus"}`}>{b.ok ? "OK" : "Manquante"}</span>
            </li>
          ))}
        </ul>
      )}
      {base?.slice(0, 3).some((b) => !b.ok) && (
        <p className="rounded-xl bg-warn-soft p-4 text-sm">
          Les tables principales manquent : exécute tout le fichier <code>supabase/schema.sql</code> dans Supabase → Éditeur SQL.
        </p>
      )}
      {majManquante && (
        <div className="flex flex-col gap-2 rounded-xl bg-warn-soft p-4 text-sm">
          <p>Mise à jour à faire : copie ce texte dans Supabase → Éditeur SQL → Nouvelle requête, puis clique sur Exécuter.</p>
          <pre className="overflow-x-auto rounded-lg bg-surface p-3 font-mono text-xs">{SQL_MAJ}</pre>
        </div>
      )}

      <p className="text-sm text-muted">
        Après une correction dans Vercel (Paramètres → Variables d&apos;environnement), il faut redéployer :
        Déploiements → ⋯ → Redéployer.
      </p>
    </div>
  );
}
