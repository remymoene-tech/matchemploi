-- ============================================================
-- MatchEmploi : structure de la base de données
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
