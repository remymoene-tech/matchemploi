# MatchEmploi

Site qui aide les gens à trouver un emploi ou une alternance :
le candidat crée son espace, dépose son CV et décrit son projet ;
le site cherche les offres (France Travail, entreprises partenaires, annonces collées),
les fait noter par l'IA et prévient le candidat dès qu'une offre lui correspond à 75 % ou plus.

## Ce que contient le site

| Page | Pour qui | Ce qu'on y fait |
|---|---|---|
| `/` | Tout le monde | Présentation, inscription |
| `/inscription`, `/connexion` | Candidats | Créer son compte, se connecter |
| `/espace/profil` | Candidat | Profil, CV en PDF, types de contrat, accord RGPD |
| `/espace` | Candidat | Offres notées, explication de la note, « ça m'intéresse » |
| `/admin` | Équipe | Correspondances, candidats, offres, suivi |
| `/admin/offres/nouvelle` | Équipe | Ajouter l'offre d'une entreprise partenaire |
| `/admin/annonce` | Équipe | Coller une annonce Indeed / HelloWork : l'IA remplit la fiche |

Chaque matin, une tâche planifiée relance la recherche pour tous les candidats.

---

# Guide de mise en ligne (≈ 45 minutes, sans coder)

Tu vas créer 4 comptes gratuits (+ 1 payant à l'usage pour l'IA), puis copier des clés.
Garde un bloc-notes ouvert pour y coller les clés au fur et à mesure.

## Étape 1 — GitHub (stocker le code)
1. Crée un compte sur https://github.com.
2. Crée un dépôt vide nommé `match-emploi` (bouton **New**, laisse-le **Private**).
3. Envoie ce code dans le dépôt (Claude peut le faire pour toi si tu lui donnes le nom du dépôt).

## Étape 2 — Supabase (comptes, base de données, CV)
1. Crée un compte sur https://supabase.com, puis **New project**.
   - Région : **Europe (Paris ou Frankfurt)** pour le RGPD.
   - Note le mot de passe de la base quelque part.
2. Menu **SQL Editor** → **New query** → colle tout le fichier `supabase/schema.sql` → **Run**.
3. Menu **Project Settings → API** : copie
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret, ne jamais la partager)
4. Menu **Authentication → URL Configuration** : mets l'adresse de ton site
   (tu l'auras à l'étape 6, ex. `https://match-emploi.vercel.app`) dans **Site URL**,
   et ajoute `https://match-emploi.vercel.app/auth/callback` dans **Redirect URLs**.
   > Pour un premier test rapide, tu peux désactiver la confirmation d'email :
   > **Authentication → Sign In / Providers → Email → Confirm email** (décocher).

## Étape 3 — Anthropic (l'IA qui lit les CV et note les offres)
1. Crée un compte sur https://console.anthropic.com et ajoute un moyen de paiement
   (quelques euros suffisent pour démarrer ; tu peux fixer une limite de dépense).
2. **API Keys → Create Key** → copie-la dans `ANTHROPIC_API_KEY`.

Coût indicatif : quelques centimes par CV lu et par lot de 8 offres notées.

## Étape 4 — France Travail (les offres d'emploi)
1. Crée un compte sur https://francetravail.io (espace développeur).
2. **Mes applications → Créer une application**, puis abonne-la à l'API **« Offres d'emploi v2 »**.
3. Copie l'identifiant client → `FRANCE_TRAVAIL_CLIENT_ID` et la clé secrète → `FRANCE_TRAVAIL_CLIENT_SECRET`.

Sans ces clés, le site fonctionne quand même, mais ne propose que tes offres partenaires et les annonces collées.

## Étape 5 — Resend (emails d'alerte, facultatif)
1. Crée un compte sur https://resend.com → **API Keys** → copie-la dans `RESEND_API_KEY`.
2. Pour envoyer à tout le monde, il faut vérifier un nom de domaine dans Resend.
   Sans domaine, Resend n'envoie qu'à ta propre adresse : pratique pour tester.

## Étape 6 — Vercel (mettre le site en ligne)
1. Crée un compte sur https://vercel.com avec ton compte GitHub.
2. **Add New → Project** → choisis le dépôt `match-emploi` → **Import**.
3. Dans **Environment Variables**, ajoute toutes les variables du fichier `.env.example` :
   - `ADMIN_EMAILS` : ton email (et celui de ton responsable entreprises, séparés par une virgule)
   - `NEXT_PUBLIC_SITE_URL` : l'adresse du site (ex. `https://match-emploi.vercel.app`)
   - `CRON_SECRET` : une longue suite de lettres et chiffres au hasard
   - `MATCH_SEUIL` : `75`
4. **Deploy**. Au bout de 2 minutes, ton site est en ligne 🎉
5. Retourne à l'étape 2.4 si tu n'avais pas encore l'adresse du site.

## Étape 7 — Premier test
1. Va sur ton site, crée un compte avec **ton** email (celui mis dans `ADMIN_EMAILS`).
2. Remplis ton profil avec un vrai CV → tu arrives sur « Mes offres », la recherche tourne.
3. Le lien **Admin** apparaît en haut : ajoute une offre partenaire et regarde les correspondances.
4. Envoie le lien `/inscription` à quelques étudiants.

---

## Pour les curieux : comment c'est construit

- **Next.js 16** (site + serveur), **Tailwind** (mise en page)
- **Supabase** : comptes, base PostgreSQL avec règles de sécurité par ligne, stockage privé des CV
- **API Claude** (Anthropic) : lecture des CV en PDF, lecture des annonces, notation des offres
  (`src/lib/ia.ts`) — le nom, l'email et le téléphone ne sont jamais envoyés à l'IA
- **API France Travail** (`src/lib/france-travail.ts`) : recherche par mots-clés, département et type de contrat
- **Logique de correspondance** : `src/lib/matching.ts`

Lancer en local : copier `.env.example` en `.env.local`, le remplir, puis `npm install` et `npm run dev`.
