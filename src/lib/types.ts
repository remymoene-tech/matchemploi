export const CONTRATS = [
  { id: "alternance", label: "Alternance" },
  { id: "cdi", label: "CDI" },
  { id: "cdd", label: "CDD" },
  { id: "interim", label: "Intérim" },
  { id: "stage", label: "Stage" },
  { id: "job_etudiant", label: "Job étudiant" },
] as const;
export type ContratId = (typeof CONTRATS)[number]["id"];
export const contratLabel = (id: string) =>
  CONTRATS.find((c) => c.id === id)?.label ?? id;

export const AVIS = [
  { id: "nouveau", label: "Nouveau" },
  { id: "interesse", label: "Ça m'intéresse" },
  { id: "postule", label: "J'ai postulé" },
  { id: "pas_interesse", label: "Pas pour moi" },
] as const;

/** Raisons proposées quand un candidat écarte une offre (« Pas pour moi »). */
export const RAISONS_REFUS = [
  "Trop loin",
  "Pas le bon métier",
  "Type de contrat",
  "Salaire",
  "Horaires",
  "Secteur ou entreprise",
  "Niveau demandé trop élevé",
] as const;

export const SUIVIS = [
  { id: "a_traiter", label: "À traiter" },
  { id: "propose_candidat", label: "Proposé au candidat" },
  { id: "propose_entreprise", label: "Proposé à l'entreprise" },
  { id: "entretien", label: "Entretien prévu" },
  { id: "embauche", label: "Embauché" },
  { id: "refus", label: "Pas retenu" },
] as const;

export type Candidat = {
  user_id: string;
  email: string;
  nom: string;
  telephone: string;
  formation: string;
  /** Année d'obtention du diplôme préparé. */
  diplome_annee?: number | null;
  /** prospect | admis | admis_condition | liste_attente (choisi par l'équipe). */
  statut_admission?: string | null;
  /** Motif du refus ou de l'abandon. */
  motif_admission?: string | null;
  /** Année du cursus dans sa formation (1, 2, 3…) et rythme de cette année (initial | alternance). */
  annee_cursus?: number | null;
  rythme_cursus?: string | null;
  poste_vise: string;
  contrats: string[];
  code_postal: string;
  ville: string;
  mobilite_km: number;
  permis: string;
  rythme: string;
  disponibilite: string;
  projet: string;
  cv_chemin: string | null;
  cv_texte: string;
  competences: string[];
  cv_conseils?: CvConseils | null;
  cv_ameliore?: import("@/lib/ia").CvAmeliore | null;
  cv_ameliore_le?: string | null;
  linkedin_url?: string | null;
  linkedin_analyse?: import("@/lib/ia").AnalyseLinkedin | null;
  linkedin_le?: string | null;
  mots_cles: string;
  consentement: boolean;
  alertes_email: boolean;
  recherche_en_cours: boolean;
  derniere_recherche: string | null;
  latitude?: number | null;
  longitude?: number | null;
  code_commune?: string | null;
  ecole_id?: string | null;
  pistes?: Piste[] | null;
  pistes_le?: string | null;
  /** Dernier profil DISC (ajouté au moment de la notation, pas une colonne). */
  disc?: { scores: Record<string, number>; dominante: string; secondaire: string } | null;
  /** Style de management dominant (test), ajouté au moment de la notation. */
  management?: string | null;
  /** « Mes préférences » : questions communes avec la fiche besoin des entreprises. */
  preferences?: import("@/lib/attentes").Preferences | null;
  updated_at: string;
};

export type Offre = {
  id: string;
  source: "partenaire" | "externe" | "france_travail" | "adzuna" | "la_bonne_alternance" | "alumni";
  source_id: string | null;
  entreprise: string;
  intitule: string;
  contrat: string;
  contrat_libelle: string;
  lieu: string;
  departement: string;
  salaire: string;
  description: string;
  lien: string;
  contact_nom: string;
  contact_email: string;
  contact_tel?: string;
  ouverte: boolean;
  publiee_le: string | null;
  updated_at: string;
  latitude?: number | null;
  longitude?: number | null;
  ecole_id?: string | null;
  attentes?: import("@/lib/attentes").Attentes | null;
  /** Date d'expiration (offres de l'équipe) : fermée automatiquement ensuite. */
  expire_le?: string | null;
  /** Fiche de poste structurée (rédigée par MagnusMatch). */
  fiche?: import("@/lib/ia").FichePoste | null;
  redigee_ia?: boolean;
  entreprise_id?: string | null;
};

export type Correspondance = {
  candidat_id: string;
  offre_id: string;
  score: number;
  forts: string[];
  manques: string[];
  resume: string;
  avis_candidat: string;
  suivi: string;
  notifie_le: string | null;
  calcule_le: string;
  preparation_le?: string | null;
  recherche_id?: string | null;
  piste?: string | null;
};

/** Une recherche du candidat (la principale vient de son profil, les autres de la table recherches). */
export type Recherche = {
  id: string; // "principale" pour celle du profil
  poste: string;
  mots_cles: string;
  contrats: string[];
  mobilite_km: number;
  active: boolean;
};

/** Métier voisin que MagnusMatch propose à partir de l'expérience du candidat. */
export type Piste = { metier: string; mots_cles: string; raison: string; ecartee?: boolean };

export const MAX_RECHERCHES = 4; // en plus de la recherche principale

export const SEUIL = Number(process.env.MATCH_SEUIL ?? 75);

/** Couleurs des scores, et note minimale pour qu'une offre soit montrée au candidat. */
export const SCORE_VERT = 70;
export const SCORE_ORANGE = 65; // en dessous : l'offre n'est pas montrée au candidat
export const tonScore = (score: number) => (score >= SCORE_VERT ? "good" : score >= SCORE_ORANGE ? "warn" : "bad");

export const sourceLabel = (s: string) =>
  s === "france_travail" ? "France Travail" : s === "adzuna" ? "Adzuna" : s === "la_bonne_alternance" ? "La bonne alternance" : s === "externe" ? "Annonce externe" : s === "alumni" ? "Annonce d'un alumni" : "Entreprise partenaire";

/** Sources récupérées automatiquement (les autres sont saisies par l'équipe). */
export const SOURCES_AUTO = ["france_travail", "adzuna", "la_bonne_alternance"];

/** Offres saisies par l'équipe (admin ou école) : jamais montrées aux candidats, l'équipe fait le lien. */
export const estOffreEquipe = (source: string) => !SOURCES_AUTO.includes(source);

/** Offres montrées aux étudiants : sources automatiques + annonces d'alumni validées par l'équipe. */
export const estVisibleCandidat = (source: string) => SOURCES_AUTO.includes(source) || source === "alumni";

/** Coordonnées obligatoires pour une offre de l'équipe. Renvoie un message d'erreur ou null. */
export function contactManquant(o: { source: string; contact_nom: string; contact_email: string; contact_tel?: string; lien: string }) {
  const joignable = Boolean(o.contact_email || o.contact_tel);
  if (o.source === "externe" && (joignable || o.lien)) return null; // annonce collée : le lien suffit
  if (!o.contact_nom || !joignable) return "contact";
  return null;
}

/** Département à partir d'un code postal français (approximation suffisante pour la recherche). */
export function departementDepuisCP(cp: string): string {
  const c = cp.replace(/\s/g, "");
  if (!/^\d{5}$/.test(c)) return "";
  if (c.startsWith("97")) return c.slice(0, 3);
  if (c.startsWith("20")) return Number(c) < 20200 ? "2A" : "2B";
  return c.slice(0, 2);
}

export type CvConseils = {
  note: number;
  resume: string;
  points_forts: string[];
  ameliorations: { categorie: string; priorite: "important" | "conseillé"; conseil: string; exemple: string }[];
  mise_en_page?: { avis: string; explication: string };
  description_proposee?: string;
};

/** « BTS NDRC (2027) » : diplôme préparé et son année. */
export const diplomeLabel = (c: { formation?: string | null; diplome_annee?: number | null; annee_cursus?: number | null; rythme_cursus?: string | null }) =>
  [
    c.formation,
    c.annee_cursus ? `· ${c.annee_cursus === 1 ? "1re" : `${c.annee_cursus}e`} année${c.rythme_cursus ? ` (${c.rythme_cursus === "alternance" ? "alternance" : "initial"})` : ""}` : "",
    c.diplome_annee ? `· diplôme ${c.diplome_annee}` : "",
  ].filter(Boolean).join(" ");
