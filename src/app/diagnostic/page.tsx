import { verifierConfig } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { testerFranceTravail } from "@/lib/france-travail";
import { testerAdzuna } from "@/lib/adzuna";
import { Copier } from "@/components/Copier";
import { testerLBA } from "@/lib/la-bonne-alternance";
import { moyenEnvoi } from "@/lib/email";

export const metadata = { title: "Diagnostic · MagnusMatch" };
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
grant select (latitude, longitude) on public.offres to authenticated;
create table if not exists public.ecoles (id uuid primary key default gen_random_uuid(), nom text not null, code text not null unique, created_at timestamptz not null default now());
create table if not exists public.responsables (email text primary key, ecole_id uuid not null references public.ecoles(id) on delete cascade, nom text not null default '', created_at timestamptz not null default now());
alter table public.ecoles enable row level security;
alter table public.responsables enable row level security;
alter table public.candidats add column if not exists ecole_id uuid references public.ecoles(id) on delete set null;
alter table public.offres add column if not exists ecole_id uuid references public.ecoles(id) on delete cascade;
alter table public.correspondances add column if not exists raison_refus text;
grant update (avis_candidat, raison_refus) on public.correspondances to authenticated;
alter table public.offres add column if not exists contact_tel text not null default '';
drop policy if exists "candidat lit ses offres" on public.offres;
create policy "candidat lit ses offres" on public.offres for select using (source in ('france_travail', 'adzuna', 'la_bonne_alternance') and exists (select 1 from public.correspondances c where c.offre_id = offres.id and c.candidat_id = auth.uid()));
alter table public.correspondances add column if not exists preparation jsonb;
alter table public.correspondances add column if not exists preparation_le timestamptz;
create table if not exists public.recherches (id uuid primary key default gen_random_uuid(), candidat_id uuid not null references public.candidats(user_id) on delete cascade, poste text not null, mots_cles text not null default '', contrats text[] not null default '{}', mobilite_km integer not null default 20, active boolean not null default true, created_at timestamptz not null default now());
alter table public.recherches enable row level security;
drop policy if exists "candidat gère ses recherches" on public.recherches;
create policy "candidat gère ses recherches" on public.recherches for all using (auth.uid() = candidat_id) with check (auth.uid() = candidat_id);
alter table public.correspondances add column if not exists recherche_id uuid references public.recherches(id) on delete set null;
alter table public.correspondances add column if not exists piste text;
alter table public.candidats add column if not exists pistes jsonb;
alter table public.candidats add column if not exists pistes_le timestamptz;
create table if not exists public.entretiens_conseil (id uuid primary key default gen_random_uuid(), candidat_id uuid not null references public.candidats(user_id) on delete cascade, conseiller text not null default '', conseiller_email text not null default '', date_entretien date not null default current_date, formation text not null default '', zone text not null default '', reponses jsonb not null default '{}', qualites text not null default '', points_faibles text not null default '', bilan text not null default '', observations text not null default '', prochaine_etape text not null default '', partage boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.entretiens_conseil enable row level security;
drop policy if exists "étudiant lit ses bilans partagés" on public.entretiens_conseil;
create table if not exists public.tests_resultats (id uuid primary key default gen_random_uuid(), candidat_id uuid not null references public.candidats(user_id) on delete cascade, test text not null, reponses jsonb not null default '[]', scores jsonb not null default '{}', dominante text not null default '', passe_par text not null default 'candidat', created_at timestamptz not null default now());
alter table public.tests_resultats enable row level security;
drop policy if exists "étudiant lit ses tests" on public.tests_resultats;
create policy "étudiant lit ses tests" on public.tests_resultats for select using (auth.uid() = candidat_id);
create table if not exists public.tests_autorisations (candidat_id uuid not null references public.candidats(user_id) on delete cascade, test text not null, autorise_par text not null default '', created_at timestamptz not null default now(), primary key (candidat_id, test));
alter table public.tests_autorisations enable row level security;
create table if not exists public.syntheses_candidat (candidat_id uuid primary key references public.candidats(user_id) on delete cascade, contenu jsonb not null, genere_par text not null default '', created_at timestamptz not null default now());
alter table public.syntheses_candidat enable row level security;
alter table public.candidats add column if not exists cv_ameliore jsonb;
alter table public.candidats add column if not exists cv_ameliore_le timestamptz;
create table if not exists public.echanges (id uuid primary key default gen_random_uuid(), candidat_id uuid not null references public.candidats(user_id) on delete cascade, type text not null default 'telephone', date_echange timestamptz not null default now(), resume text not null default '', action text not null default '', action_le date, action_faite boolean not null default false, auteur text not null default '', created_at timestamptz not null default now());
alter table public.echanges enable row level security;
create index if not exists echanges_candidat_idx on public.echanges(candidat_id, date_echange desc);
alter table public.echanges add column if not exists action_a timestamptz;
create index if not exists echanges_relances_idx on public.echanges(auteur, action_faite, action_a);
alter table public.candidats add column if not exists linkedin_url text not null default '';
alter table public.candidats add column if not exists linkedin_analyse jsonb;
alter table public.candidats add column if not exists linkedin_le timestamptz;
alter table public.offres add column if not exists attentes jsonb;
create table if not exists public.entreprises (id uuid primary key default gen_random_uuid(), nom text not null, secteur text not null default '', ville text not null default '', site text not null default '', contact_nom text not null default '', contact_fonction text not null default '', contact_email text not null default '', contact_tel text not null default '', statut text not null default 'rencontree', origine text not null default '', rencontre_le date, notes text not null default '', auteur text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.entreprises enable row level security;
alter table public.offres add column if not exists entreprise_id uuid references public.entreprises(id) on delete set null;
alter table public.echanges alter column candidat_id drop not null;
alter table public.echanges add column if not exists entreprise_id uuid references public.entreprises(id) on delete cascade;
create index if not exists echanges_entreprise_idx on public.echanges(entreprise_id, date_echange desc);
alter table public.candidats add column if not exists diplome_annee integer;
alter table public.candidats add column if not exists statut_admission text;
update public.candidats set statut_admission = 'admis' where statut_admission is null;
alter table public.candidats alter column statut_admission set default 'prospect';
create or replace function public.proteger_admission() returns trigger language plpgsql as \$\$ begin if current_user in ('authenticated', 'anon') then if tg_op = 'INSERT' then new.statut_admission := 'prospect'; else new.statut_admission := old.statut_admission; end if; end if; return new; end \$\$;
drop trigger if exists proteger_admission on public.candidats;
create trigger proteger_admission before insert or update on public.candidats for each row execute function public.proteger_admission();
alter table public.ecoles add column if not exists formations jsonb not null default '[]'::jsonb;
alter table public.candidats add column if not exists annee_cursus integer;
alter table public.candidats add column if not exists rythme_cursus text;
insert into public.ecoles (nom, code, formations) select 'Magnus Campus', 'MAGNUS-CAMPUS', '[{"nom":"EGC","duree":3,"alternance":[2,3]},{"nom":"GUC","duree":2,"alternance":[1,2]},{"nom":"AMLHR","duree":2,"alternance":[1,2]}]'::jsonb where not exists (select 1 from public.ecoles where lower(nom) = 'magnus campus');
update public.ecoles set formations = '[{"nom":"EGC","duree":3,"alternance":[2,3]},{"nom":"GUC","duree":2,"alternance":[1,2]},{"nom":"AMLHR","duree":2,"alternance":[1,2]}]'::jsonb where lower(nom) = 'magnus campus' and formations = '[]'::jsonb;
create table if not exists public.prospections (id uuid primary key default gen_random_uuid(), candidat_id uuid not null references public.candidats(user_id) on delete cascade, entreprise text not null, ville text not null default '', contact_nom text not null default '', contact_tel text not null default '', contact_email text not null default '', recrute text not null default '', justification text not null default '', entreprise_id uuid references public.entreprises(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.prospections enable row level security;
create index if not exists prospections_candidat_idx on public.prospections(candidat_id, updated_at desc);
create table if not exists public.prospection_echanges (id uuid primary key default gen_random_uuid(), prospection_id uuid not null references public.prospections(id) on delete cascade, candidat_id uuid not null references public.candidats(user_id) on delete cascade, type text not null default 'telephone', date_echange timestamptz not null default now(), resume text not null default '', action text not null default '', action_a timestamptz, action_faite boolean not null default false, created_at timestamptz not null default now());
alter table public.prospection_echanges enable row level security;
create index if not exists prospection_echanges_idx on public.prospection_echanges(prospection_id, date_echange desc);
create index if not exists prospection_relances_idx on public.prospection_echanges(candidat_id, action_faite, action_a);
alter table public.prospections add column if not exists entretien_a timestamptz;
alter table public.prospections add column if not exists entretien_vu boolean not null default false;
alter table public.candidats add column if not exists motif_admission text not null default '';
alter table public.entreprises add column if not exists attentes jsonb;
alter table public.offres add column if not exists expire_le timestamptz;
alter table public.entreprises add column if not exists jeton_besoin text unique;
alter table public.entreprises add column if not exists besoin_envoye_le timestamptz;
alter table public.entreprises add column if not exists besoin_rempli_le timestamptz;
alter table public.candidats add column if not exists preferences jsonb;
alter table public.offres add column if not exists redigee_ia boolean not null default false;
alter table public.offres add column if not exists fiche jsonb;
alter table public.entreprises add column if not exists logo_url text;
create table if not exists public.leads (id uuid primary key default gen_random_uuid(), prenom text not null default '', nom text not null default '', email text not null default '', telephone text not null default '', formation text not null default '', annee_rentree integer, origine text not null default 'Brochure (site de l''école)', statut text not null default 'nouveau', ecole_id uuid references public.ecoles(id) on delete set null, candidat_id uuid references public.candidats(user_id) on delete set null, consentement boolean not null default false, brochure_envoyee_le timestamptz, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.leads enable row level security;
create index if not exists leads_date_idx on public.leads(created_at desc);
create index if not exists leads_email_idx on public.leads(email);
alter table public.echanges add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.ecoles add column if not exists brochure text;
insert into storage.buckets (id, name, public) values ('brochures', 'brochures', true) on conflict (id) do nothing;
update public.leads set statut = 'admis' where statut = 'inscrit';
alter table public.leads add column if not exists convoque_le timestamptz;
alter table public.leads add column if not exists present_le timestamptz;
alter table public.leads add column if not exists admis_le timestamptz;
update public.leads set statut = 'convoque' where statut = 'entretien';`;

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
    db.from("ecoles").select("id").limit(1),
    db.from("responsables").select("email").limit(1),
    db.from("candidats").select("ecole_id").limit(1),
    db.from("offres").select("ecole_id").limit(1),
    db.from("correspondances").select("raison_refus").limit(1),
    db.from("offres").select("contact_tel").limit(1),
    db.from("correspondances").select("preparation, preparation_le").limit(1),
    db.from("recherches").select("id").limit(1),
    db.from("correspondances").select("recherche_id, piste").limit(1),
    db.from("candidats").select("pistes, pistes_le").limit(1),
    db.from("entretiens_conseil").select("id").limit(1),
    db.from("tests_resultats").select("id").limit(1),
    db.from("tests_autorisations").select("test").limit(1),
    db.from("syntheses_candidat").select("candidat_id").limit(1),
    db.from("candidats").select("cv_ameliore").limit(1),
    db.from("echanges").select("id").limit(1),
    db.from("echanges").select("action_a").limit(1),
    db.from("candidats").select("linkedin_url, linkedin_analyse, linkedin_le").limit(1),
    db.from("offres").select("attentes").limit(1),
    db.from("entreprises").select("id").limit(1),
    db.from("echanges").select("entreprise_id").limit(1),
    db.from("candidats").select("diplome_annee").limit(1),
    db.from("candidats").select("statut_admission").limit(1),
    db.from("ecoles").select("formations").limit(1),
    db.from("candidats").select("annee_cursus, rythme_cursus").limit(1),
    db.from("prospections").select("id").limit(1),
    db.from("prospection_echanges").select("id").limit(1),
    db.from("prospections").select("entretien_a, entretien_vu").limit(1),
    db.from("candidats").select("motif_admission").limit(1),
    db.from("entreprises").select("attentes").limit(1),
    db.from("offres").select("expire_le").limit(1),
    db.from("entreprises").select("jeton_besoin, besoin_envoye_le, besoin_rempli_le").limit(1),
    db.from("candidats").select("preferences").limit(1),
    db.from("offres").select("redigee_ia").limit(1),
    db.from("offres").select("fiche").limit(1),
    db.from("entreprises").select("logo_url").limit(1),
    db.from("leads").select("id").limit(1),
    db.from("echanges").select("lead_id").limit(1),
    db.from("ecoles").select("brochure").limit(1),
    db.from("leads").select("convoque_le, present_le, admis_le").limit(1),
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
    "Espace École : écoles",
    "Espace École : responsables",
    "Espace École : école des étudiants",
    "Espace École : offres des écoles",
    "Raisons des refus (« Pas pour moi »)",
    "Téléphone des entreprises",
    "Fiches de préparation d'entretien",
    "Plusieurs recherches par candidat",
    "Recherche et piste de chaque offre",
    "Pistes proposées par MagnusMatch",
    "Fiches d'entretien conseiller",
    "Résultats des tests (DISC, management)",
    "Autorisations pour repasser un test",
    "Synthèse globale du candidat",
    "CV amélioré par MagnusMatch",
    "Journal des échanges",
    "Relances avec date et heure",
    "Réseau : profil LinkedIn",
    "Attentes de l'entreprise (offres)",
    "Mes entreprises",
    "Échanges et rappels des entreprises",
    "Année du diplôme des étudiants",
    "Admission des étudiants (prospect, admis…)",
    "Formations des écoles (Magnus Campus : EGC, GUC, AMLHR)",
    "Année de formation des étudiants",
    "Prospections des étudiants",
    "Historique et relances des prospections",
    "Entretiens des étudiants (notification la veille)",
    "Refus et abandon (motif)",
    "Besoins des entreprises (questionnaire)",
    "Durée des offres (expiration automatique)",
    "Fiche besoin envoyée aux entreprises",
    "Préférences des étudiants",
    "Fiches de poste rédigées par MagnusMatch",
    "Fiche de poste imprimable",
    "Logo des entreprises",
    "Leads (CRM)",
    "Échanges et rappels des leads",
    "Brochures des formations",
    "Étapes du concours (statistiques)",
  ];
  return noms.map((nom, i) => ({ nom, ok: !essais[i].error }));
}

const SQL_LBA = `drop policy if exists "candidat lit ses offres" on public.offres;
create policy "candidat lit ses offres" on public.offres for select using (source in ('france_travail', 'adzuna', 'la_bonne_alternance') and exists (select 1 from public.correspondances c where c.offre_id = offres.id and c.candidat_id = auth.uid()));`;

export default async function Diagnostic() {
  const { controles, supabaseOk } = verifierConfig();
  const base = supabaseOk ? await verifierBase().catch(() => null) : null;
  const [ft, az, lba] = await Promise.all([testerFranceTravail(), testerAdzuna(), testerLBA()]);
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
          <pre className="whitespace-pre-wrap break-all rounded-lg bg-surface p-3 font-mono text-xs">{SQL_MAJ}</pre>
          <div><Copier texte={SQL_MAJ} /></div>
        </div>
      )}

      <h2 className="text-xl font-semibold">Envoi d&apos;emails</h2>
      <div className="card flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Messages et alertes</span>
          <span className={`chip ${moyenEnvoi() ? "chip-plus" : ""}`}>
            {moyenEnvoi() === "smtp" ? "OK : ta boîte mail" : moyenEnvoi() === "resend" ? "OK : Resend" : "Pas encore branché"}
          </span>
        </div>
        <p className="text-sm text-muted">
          {moyenEnvoi() === "smtp"
            ? `Les emails partent de ${process.env.SMTP_USER}.`
            : moyenEnvoi() === "resend"
              ? "Les emails partent via Resend."
              : "Ajoute SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS dans Vercel (voir le guide) pour envoyer les messages directement depuis le site."}
        </p>
      </div>

      <h2 className="text-xl font-semibold">Sources d&apos;offres</h2>
      <ul className="card divide-y divide-line">
        {([["France Travail", ft], ["Adzuna", az], ["La bonne alternance", lba]] as const).map(([nom, t]) => (
          <li key={nom} className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{nom}</span>
              <span className={`chip ${t.etat === "ok" ? "chip-plus" : t.etat === "erreur" ? "chip-minus" : ""}`}>
                {t.etat === "ok" ? "OK" : t.etat === "erreur" ? "À corriger" : "Pas encore branchée"}
              </span>
            </div>
            <p className="text-sm text-muted">{t.detail}</p>
            {nom === "La bonne alternance" && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-accent">Rappel : SQL à exécuter une seule fois (ce bloc reste toujours affiché, même quand c&apos;est fait)</summary>
                <p className="mt-1 text-muted">Copie ce texte dans Supabase → Éditeur SQL → Nouvelle requête, puis Exécuter.</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs">{SQL_LBA}</pre>
                <div className="mt-2"><Copier texte={SQL_LBA} /></div>
              </details>
            )}
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
