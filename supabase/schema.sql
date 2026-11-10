-- ============================================================
-- MagnusMatch : structure de la base de données
-- À coller une seule fois dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Profils des candidats (un par compte)
create table if not exists public.candidats (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  nom            text not null default '',
  telephone      text not null default '',
  formation      text not null default '',          -- diplôme obtenu ou préparé
  poste_vise     text not null default '',
  contrats       text[] not null default '{}',      -- alternance, cdi, cdd, interim, stage
  code_postal    text not null default '',
  ville          text not null default '',
  mobilite_km    integer not null default 20,
  permis         text not null default '',          -- permis_vehicule | permis | non | ''
  rythme         text not null default '',          -- rythme d'alternance souhaité
  disponibilite  text not null default '',
  projet         text not null default '',
  cv_chemin      text,                              -- chemin du PDF dans le stockage
  cv_texte       text not null default '',          -- texte lu par l'IA dans le CV
  competences    text[] not null default '{}',
  mots_cles      text not null default '',          -- mots-clés de recherche France Travail
  consentement   boolean not null default false,    -- accord RGPD
  alertes_email  boolean not null default true,
  recherche_en_cours boolean not null default false,
  derniere_recherche timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 2. Offres (entreprises partenaires, annonces collées, France Travail)
create table if not exists public.offres (
  id             uuid primary key default gen_random_uuid(),
  source         text not null default 'partenaire', -- partenaire | externe | france_travail
  source_id      text,                               -- identifiant chez la source
  entreprise     text not null default '',
  intitule       text not null default '',
  contrat        text not null default '',           -- alternance | cdi | cdd | interim | stage
  contrat_libelle text not null default '',
  lieu           text not null default '',
  departement    text not null default '',
  salaire        text not null default '',
  description    text not null default '',
  lien           text not null default '',
  contact_nom    text not null default '',
  contact_email  text not null default '',
  ouverte        boolean not null default true,
  publiee_le     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source, source_id)
);

-- 3. Correspondances candidat × offre, notées par l'IA
create table if not exists public.correspondances (
  candidat_id    uuid not null references public.candidats(user_id) on delete cascade,
  offre_id       uuid not null references public.offres(id) on delete cascade,
  score          integer not null,
  forts          text[] not null default '{}',
  manques        text[] not null default '{}',
  resume         text not null default '',
  avis_candidat  text not null default 'nouveau',     -- nouveau | interesse | pas_interesse | postule
  suivi          text not null default 'a_traiter',   -- suivi par l'équipe
  notifie_le     timestamptz,
  calcule_le     timestamptz not null default now(),
  primary key (candidat_id, offre_id)
);
create index if not exists correspondances_offre_idx on public.correspondances(offre_id);

-- ============================================================
-- Sécurité (Row Level Security)
-- Les candidats ne voient que LEURS données. L'espace admin
-- passe par le serveur avec la clé "service_role".
-- ============================================================
alter table public.candidats enable row level security;
alter table public.offres enable row level security;
alter table public.correspondances enable row level security;

drop policy if exists "candidat lit son profil" on public.candidats;
create policy "candidat lit son profil" on public.candidats
  for select using (auth.uid() = user_id);

drop policy if exists "candidat crée son profil" on public.candidats;
create policy "candidat crée son profil" on public.candidats
  for insert with check (auth.uid() = user_id);

drop policy if exists "candidat modifie son profil" on public.candidats;
create policy "candidat modifie son profil" on public.candidats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "candidat lit ses correspondances" on public.correspondances;
create policy "candidat lit ses correspondances" on public.correspondances
  for select using (auth.uid() = candidat_id);

drop policy if exists "candidat donne son avis" on public.correspondances;
create policy "candidat donne son avis" on public.correspondances
  for update using (auth.uid() = candidat_id) with check (auth.uid() = candidat_id);
-- ... mais uniquement sur la colonne avis_candidat :
revoke update on public.correspondances from authenticated;
grant update (avis_candidat) on public.correspondances to authenticated;

-- Un candidat ne lit une offre que si elle lui a été proposée
drop policy if exists "candidat lit ses offres" on public.offres;
create policy "candidat lit ses offres" on public.offres
  for select using (exists (
    select 1 from public.correspondances c
    where c.offre_id = offres.id and c.candidat_id = auth.uid()
  ));

-- Les colonnes de contact des offres partenaires restent réservées à l'équipe
revoke select on public.offres from authenticated, anon;
grant select (id, source, entreprise, intitule, contrat, contrat_libelle, lieu, departement,
              salaire, description, lien, ouverte, publiee_le) on public.offres to authenticated;

-- ============================================================
-- Stockage des CV (privé : seul le serveur y accède)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('cv', 'cv', false)
on conflict (id) do nothing;

-- ============================================================
-- Réglages modifiables depuis l'espace admin (fréquence de recherche…)
-- ============================================================
create table if not exists public.reglages (
  cle    text primary key,
  valeur text not null
);
alter table public.reglages enable row level security; -- accessible au serveur uniquement
insert into public.reglages (cle, valeur) values ('frequence', 'quotidienne')
on conflict (cle) do nothing;

-- ============================================================
-- Conseils de l'IA pour améliorer le CV
-- ============================================================
alter table public.candidats add column if not exists cv_conseils jsonb;

-- ============================================================
-- Carte des offres : coordonnées GPS
-- ============================================================
alter table public.candidats add column if not exists latitude double precision;
alter table public.candidats add column if not exists longitude double precision;
alter table public.candidats add column if not exists code_commune text;
alter table public.offres add column if not exists latitude double precision;
alter table public.offres add column if not exists longitude double precision;
grant select (latitude, longitude) on public.offres to authenticated;

-- ============================================================
-- Espace École : chaque école gère ses étudiants et ses entreprises partenaires
-- ============================================================
create table if not exists public.ecoles (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null,
  code       text not null unique,   -- code d'inscription donné aux étudiants
  created_at timestamptz not null default now()
);
create table if not exists public.responsables (
  email      text primary key,       -- email du responsable entreprises (son compte sur le site)
  ecole_id   uuid not null references public.ecoles(id) on delete cascade,
  nom        text not null default '',
  created_at timestamptz not null default now()
);
alter table public.ecoles enable row level security;        -- accessibles au serveur uniquement
alter table public.responsables enable row level security;
alter table public.candidats add column if not exists ecole_id uuid references public.ecoles(id) on delete set null;
alter table public.offres add column if not exists ecole_id uuid references public.ecoles(id) on delete cascade;

-- ============================================================
-- « Pas pour moi » : la raison donnée par le candidat (l'IA en tient compte)
-- ============================================================
alter table public.correspondances add column if not exists raison_refus text;
grant update (avis_candidat, raison_refus) on public.correspondances to authenticated;

-- ============================================================
-- Offres de l'équipe : téléphone du contact, et invisibles pour les candidats
-- ============================================================
alter table public.offres add column if not exists contact_tel text not null default '';
drop policy if exists "candidat lit ses offres" on public.offres;
create policy "candidat lit ses offres" on public.offres
  for select using (
    source in ('france_travail', 'adzuna', 'la_bonne_alternance')
    and exists (select 1 from public.correspondances c where c.offre_id = offres.id and c.candidat_id = auth.uid())
  );

-- ============================================================
-- Fiche « Préparer mon entretien » (rédigée par MagnusMatch)
-- ============================================================
alter table public.correspondances add column if not exists preparation jsonb;
alter table public.correspondances add column if not exists preparation_le timestamptz;

-- ============================================================
-- Plusieurs recherches par candidat + pistes proposées par MagnusMatch
-- ============================================================
create table if not exists public.recherches (
  id          uuid primary key default gen_random_uuid(),
  candidat_id uuid not null references public.candidats(user_id) on delete cascade,
  poste       text not null,
  mots_cles   text not null default '',
  contrats    text[] not null default '{}',
  mobilite_km integer not null default 20,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.recherches enable row level security;
drop policy if exists "candidat gère ses recherches" on public.recherches;
create policy "candidat gère ses recherches" on public.recherches
  for all using (auth.uid() = candidat_id) with check (auth.uid() = candidat_id);
alter table public.correspondances add column if not exists recherche_id uuid references public.recherches(id) on delete set null;
alter table public.correspondances add column if not exists piste text;   -- métier voisin proposé par MagnusMatch
alter table public.candidats add column if not exists pistes jsonb;
alter table public.candidats add column if not exists pistes_le timestamptz;

-- ============================================================
-- Entretiens conseiller ↔ étudiant (fiche d'entretien de l'école)
-- ============================================================
create table if not exists public.entretiens_conseil (
  id              uuid primary key default gen_random_uuid(),
  candidat_id     uuid not null references public.candidats(user_id) on delete cascade,
  conseiller      text not null default '',
  conseiller_email text not null default '',
  date_entretien  date not null default current_date,
  formation       text not null default '',
  zone            text not null default '',
  reponses        jsonb not null default '{}',   -- cases cochées, réponses et précisions
  qualites        text not null default '',
  points_faibles  text not null default '',
  bilan           text not null default '',
  observations    text not null default '',
  prochaine_etape text not null default '',
  partage         boolean not null default false, -- visible par l'étudiant dans son espace
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.entretiens_conseil enable row level security;
drop policy if exists "étudiant lit ses bilans partagés" on public.entretiens_conseil;
create policy "étudiant lit ses bilans partagés" on public.entretiens_conseil
  for select using (auth.uid() = candidat_id and partage);

-- ============================================================
-- Tests (DISC, style de management) passés par les étudiants
-- ============================================================
create table if not exists public.tests_resultats (
  id          uuid primary key default gen_random_uuid(),
  candidat_id uuid not null references public.candidats(user_id) on delete cascade,
  test        text not null,                -- disc | management
  reponses    jsonb not null default '[]',
  scores      jsonb not null default '{}',
  dominante   text not null default '',
  passe_par   text not null default 'candidat', -- candidat | conseiller
  created_at  timestamptz not null default now()
);
alter table public.tests_resultats enable row level security;
drop policy if exists "étudiant lit ses tests" on public.tests_resultats;
create policy "étudiant lit ses tests" on public.tests_resultats
  for select using (auth.uid() = candidat_id);

-- ============================================================
-- L'entretien n'est jamais visible par l'étudiant ;
-- un test ne se repasse que sur autorisation de l'équipe ;
-- synthèse globale réservée à l'équipe
-- ============================================================
drop policy if exists "étudiant lit ses bilans partagés" on public.entretiens_conseil;
create table if not exists public.tests_autorisations (
  candidat_id uuid not null references public.candidats(user_id) on delete cascade,
  test        text not null,
  autorise_par text not null default '',
  created_at  timestamptz not null default now(),
  primary key (candidat_id, test)
);
alter table public.tests_autorisations enable row level security; -- serveur uniquement
create table if not exists public.syntheses_candidat (
  candidat_id uuid primary key references public.candidats(user_id) on delete cascade,
  contenu     jsonb not null,
  genere_par  text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.syntheses_candidat enable row level security; -- serveur uniquement

-- ============================================================
-- CV amélioré par MagnusMatch
-- ============================================================
alter table public.candidats add column if not exists cv_ameliore jsonb;
alter table public.candidats add column if not exists cv_ameliore_le timestamptz;

-- ============================================================
-- Journal des échanges avec le candidat (téléphone, email, SMS…) — équipe uniquement
-- ============================================================
create table if not exists public.echanges (
  id           uuid primary key default gen_random_uuid(),
  candidat_id  uuid not null references public.candidats(user_id) on delete cascade,
  type         text not null default 'telephone',   -- telephone | email | sms | rdv | autre
  date_echange timestamptz not null default now(),
  resume       text not null default '',
  action       text not null default '',             -- prochaine action à faire
  action_le    date,                                  -- date de relance
  action_faite boolean not null default false,
  auteur       text not null default '',
  created_at   timestamptz not null default now()
);
alter table public.echanges enable row level security; -- serveur uniquement : jamais visible par le candidat
create index if not exists echanges_candidat_idx on public.echanges(candidat_id, date_echange desc);

-- Relance avec date ET heure (notification dans le site)
alter table public.echanges add column if not exists action_a timestamptz;
create index if not exists echanges_relances_idx on public.echanges(auteur, action_faite, action_a);

-- Réseau : adresse et analyse du profil LinkedIn
alter table public.candidats add column if not exists linkedin_url text not null default '';
alter table public.candidats add column if not exists linkedin_analyse jsonb;
alter table public.candidats add column if not exists linkedin_le timestamptz;

-- Questionnaire « Les attentes de l'entreprise » sur les offres de l'équipe
alter table public.offres add column if not exists attentes jsonb;

-- Mes entreprises : entreprises rencontrées (avec ou sans offre), suivi et échanges. Serveur uniquement.
create table if not exists public.entreprises (
  id uuid primary key default gen_random_uuid(), nom text not null, secteur text not null default '', ville text not null default '', site text not null default '', contact_nom text not null default '', contact_fonction text not null default '', contact_email text not null default '', contact_tel text not null default '', statut text not null default 'rencontree', origine text not null default '', rencontre_le date, notes text not null default '', auteur text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.entreprises enable row level security;
alter table public.offres add column if not exists entreprise_id uuid references public.entreprises(id) on delete set null;
alter table public.echanges alter column candidat_id drop not null;
alter table public.echanges add column if not exists entreprise_id uuid references public.entreprises(id) on delete cascade;
create index if not exists echanges_entreprise_idx on public.echanges(entreprise_id, date_echange desc);

-- Année d'obtention du diplôme préparé
alter table public.candidats add column if not exists diplome_annee integer;

-- Admission : seuls les étudiants « admis » ont accès à leurs offres. L'étudiant ne peut pas changer son statut lui-même.
alter table public.candidats add column if not exists statut_admission text;
update public.candidats set statut_admission = 'admis' where statut_admission is null;
alter table public.candidats alter column statut_admission set default 'prospect';
create or replace function public.proteger_admission() returns trigger language plpgsql as $$ begin if current_user in ('authenticated', 'anon') then if tg_op = 'INSERT' then new.statut_admission := 'prospect'; else new.statut_admission := old.statut_admission; end if; end if; return new; end $$;
drop trigger if exists proteger_admission on public.candidats;
create trigger proteger_admission before insert or update on public.candidats for each row execute function public.proteger_admission();

-- Formations des écoles et année de cursus des étudiants (+ école Magnus Campus)
alter table public.ecoles add column if not exists formations jsonb not null default '[]'::jsonb;
alter table public.candidats add column if not exists annee_cursus integer;
alter table public.candidats add column if not exists rythme_cursus text;
insert into public.ecoles (nom, code, formations) select 'Magnus Campus', 'MAGNUS-CAMPUS', '[{"nom":"EGC","duree":3,"alternance":[2,3]},{"nom":"GUC","duree":2,"alternance":[1,2]},{"nom":"AMLHR","duree":2,"alternance":[1,2]}]'::jsonb where not exists (select 1 from public.ecoles where lower(nom) = 'magnus campus');
update public.ecoles set formations = '[{"nom":"EGC","duree":3,"alternance":[2,3]},{"nom":"GUC","duree":2,"alternance":[1,2]},{"nom":"AMLHR","duree":2,"alternance":[1,2]}]'::jsonb where lower(nom) = 'magnus campus' and formations = '[]'::jsonb;

-- Prospections : entreprises contactées par l'étudiant lui-même (serveur uniquement)
create table if not exists public.prospections (id uuid primary key default gen_random_uuid(), candidat_id uuid not null references public.candidats(user_id) on delete cascade, entreprise text not null, ville text not null default '', contact_nom text not null default '', contact_tel text not null default '', contact_email text not null default '', recrute text not null default '', justification text not null default '', entreprise_id uuid references public.entreprises(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.prospections enable row level security;
create index if not exists prospections_candidat_idx on public.prospections(candidat_id, updated_at desc);
create table if not exists public.prospection_echanges (id uuid primary key default gen_random_uuid(), prospection_id uuid not null references public.prospections(id) on delete cascade, candidat_id uuid not null references public.candidats(user_id) on delete cascade, type text not null default 'telephone', date_echange timestamptz not null default now(), resume text not null default '', action text not null default '', action_a timestamptz, action_faite boolean not null default false, created_at timestamptz not null default now());
alter table public.prospection_echanges enable row level security;
create index if not exists prospection_echanges_idx on public.prospection_echanges(prospection_id, date_echange desc);
create index if not exists prospection_relances_idx on public.prospection_echanges(candidat_id, action_faite, action_a);

-- Entretien prévu avec une entreprise prospectée (notification la veille)
alter table public.prospections add column if not exists entretien_a timestamptz;
alter table public.prospections add column if not exists entretien_vu boolean not null default false;

-- Motif du refus ou de l'abandon
alter table public.candidats add column if not exists motif_admission text not null default '';

-- Questionnaire des besoins sur la fiche entreprise
alter table public.entreprises add column if not exists attentes jsonb;

-- Date d'expiration des offres de l'équipe (fermées automatiquement)
alter table public.offres add column if not exists expire_le timestamptz;

-- Fiche besoin remplie par l'entreprise via un lien personnel
alter table public.entreprises add column if not exists jeton_besoin text unique;
alter table public.entreprises add column if not exists besoin_envoye_le timestamptz;
alter table public.entreprises add column if not exists besoin_rempli_le timestamptz;

-- Préférences des étudiants (questions communes) et fiches de poste rédigées automatiquement
alter table public.candidats add column if not exists preferences jsonb;
alter table public.offres add column if not exists redigee_ia boolean not null default false;

-- Fiche de poste structurée et logo de l'entreprise
alter table public.offres add column if not exists fiche jsonb;
alter table public.entreprises add column if not exists logo_url text;

-- CRM : leads (demandes de brochure, JPO…), leurs échanges, et les brochures en PDF
create table if not exists public.leads (id uuid primary key default gen_random_uuid(), prenom text not null default '', nom text not null default '', email text not null default '', telephone text not null default '', formation text not null default '', annee_rentree integer, origine text not null default 'Brochure (site de l''école)', statut text not null default 'nouveau', ecole_id uuid references public.ecoles(id) on delete set null, candidat_id uuid references public.candidats(user_id) on delete set null, consentement boolean not null default false, brochure_envoyee_le timestamptz, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.leads enable row level security;
create index if not exists leads_date_idx on public.leads(created_at desc);
create index if not exists leads_email_idx on public.leads(email);
alter table public.echanges add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.ecoles add column if not exists brochure text;
insert into storage.buckets (id, name, public) values ('brochures', 'brochures', true) on conflict (id) do nothing;

-- Leads : « Inscrit » devient « Admis à l'entretien »
update public.leads set statut = 'admis' where statut = 'inscrit';

-- Dates des étapes du concours (taux de conversion)
alter table public.leads add column if not exists convoque_le timestamptz;
alter table public.leads add column if not exists present_le timestamptz;
alter table public.leads add column if not exists admis_le timestamptz;
update public.leads set statut = 'convoque' where statut = 'entretien';

-- Entretien d'admission des leads : date, rappel la veille, fiche d'entretien
alter table public.leads add column if not exists entretien_a timestamptz;
alter table public.leads add column if not exists rappel_entretien_envoye boolean not null default false;
alter table public.entretiens_conseil alter column candidat_id drop not null;
alter table public.entretiens_conseil add column if not exists lead_id uuid references public.leads(id) on delete set null;

-- Motif quand un lead est perdu
alter table public.leads add column if not exists motif_perte text not null default '';

-- Événements (JPO, salons) : QR code vers le formulaire brochure
create table if not exists public.evenements (id uuid primary key default gen_random_uuid(), nom text not null, date date not null, lieu text not null default '', code text not null unique, created_at timestamptz not null default now());
alter table public.evenements enable row level security;
alter table public.leads add column if not exists evenement_id uuid references public.evenements(id) on delete set null;
alter table public.evenements add column if not exists sur_accueil boolean not null default false;
alter table public.candidats add column if not exists carte_jeton text unique;
alter table public.candidats add column if not exists carte_options jsonb;
alter table public.candidats add column if not exists carte_vues integer not null default 0;
alter table public.candidats add column if not exists carte_vue_le timestamptz;
alter table public.candidats add column if not exists parcours jsonb;
alter table public.candidats add column if not exists alumni_rappel_le timestamptz;
alter table public.offres add column if not exists validation text;
alter table public.offres add column if not exists proposee_par uuid references auth.users(id) on delete set null;
create table if not exists public.equipe (id uuid primary key default gen_random_uuid(), email text not null unique, nom text not null default '', role text not null default 'admission', actif boolean not null default true, retire_le timestamptz, created_at timestamptz not null default now());
alter table public.equipe enable row level security;
alter table public.equipe add column if not exists poste text not null default '';
alter table public.equipe add column if not exists acces jsonb;
alter table public.leads add column if not exists attribue_a text;
alter table public.leads add column if not exists attribue_le timestamptz;
alter table public.leads add column if not exists categorie text;
alter table public.leads add column if not exists message text not null default '';
alter table public.leads add column if not exists cv_chemin text;
alter table public.leads add column if not exists situation text not null default '';
alter table public.leads add column if not exists entreprise text not null default '';
alter table public.leads add column if not exists recrute boolean not null default false;
alter table public.leads add column if not exists entreprise_id uuid references public.entreprises(id) on delete set null;
alter table public.candidats add column if not exists annee_rentree integer;
create table if not exists public.classes (id uuid primary key default gen_random_uuid(), nom text not null, annee integer not null, formation text not null default '', created_at timestamptz not null default now());
alter table public.classes enable row level security;
alter table public.candidats add column if not exists classe_id uuid references public.classes(id) on delete set null;
create table if not exists public.modeles_messages (id text primary key, titre text not null default '', sujet text not null default '', email text not null default '', sms text not null default '', updated_at timestamptz not null default now());
alter table public.modeles_messages enable row level security;
alter table public.modeles_messages add column if not exists cible text not null default '';
