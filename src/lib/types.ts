export const CONTRATS = [
  { id: "alternance", label: "Alternance" },
  { id: "cdi", label: "CDI" },
  { id: "cdd", label: "CDD" },
  { id: "interim", label: "Intérim" },
  { id: "stage", label: "Stage" },
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
  mots_cles: string;
  consentement: boolean;
  alertes_email: boolean;
  recherche_en_cours: boolean;
  derniere_recherche: string | null;
  latitude?: number | null;
  longitude?: number | null;
  code_commune?: string | null;
  ecole_id?: string | null;
  updated_at: string;
};

export type Offre = {
  id: string;
  source: "partenaire" | "externe" | "france_travail" | "adzuna";
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
};

export const SEUIL = Number(process.env.MATCH_SEUIL ?? 75);

export const sourceLabel = (s: string) =>
  s === "france_travail" ? "France Travail" : s === "adzuna" ? "Adzuna" : s === "externe" ? "Annonce externe" : "Entreprise partenaire";

/** Sources récupérées automatiquement (les autres sont saisies par l'équipe). */
export const SOURCES_AUTO = ["france_travail", "adzuna"];

/** Offres saisies par l'équipe (admin ou école) : jamais montrées aux candidats, l'équipe fait le lien. */
export const estOffreEquipe = (source: string) => !SOURCES_AUTO.includes(source);

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
